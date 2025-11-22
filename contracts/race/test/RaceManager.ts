import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { parseEther } from "viem";

describe("RaceManager", function () {
  async function deployContractsFixture() {
    const [owner, creator, racer1, racer2, racer3, racer4, racer5, racer6] =
      await hre.viem.getWalletClients();

    // Deploy RatNFT
    const ratNFT = await hre.viem.deployContract("RatNFT", [
      "Rat Racer NFT",
      "RAT",
      "https://api.ratracer.xyz/rats/",
    ]);

    // Deploy RaceToken
    const raceToken = await hre.viem.deployContract("RaceToken", []);

    // Deploy RaceManager
    const raceManager = await hre.viem.deployContract("RaceManager", [
      ratNFT.address,
    ]);

    const publicClient = await hre.viem.getPublicClient();

    // Mint rats to racers
    const racers = [racer1, racer2, racer3, racer4, racer5, racer6];
    for (let i = 0; i < racers.length; i++) {
      await ratNFT.write.mint([racers[i].account.address, `Rat${i + 1}`, i % 6]);
    }

    // Distribute tokens to racers
    const entryFee = parseEther("100");
    for (const racer of racers) {
      await raceToken.write.mint([racer.account.address, entryFee * 10n]);
    }

    return {
      ratNFT,
      raceToken,
      raceManager,
      owner,
      creator,
      racer1,
      racer2,
      racer3,
      racer4,
      racer5,
      racer6,
      racers,
      publicClient,
      entryFee,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct rat NFT address", async function () {
      const { raceManager, ratNFT } = await loadFixture(deployContractsFixture);

      expect(await raceManager.read.ratNFT()).to.equal(
        ratNFT.address.toLowerCase()
      );
    });

    it("Should set correct constants", async function () {
      const { raceManager } = await loadFixture(deployContractsFixture);

      expect(await raceManager.read.MAX_RACERS()).to.equal(6);
      expect(await raceManager.read.CREATOR_FEE_PERCENT()).to.equal(10);
    });
  });

  describe("Race Creation", function () {
    it("Should create a race", async function () {
      const { raceManager, raceToken, creator, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      const race = await raceManager.read.getRace([0n]);
      expect(race[1].toLowerCase()).to.equal(
        creator.account.address.toLowerCase()
      );
      expect(race[2]).to.equal(1);
      expect(race[4]).to.equal(entryFee);
    });

    it("Should fail with invalid track ID", async function () {
      const { raceManager, raceToken, creator, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        raceManager.write.createRace(
          [0, raceToken.address, entryFee],
          { account: creator.account }
        )
      ).to.be.rejected;
    });

    it("Should fail with zero entry fee", async function () {
      const { raceManager, raceToken, creator } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        raceManager.write.createRace(
          [1, raceToken.address, 0n],
          { account: creator.account }
        )
      ).to.be.rejected;
    });
  });

  describe("Race Entry", function () {
    it("Should allow entry with valid rat and payment", async function () {
      const { raceManager, raceToken, creator, racer1, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });

      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(entries.length).to.equal(1);
      expect(entries[0][0].toLowerCase()).to.equal(
        racer1.account.address.toLowerCase()
      );
    });

    it("Should fail if racer doesn't own the rat", async function () {
      const { raceManager, raceToken, creator, racer1, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });

      // Try to enter with rat token ID 1 (owned by racer2)
      await expect(
        raceManager.write.enterRace([0n, 1n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });

    it("Should fail if already entered", async function () {
      const { raceManager, raceToken, creator, racer1, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee * 2n], {
        account: racer1.account,
      });

      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      await expect(
        raceManager.write.enterRace([0n, 0n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });

    it("Should update race status to Full when 6 racers enter", async function () {
      const { raceManager, raceToken, creator, racers, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      const race = await raceManager.read.getRace([0n]);
      expect(race[5]).to.equal(1); // Status.Full
    });
  });

  describe("Starting Race", function () {
    it("Should allow participant to start full race", async function () {
      const { raceManager, raceToken, creator, racers, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      await raceManager.write.startRace([0n], {
        account: racers[0].account,
      });

      const race = await raceManager.read.getRace([0n]);
      expect(race[5]).to.equal(2); // Status.Started
    });

    it("Should fail if non-participant tries to start", async function () {
      const { raceManager, raceToken, creator, racers, owner, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      await expect(
        raceManager.write.startRace([0n], {
          account: owner.account,
        })
      ).to.be.rejected;
    });

    it("Should fail if race is not full", async function () {
      const { raceManager, raceToken, creator, racer1, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });
      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      await expect(
        raceManager.write.startRace([0n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });
  });

  describe("Finishing Race", function () {
    it("Should finish race and distribute prizes correctly", async function () {
      const { raceManager, raceToken, creator, racers, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      // Enter all racers
      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      // Start race
      await raceManager.write.startRace([0n], {
        account: racers[0].account,
      });

      // Record initial balances
      const creatorInitialBalance = await raceToken.read.balanceOf([
        creator.account.address,
      ]);

      // Finish race with results
      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder]);

      // Check creator fee (10% of 600 = 60)
      const creatorFinalBalance = await raceToken.read.balanceOf([
        creator.account.address,
      ]);
      const creatorEarnings = creatorFinalBalance - creatorInitialBalance;
      expect(creatorEarnings).to.equal(entryFee * 6n * 10n / 100n);

      // Check race status
      const race = await raceManager.read.getRace([0n]);
      expect(race[5]).to.equal(3); // Status.Finished
    });

    it("Should fail if race not started", async function () {
      const { raceManager, raceToken, creator, racers, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await expect(
        raceManager.write.finishRace([0n, winningOrder])
      ).to.be.rejected;
    });
  });

  describe("View Functions", function () {
    it("Should return correct race count", async function () {
      const { raceManager, raceToken, creator, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      const count = await raceManager.read.getRaceCount();
      expect(count).to.equal(2n);
    });

    it("Should check if racer has entered", async function () {
      const { raceManager, raceToken, creator, racer1, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });
      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      const hasEntered = await raceManager.read.hasRacerEntered([
        0n,
        racer1.account.address,
      ]);
      expect(hasEntered).to.be.true;
    });
  });
});

