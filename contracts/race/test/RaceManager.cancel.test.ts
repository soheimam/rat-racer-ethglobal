import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { parseEther, getAddress } from "viem";

describe("RaceManager - Cancel & Oracle Tests", function () {
  async function deployContractsFixture() {
    const [owner, oracle, creator, racer1, racer2, racer3, racer4, racer5, racer6, attacker] =
      await hre.viem.getWalletClients();

    const ratNFT = await hre.viem.deployContract("RatNFT", [
      "Rat Racer NFT",
      "RAT",
      "https://api.ratracer.xyz/rats/",
    ]);

    const raceToken = await hre.viem.deployContract("RaceToken", []);

    const raceManager = await hre.viem.deployContract("RaceManager", [
      ratNFT.address,
    ]);

    // Set oracle
    await raceManager.write.setOracle([oracle.account.address], {
      account: owner.account,
    });

    const publicClient = await hre.viem.getPublicClient();

    const racers = [racer1, racer2, racer3, racer4, racer5, racer6];
    for (let i = 0; i < racers.length; i++) {
      await ratNFT.write.mint([racers[i].account.address, `Rat${i + 1}`, i % 6]);
    }

    const entryFee = parseEther("100");
    for (const racer of racers) {
      await raceToken.write.mint([racer.account.address, entryFee * 10n]);
      await raceToken.write.approve([raceManager.address, entryFee * 100n], {
        account: racer.account,
      });
    }

    await raceToken.write.mint([attacker.account.address, entryFee * 10n]);
    await ratNFT.write.mint([attacker.account.address, "AttackerRat", 0]);
    await raceToken.write.approve([raceManager.address, entryFee * 100n], {
      account: attacker.account,
    });

    return {
      ratNFT,
      raceToken,
      raceManager,
      owner,
      oracle,
      creator,
      racer1,
      racer2,
      racer3,
      racer4,
      racer5,
      racer6,
      attacker,
      racers,
      publicClient,
      entryFee,
    };
  }

  describe("Oracle Management", function () {
    it("Should set oracle on deployment", async function () {
      const { raceManager, oracle } = await loadFixture(deployContractsFixture);
      expect(await raceManager.read.oracle()).to.equal(
        getAddress(oracle.account.address)
      );
    });

    it("Should allow owner to update oracle", async function () {
      const { raceManager, owner, creator } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.setOracle([creator.account.address], {
        account: owner.account,
      });

      expect(await raceManager.read.oracle()).to.equal(
        getAddress(creator.account.address)
      );
    });

    it("Should emit OracleUpdated event", async function () {
      const { raceManager, owner, oracle, creator, publicClient } =
        await loadFixture(deployContractsFixture);

      const hash = await raceManager.write.setOracle([creator.account.address], {
        account: owner.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await raceManager.getEvents.OracleUpdated();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.oldOracle).to.equal(
        getAddress(oracle.account.address)
      );
      expect(events[0].args.newOracle).to.equal(
        getAddress(creator.account.address)
      );
    });

    it("Should revert when non-owner tries to set oracle", async function () {
      const { raceManager, attacker, creator } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        raceManager.write.setOracle([creator.account.address], {
          account: attacker.account,
        })
      ).to.be.rejected;
    });

    it("Should revert when setting zero address as oracle", async function () {
      const { raceManager, owner } = await loadFixture(deployContractsFixture);

      await expect(
        raceManager.write.setOracle(
          ["0x0000000000000000000000000000000000000000"],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Invalid oracle address");
    });
  });

  describe("Race Cancellation", function () {
    it("Should allow creator to cancel Active race", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.cancelRace([0n], { account: creator.account });

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(4); // Cancelled
    });

    it("Should allow creator to cancel Full race", async function () {
      const { raceManager, creator, racers, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      // Fill the race
      for (let i = 0; i < 6; i++) {
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      const raceBefore = await raceManager.read.getRace([0n]);
      expect(raceBefore.status).to.equal(1); // Full

      await raceManager.write.cancelRace([0n], { account: creator.account });

      const raceAfter = await raceManager.read.getRace([0n]);
      expect(raceAfter.status).to.equal(4); // Cancelled
    });

    it("Should refund all entrants when cancelled", async function () {
      const { raceManager, creator, racer1, racer2, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      const racer1BalanceBefore = await raceToken.read.balanceOf([
        racer1.account.address,
      ]);
      const racer2BalanceBefore = await raceToken.read.balanceOf([
        racer2.account.address,
      ]);

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });
      await raceManager.write.enterRace([0n, 1n], { account: racer2.account });

      await raceManager.write.cancelRace([0n], { account: creator.account });

      const racer1BalanceAfter = await raceToken.read.balanceOf([
        racer1.account.address,
      ]);
      const racer2BalanceAfter = await raceToken.read.balanceOf([
        racer2.account.address,
      ]);

      // Should get full refund
      expect(racer1BalanceAfter).to.equal(racer1BalanceBefore);
      expect(racer2BalanceAfter).to.equal(racer2BalanceBefore);
    });

    it("Should reset prize pool to zero", async function () {
      const { raceManager, creator, racer1, racer2, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });
      await raceManager.write.enterRace([0n, 1n], { account: racer2.account });

      const raceBefore = await raceManager.read.getRace([0n]);
      expect(raceBefore.prizePool).to.equal(entryFee * 2n);

      await raceManager.write.cancelRace([0n], { account: creator.account });

      const raceAfter = await raceManager.read.getRace([0n]);
      expect(raceAfter.prizePool).to.equal(0n);
    });

    it("Should release rats from race", async function () {
      const { raceManager, creator, racer1, racer2, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });
      await raceManager.write.enterRace([0n, 1n], { account: racer2.account });

      expect(await raceManager.read.isRatRacing([0n])).to.be.true;
      expect(await raceManager.read.isRatRacing([1n])).to.be.true;

      await raceManager.write.cancelRace([0n], { account: creator.account });

      // Rats should be released
      expect(await raceManager.read.isRatRacing([0n])).to.be.false;
      expect(await raceManager.read.isRatRacing([1n])).to.be.false;

      // Should be able to enter new race
      await raceManager.write.createRace([2, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([1n, 0n], { account: racer1.account });
      expect(await raceManager.read.isRatRacing([0n])).to.be.true;
    });

    it("Should reset hasEntered mapping", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      expect(
        await raceManager.read.hasRacerEntered([0n, racer1.account.address])
      ).to.be.true;

      await raceManager.write.cancelRace([0n], { account: creator.account });

      expect(
        await raceManager.read.hasRacerEntered([0n, racer1.account.address])
      ).to.be.false;
    });

    it("Should emit RaceCancelled event", async function () {
      const { raceManager, creator, raceToken, entryFee, publicClient } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      const hash = await raceManager.write.cancelRace([0n], {
        account: creator.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await raceManager.getEvents.RaceCancelled();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.raceId).to.equal(0n);
      expect(events[0].args.cancelledBy).to.equal(
        getAddress(creator.account.address)
      );
    });

    it("Should revert when non-creator tries to cancel", async function () {
      const { raceManager, creator, attacker, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await expect(
        raceManager.write.cancelRace([0n], { account: attacker.account })
      ).to.be.rejectedWith("Only creator can cancel");
    });

    it("Should revert when cancelling non-existent race", async function () {
      const { raceManager, creator } = await loadFixture(deployContractsFixture);

      await expect(
        raceManager.write.cancelRace([999n], { account: creator.account })
      ).to.be.rejectedWith("Race does not exist");
    });

    it("Should revert when cancelling Started race", async function () {
      const { raceManager, creator, racers, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      for (let i = 0; i < 6; i++) {
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      await raceManager.write.startRace([0n], { account: racers[0].account });

      await expect(
        raceManager.write.cancelRace([0n], { account: creator.account })
      ).to.be.rejectedWith("Race cannot be cancelled");
    });

    it("Should revert when cancelling Finished race", async function () {
      const { raceManager, creator, racers, oracle, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      for (let i = 0; i < 6; i++) {
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      await raceManager.write.startRace([0n], { account: racers[0].account });

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: oracle.account,
      });

      await expect(
        raceManager.write.cancelRace([0n], { account: creator.account })
      ).to.be.rejectedWith("Race cannot be cancelled");
    });

    it("Should revert when cancelling already Cancelled race", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.cancelRace([0n], { account: creator.account });

      await expect(
        raceManager.write.cancelRace([0n], { account: creator.account })
      ).to.be.rejectedWith("Race cannot be cancelled");
    });
  });

  describe("Oracle-Only finishRace", function () {
    async function startedRaceFixture() {
      const fixture = await deployContractsFixture();
      const { raceManager, creator, racers, raceToken, entryFee } = fixture;

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      for (let i = 0; i < 6; i++) {
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      await raceManager.write.startRace([0n], { account: racers[0].account });

      return fixture;
    }

    it("Should allow oracle to finish race", async function () {
      const { raceManager, oracle } = await loadFixture(startedRaceFixture);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: oracle.account,
      });

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(3); // Finished
    });

    it("Should revert when non-oracle tries to finish", async function () {
      const { raceManager, attacker } = await loadFixture(startedRaceFixture);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await expect(
        raceManager.write.finishRace([0n, winningOrder], {
          account: attacker.account,
        })
      ).to.be.rejectedWith("Only oracle can finish races");
    });

    it("Should revert when participant tries to finish", async function () {
      const { raceManager, racer1 } = await loadFixture(startedRaceFixture);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await expect(
        raceManager.write.finishRace([0n, winningOrder], {
          account: racer1.account,
        })
      ).to.be.rejectedWith("Only oracle can finish races");
    });

    it("Should revert when creator tries to finish", async function () {
      const { raceManager, creator } = await loadFixture(startedRaceFixture);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await expect(
        raceManager.write.finishRace([0n, winningOrder], {
          account: creator.account,
        })
      ).to.be.rejectedWith("Only oracle can finish races");
    });

    it("Should release rats after race finishes", async function () {
      const { raceManager, oracle } = await loadFixture(startedRaceFixture);

      // Rats should be locked in race
      expect(await raceManager.read.isRatRacing([0n])).to.be.true;
      expect(await raceManager.read.isRatRacing([1n])).to.be.true;

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: oracle.account,
      });

      // Rats should be released
      expect(await raceManager.read.isRatRacing([0n])).to.be.false;
      expect(await raceManager.read.isRatRacing([1n])).to.be.false;
    });
  });

  describe("Global Rat Locking", function () {
    it("Should prevent rat from entering multiple active races", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });
      await raceManager.write.createRace([2, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      await expect(
        raceManager.write.enterRace([1n, 0n], { account: racer1.account })
      ).to.be.rejectedWith("Rat already in active race");
    });

    it("Should track if rat is racing", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      expect(await raceManager.read.isRatRacing([0n])).to.be.false;

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      expect(await raceManager.read.isRatRacing([0n])).to.be.true;
    });

    it("Should allow rat to enter new race after previous finishes", async function () {
      const { raceManager, creator, racers, oracle, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      // First race
      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      for (let i = 0; i < 6; i++) {
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      await raceManager.write.startRace([0n], { account: racers[0].account });

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: oracle.account,
      });

      // Rat should be released
      expect(await raceManager.read.isRatRacing([0n])).to.be.false;

      // Second race with same rat
      await raceManager.write.createRace([2, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([1n, 0n], { account: racer1.account });

      expect(await raceManager.read.isRatRacing([0n])).to.be.true;
    });

    it("Should allow rat to enter new race after cancellation", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      expect(await raceManager.read.isRatRacing([0n])).to.be.true;

      await raceManager.write.cancelRace([0n], { account: creator.account });

      expect(await raceManager.read.isRatRacing([0n])).to.be.false;

      // Should be able to enter new race
      await raceManager.write.createRace([2, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([1n, 0n], { account: racer1.account });

      expect(await raceManager.read.isRatRacing([0n])).to.be.true;
    });
  });
});

