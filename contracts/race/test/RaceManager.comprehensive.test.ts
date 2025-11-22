import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { parseEther, getAddress, Address } from "viem";

describe("RaceManager - Comprehensive Tests", function () {
  async function deployContractsFixture() {
    const [owner, creator, racer1, racer2, racer3, racer4, racer5, racer6, attacker] =
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

    // Give attacker tokens and rats too
    await raceToken.write.mint([attacker.account.address, entryFee * 10n]);
    await ratNFT.write.mint([attacker.account.address, "AttackerRat", 0]);

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
      attacker,
      racers,
      publicClient,
      entryFee,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct rat NFT address", async function () {
      const { raceManager, ratNFT } = await loadFixture(deployContractsFixture);
      expect(await raceManager.read.ratNFT()).to.equal(getAddress(ratNFT.address));
    });

    it("Should set correct constants", async function () {
      const { raceManager } = await loadFixture(deployContractsFixture);
      expect(await raceManager.read.MAX_RACERS()).to.equal(6);
      expect(await raceManager.read.CREATOR_FEE_PERCENT()).to.equal(10n);
      expect(await raceManager.read.PERCENT_DENOMINATOR()).to.equal(100n);
    });

    it("Should start with zero races", async function () {
      const { raceManager } = await loadFixture(deployContractsFixture);
      expect(await raceManager.read.getRaceCount()).to.equal(0n);
    });

    it("Should revert deployment with zero address for ratNFT", async function () {
      await expect(
        hre.viem.deployContract("RaceManager", [
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.be.rejectedWith("Invalid rat NFT address");
    });
  });

  describe("Race Creation", function () {
    it("Should create a race with valid parameters", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      expect(await raceManager.read.getRaceCount()).to.equal(1n);
    });

    it("Should emit RaceCreated event", async function () {
      const { raceManager, creator, raceToken, entryFee, publicClient } =
        await loadFixture(deployContractsFixture);

      const hash = await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: creator.account }
      );

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await raceManager.getEvents.RaceCreated();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.raceId).to.equal(0n);
      expect(events[0].args.creator).to.equal(getAddress(creator.account.address));
      expect(events[0].args.trackId).to.equal(1);
      expect(events[0].args.entryToken).to.equal(getAddress(raceToken.address));
      expect(events[0].args.entryFee).to.equal(entryFee);
    });

    it("Should revert with invalid track ID (0)", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        raceManager.write.createRace([0, raceToken.address, entryFee], {
          account: creator.account,
        })
      ).to.be.rejectedWith("Invalid track ID");
    });

    it("Should revert with zero address for entry token", async function () {
      const { raceManager, creator, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        raceManager.write.createRace(
          [1, "0x0000000000000000000000000000000000000000", entryFee],
          { account: creator.account }
        )
      ).to.be.rejectedWith("Invalid token address");
    });

    it("Should revert with zero entry fee", async function () {
      const { raceManager, creator, raceToken } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        raceManager.write.createRace([1, raceToken.address, 0n], {
          account: creator.account,
        })
      ).to.be.rejectedWith("Entry fee must be > 0");
    });

    it("Should create multiple races with incremental IDs", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });
      await raceManager.write.createRace([2, raceToken.address, entryFee], {
        account: creator.account,
      });
      await raceManager.write.createRace([3, raceToken.address, entryFee], {
        account: creator.account,
      });

      expect(await raceManager.read.getRaceCount()).to.equal(3n);

      const race0 = await raceManager.read.getRace([0n]);
      const race1 = await raceManager.read.getRace([1n]);
      const race2 = await raceManager.read.getRace([2n]);

      expect(race0.trackId).to.equal(1);
      expect(race1.trackId).to.equal(2);
      expect(race2.trackId).to.equal(3);
    });

    it("Should store correct race details", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([5, raceToken.address, entryFee], {
        account: creator.account,
      });

      const race = await raceManager.read.getRace([0n]);

      expect(race.raceId).to.equal(0n);
      expect(race.creator).to.equal(getAddress(creator.account.address));
      expect(race.trackId).to.equal(5);
      expect(race.entryToken).to.equal(getAddress(raceToken.address));
      expect(race.entryFee).to.equal(entryFee);
      expect(race.status).to.equal(0); // Active
      expect(race.prizePool).to.equal(0n);
      expect(race.createdAt).to.be.greaterThan(0n);
      expect(race.startedAt).to.equal(0n);
      expect(race.finishedAt).to.equal(0n);
    });
  });

  describe("Race Entry", function () {
    it("Should allow racer to enter with valid rat and tokens", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(entries).to.have.lengthOf(1);
      expect(entries[0].racer).to.equal(getAddress(racer1.account.address));
      expect(entries[0].ratTokenId).to.equal(0n);
    });

    it("Should emit RacerEntered event", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee, publicClient } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      const hash = await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await raceManager.getEvents.RacerEntered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.raceId).to.equal(0n);
      expect(events[0].args.racer).to.equal(getAddress(racer1.account.address));
      expect(events[0].args.ratTokenId).to.equal(0n);
    });

    it("Should update prize pool correctly", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      const race = await raceManager.read.getRace([0n]);
      expect(race.prizePool).to.equal(entryFee);
    });

    it("Should mark racer as entered", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      expect(
        await raceManager.read.hasRacerEntered([0n, racer1.account.address])
      ).to.be.true;
    });

    it("Should change race status to Full when 6th racer enters", async function () {
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

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(1); // Full
    });

    it("Should revert when entering non-existent race", async function () {
      const { raceManager, racer1 } = await loadFixture(deployContractsFixture);

      await expect(
        raceManager.write.enterRace([999n, 0n], { account: racer1.account })
      ).to.be.rejectedWith("Race does not exist");
    });

    it("Should revert when race is not Active", async function () {
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

      // Try to enter when Full
      await ratNFT.write.mint([racer1.account.address, "LateRat", 0]);
      await expect(
        raceManager.write.enterRace([0n, 6n], { account: racer1.account })
      ).to.be.rejectedWith("Race not accepting entries");
    });

    it("Should revert when race is full (6 racers)", async function () {
      const { raceManager, creator, racers, racer1, ratNFT, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      for (let i = 0; i < 6; i++) {
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      // Mint a new rat for racer1 and try to enter
      await ratNFT.write.mint([racer1.account.address, "ExtraRat", 0]);
      await expect(
        raceManager.write.enterRace([0n, 6n], { account: racer1.account })
      ).to.be.rejectedWith("Race is full");
    });

    it("Should revert when user already entered the race", async function () {
      const { raceManager, creator, racer1, ratNFT, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      // Mint another rat and try to enter again
      await ratNFT.write.mint([racer1.account.address, "SecondRat", 1]);
      await expect(
        raceManager.write.enterRace([0n, 6n], { account: racer1.account })
      ).to.be.rejectedWith("Already entered this race");
    });

    it("Should revert when rat already in the race", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      await expect(
        raceManager.write.enterRace([0n, 0n], { account: racer1.account })
      ).to.be.rejectedWith("Already entered this race");
    });

    it("Should revert when user doesn't own the rat", async function () {
      const { raceManager, creator, racer1, racer2, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      // racer1 tries to use racer2's rat
      await expect(
        raceManager.write.enterRace([0n, 1n], { account: racer1.account })
      ).to.be.rejectedWith("Must own the rat NFT");
    });

    it("Should revert when insufficient token approval", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      // Remove approval
      await raceToken.write.approve([raceManager.address, 0n], {
        account: racer1.account,
      });

      await expect(
        raceManager.write.enterRace([0n, 0n], { account: racer1.account })
      ).to.be.rejected;
    });

    it("Should revert when insufficient token balance", async function () {
      const { raceManager, creator, racer1, raceToken, ratNFT, entryFee } =
        await loadFixture(deployContractsFixture);

      // Create expensive race
      const expensiveEntry = parseEther("10000");
      await raceManager.write.createRace([1, raceToken.address, expensiveEntry], {
        account: creator.account,
      });

      await raceToken.write.approve([raceManager.address, expensiveEntry], {
        account: racer1.account,
      });

      await expect(
        raceManager.write.enterRace([0n, 0n], { account: racer1.account })
      ).to.be.rejected;
    });
  });

  describe("Race Start", function () {
    async function fillRaceFixture() {
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

      return fixture;
    }

    it("Should allow participant to start full race", async function () {
      const { raceManager, racer1 } = await loadFixture(fillRaceFixture);

      await raceManager.write.startRace([0n], { account: racer1.account });

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(2); // Started
      expect(race.startedAt).to.be.greaterThan(0n);
    });

    it("Should emit RaceStarted event", async function () {
      const { raceManager, racer1, publicClient } = await loadFixture(
        fillRaceFixture
      );

      const hash = await raceManager.write.startRace([0n], {
        account: racer1.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await raceManager.getEvents.RaceStarted();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.raceId).to.equal(0n);
      expect(events[0].args.startedBy).to.equal(
        getAddress(racer1.account.address)
      );
    });

    it("Should revert when race not full", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      await expect(
        raceManager.write.startRace([0n], { account: racer1.account })
      ).to.be.rejectedWith("Race not ready to start");
    });

    it("Should revert when non-participant tries to start", async function () {
      const { raceManager, attacker } = await loadFixture(fillRaceFixture);

      await expect(
        raceManager.write.startRace([0n], { account: attacker.account })
      ).to.be.rejectedWith("Must be a participant");
    });

    it("Should revert when trying to start already started race", async function () {
      const { raceManager, racer1, racer2 } = await loadFixture(fillRaceFixture);

      await raceManager.write.startRace([0n], { account: racer1.account });

      await expect(
        raceManager.write.startRace([0n], { account: racer2.account })
      ).to.be.rejectedWith("Race not ready to start");
    });
  });

  describe("Race Finish & Prize Distribution", function () {
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

    it("Should finish race with valid winners", async function () {
      const { raceManager, attacker } = await loadFixture(startedRaceFixture);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      
      // CRITICAL: Anyone can finish the race! This is a security issue
      await raceManager.write.finishRace([0n, winningOrder], {
        account: attacker.account,
      });

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(3); // Finished
      expect(race.finishedAt).to.be.greaterThan(0n);
    });

    it("Should emit RaceFinished event with correct winners and prizes", async function () {
      const { raceManager, racer1, publicClient } = await loadFixture(
        startedRaceFixture
      );

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      const hash = await raceManager.write.finishRace([0n, winningOrder], {
        account: racer1.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await raceManager.getEvents.RaceFinished();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.raceId).to.equal(0n);
      expect(events[0].args.winningRatTokenIds).to.deep.equal(winningOrder);
    });

    it("Should distribute prizes correctly (50%, 30%, 20%)", async function () {
      const { raceManager, creator, racers, raceToken, entryFee } =
        await loadFixture(startedRaceFixture);

      const totalPool = entryFee * 6n;
      const creatorFee = (totalPool * 10n) / 100n;
      const remainingPool = totalPool - creatorFee;

      const expectedPrizes = [
        (remainingPool * 50n) / 100n, // 1st: 50%
        (remainingPool * 30n) / 100n, // 2nd: 30%
        (remainingPool * 20n) / 100n, // 3rd: 20%
      ];

      const balancesBefore = await Promise.all(
        racers.slice(0, 3).map((r) => raceToken.read.balanceOf([r.account.address]))
      );
      const creatorBalanceBefore = await raceToken.read.balanceOf([
        creator.account.address,
      ]);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: racers[0].account,
      });

      const balancesAfter = await Promise.all(
        racers.slice(0, 3).map((r) => raceToken.read.balanceOf([r.account.address]))
      );
      const creatorBalanceAfter = await raceToken.read.balanceOf([
        creator.account.address,
      ]);

      // Check creator fee
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(creatorFee);

      // Check winner prizes
      for (let i = 0; i < 3; i++) {
        expect(balancesAfter[i] - balancesBefore[i]).to.equal(expectedPrizes[i]);
      }
    });

    it("Should give 0 prize to 4th, 5th, 6th place", async function () {
      const { raceManager, racers, raceToken } = await loadFixture(
        startedRaceFixture
      );

      const balancesBefore = await Promise.all(
        racers.slice(3, 6).map((r) => raceToken.read.balanceOf([r.account.address]))
      );

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: racers[0].account,
      });

      const balancesAfter = await Promise.all(
        racers.slice(3, 6).map((r) => raceToken.read.balanceOf([r.account.address]))
      );

      for (let i = 0; i < 3; i++) {
        expect(balancesAfter[i]).to.equal(balancesBefore[i]);
      }
    });

    it("Should update race entries with positions", async function () {
      const { raceManager, racers } = await loadFixture(startedRaceFixture);

      const winningOrder = [2n, 0n, 1n, 5n, 4n, 3n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: racers[0].account,
      });

      const entries = await raceManager.read.getRaceEntries([0n]);
      
      // Find position of rat 2 (should be 1st)
      const rat2Entry = entries.find((e) => e.ratTokenId === 2n);
      expect(rat2Entry?.position).to.equal(1);

      // Find position of rat 0 (should be 2nd)
      const rat0Entry = entries.find((e) => e.ratTokenId === 0n);
      expect(rat0Entry?.position).to.equal(2);
    });

    it("Should revert when race not started", async function () {
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

      // Don't start the race
      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await expect(
        raceManager.write.finishRace([0n, winningOrder], {
          account: racers[0].account,
        })
      ).to.be.rejectedWith("Race not started");
    });

    it("Should revert when wrong number of positions provided", async function () {
      const { raceManager, racers } = await loadFixture(startedRaceFixture);

      const incompleteOrder = [0n, 1n, 2n]; // Only 3 positions
      await expect(
        raceManager.write.finishRace([0n, incompleteOrder], {
          account: racers[0].account,
        })
      ).to.be.rejectedWith("Must provide all positions");
    });

    it("Should revert when invalid rat token ID in results", async function () {
      const { raceManager, racers } = await loadFixture(startedRaceFixture);

      const invalidOrder = [0n, 1n, 2n, 3n, 4n, 999n]; // 999 not in race
      await expect(
        raceManager.write.finishRace([0n, invalidOrder], {
          account: racers[0].account,
        })
      ).to.be.rejectedWith("Invalid rat token ID");
    });

    it("Should revert when duplicate positions", async function () {
      const { raceManager, racers } = await loadFixture(startedRaceFixture);

      const duplicateOrder = [0n, 1n, 1n, 3n, 4n, 5n]; // Duplicate 1
      await expect(
        raceManager.write.finishRace([0n, duplicateOrder], {
          account: racers[0].account,
        })
      ).to.be.rejectedWith("Position already set");
    });

    it("Should revert when trying to finish already finished race", async function () {
      const { raceManager, racers } = await loadFixture(startedRaceFixture);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder], {
        account: racers[0].account,
      });

      await expect(
        raceManager.write.finishRace([0n, winningOrder], {
          account: racers[0].account,
        })
      ).to.be.rejectedWith("Race not started");
    });
  });

  describe("View Functions", function () {
    it("Should return correct race details", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([3, raceToken.address, entryFee], {
        account: creator.account,
      });

      const race = await raceManager.read.getRace([0n]);
      expect(race.raceId).to.equal(0n);
      expect(race.creator).to.equal(getAddress(creator.account.address));
      expect(race.trackId).to.equal(3);
    });

    it("Should return empty entries for new race", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(entries).to.have.lengthOf(0);
    });

    it("Should return all entries after race fills", async function () {
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

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(entries).to.have.lengthOf(6);
    });

    it("Should return false for non-entered racer", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      expect(
        await raceManager.read.hasRacerEntered([0n, racer1.account.address])
      ).to.be.false;
    });

    it("Should return true for entered racer", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      expect(
        await raceManager.read.hasRacerEntered([0n, racer1.account.address])
      ).to.be.true;
    });
  });

  describe("Critical Security & Game Loop Issues", function () {
    it("CRITICAL: Anyone can call finishRace() - NO ACCESS CONTROL", async function () {
      const { raceManager, attacker, racers } = await loadFixture(
        startedRaceFixture
      );

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];

      // Attacker (not oracle, not participant requirements) can finish race
      await raceManager.write.finishRace([0n, winningOrder], {
        account: attacker.account,
      });

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(3); // Race finished by attacker!
    });

    it("CRITICAL: No race cancellation - funds locked if race doesn't fill", async function () {
      const { raceManager, creator, racer1, racer2, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      const balanceBefore = await raceToken.read.balanceOf([
        racer1.account.address,
      ]);

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });
      await raceManager.write.enterRace([0n, 1n], { account: racer2.account });

      const balanceAfter = await raceToken.read.balanceOf([
        racer1.account.address,
      ]);

      // Tokens are gone from user
      expect(balanceBefore - balanceAfter).to.equal(entryFee);

      // Race stuck at 2/6 - NO WAY TO GET REFUND
      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(0); // Still Active
      expect(race.prizePool).to.equal(entryFee * 2n); // Funds locked
    });

    it("CRITICAL: Rat can enter multiple active races - no global locking", async function () {
      const { raceManager, creator, racer1, raceToken, entryFee } =
        await loadFixture(deployContractsFixture);

      // Create two races
      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });
      await raceManager.write.createRace([2, raceToken.address, entryFee], {
        account: creator.account,
      });

      // Enter same rat in both races - THIS SHOULD FAIL but doesn't
      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });
      await raceManager.write.enterRace([1n, 0n], { account: racer1.account });

      // Rat 0 is now in 2 races at once!
      expect(await raceManager.read.ratInRace([0n, 0n])).to.be.true;
      expect(await raceManager.read.ratInRace([1n, 0n])).to.be.true;
    });

    it("ISSUE: No maximum race limit - could create infinite races", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      // Create 100 races - no limit
      for (let i = 0; i < 100; i++) {
        await raceManager.write.createRace([1, raceToken.address, entryFee], {
          account: creator.account,
        });
      }

      expect(await raceManager.read.getRaceCount()).to.equal(100n);
    });

    it("ISSUE: No time limit on race completion", async function () {
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

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(2); // Started

      // Race can stay in "Started" state forever
      // No timeout mechanism
    });

    it("ISSUE: Creator can't cancel their own unfilled race", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([1, raceToken.address, entryFee], {
        account: creator.account,
      });

      // No cancelRace function exists
      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(0); // Still Active, can't cancel
    });

    it("ISSUE: No reentrancy protection on critical state changes", async function () {
      // ReentrancyGuard is on enterRace but finishRace does external calls
      // during _distributePrizes without nonReentrant modifier
      const { raceManager, racers } = await loadFixture(startedRaceFixture);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      
      // finishRace makes external token transfers
      // Could be vulnerable if token is malicious
      await raceManager.write.finishRace([0n, winningOrder], {
        account: racers[0].account,
      });

      const race = await raceManager.read.getRace([0n]);
      expect(race.status).to.equal(3);
    });
  });

  describe("Edge Cases & Stress Tests", function () {
    it("Should handle minimum entry fee (1 wei)", async function () {
      const { raceManager, creator, racer1, raceToken } = await loadFixture(
        deployContractsFixture
      );

      await raceManager.write.createRace([1, raceToken.address, 1n], {
        account: creator.account,
      });

      await raceToken.write.approve([raceManager.address, 1n], {
        account: racer1.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      const race = await raceManager.read.getRace([0n]);
      expect(race.prizePool).to.equal(1n);
    });

    it("Should handle very large entry fees", async function () {
      const { raceManager, creator, racer1, raceToken } = await loadFixture(
        deployContractsFixture
      );

      const largeEntry = parseEther("1000000");
      await raceManager.write.createRace([1, raceToken.address, largeEntry], {
        account: creator.account,
      });

      await raceToken.write.mint([racer1.account.address, largeEntry * 2n]);
      await raceToken.write.approve([raceManager.address, largeEntry], {
        account: racer1.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      const race = await raceManager.read.getRace([0n]);
      expect(race.prizePool).to.equal(largeEntry);
    });

    it("Should handle multiple simultaneous races", async function () {
      const { raceManager, creator, raceToken, entryFee } = await loadFixture(
        deployContractsFixture
      );

      // Create 10 races
      for (let i = 0; i < 10; i++) {
        await raceManager.write.createRace([i + 1, raceToken.address, entryFee], {
          account: creator.account,
        });
      }

      expect(await raceManager.read.getRaceCount()).to.equal(10n);

      // All races should be independent
      for (let i = 0; i < 10; i++) {
        const race = await raceManager.read.getRace([BigInt(i)]);
        expect(race.trackId).to.equal(i + 1);
      }
    });

    it("Should handle race with different ERC20 tokens", async function () {
      const { raceManager, creator, racer1, entryFee } = await loadFixture(
        deployContractsFixture
      );

      // Deploy second token
      const token2 = await hre.viem.deployContract("RaceToken", []);
      await token2.write.mint([racer1.account.address, entryFee * 10n]);

      await raceManager.write.createRace([1, token2.address, entryFee], {
        account: creator.account,
      });

      await token2.write.approve([raceManager.address, entryFee * 10n], {
        account: racer1.account,
      });

      await raceManager.write.enterRace([0n, 0n], { account: racer1.account });

      const race = await raceManager.read.getRace([0n]);
      expect(race.entryToken).to.equal(getAddress(token2.address));
    });
  });
});

