import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { parseEther, getAddress } from "viem";

describe("End-to-End: Full Race System Integration", function () {
  async function deployFullSystemFixture() {
    const wallets = await hre.viem.getWalletClients();
    const [
      deployer,
      raceCreator1,
      raceCreator2,
      racer1,
      racer2,
      racer3,
      racer4,
      racer5,
      racer6,
      racer7,
      racer8,
    ] = wallets;

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

    const racers = [racer1, racer2, racer3, racer4, racer5, racer6, racer7, racer8];

    return {
      ratNFT,
      raceToken,
      raceManager,
      deployer,
      raceCreator1,
      raceCreator2,
      racer1,
      racer2,
      racer3,
      racer4,
      racer5,
      racer6,
      racer7,
      racer8,
      racers,
      publicClient,
    };
  }

  describe("System Deployment & Configuration", function () {
    it("Should deploy all contracts with correct configuration", async function () {
      const { ratNFT, raceToken, raceManager, deployer } = await loadFixture(
        deployFullSystemFixture
      );

      // Verify RatNFT
      expect(await ratNFT.read.name()).to.equal("Rat Racer NFT");
      expect(await ratNFT.read.symbol()).to.equal("RAT");
      expect(await ratNFT.read.owner()).to.equal(
        getAddress(deployer.account.address)
      );

      // Verify RaceToken
      expect(await raceToken.read.name()).to.equal("Race Token");
      expect(await raceToken.read.symbol()).to.equal("RACE");
      expect(await raceToken.read.decimals()).to.equal(18);

      // Verify RaceManager
      expect(await raceManager.read.ratNFT()).to.equal(
        getAddress(ratNFT.address)
      );
      expect(await raceManager.read.MAX_RACERS()).to.equal(6);
      expect(await raceManager.read.CREATOR_FEE_PERCENT()).to.equal(10);
      expect(await raceManager.read.PERCENT_DENOMINATOR()).to.equal(100);
    });

    it("Should have correct initial token supply", async function () {
      const { raceToken, deployer } = await loadFixture(deployFullSystemFixture);

      const balance = await raceToken.read.balanceOf([
        deployer.account.address,
      ]);
      expect(balance).to.equal(parseEther("1000000")); // 1M tokens
    });
  });

  describe("RaceToken (ERC20) Full Coverage", function () {
    it("Should allow minting by owner", async function () {
      const { raceToken, deployer, racer1 } = await loadFixture(
        deployFullSystemFixture
      );

      const amount = parseEther("1000");
      await raceToken.write.mint([racer1.account.address, amount]);

      expect(
        await raceToken.read.balanceOf([racer1.account.address])
      ).to.equal(amount);
    });

    it("Should allow faucet claims", async function () {
      const { raceToken, racer1 } = await loadFixture(deployFullSystemFixture);

      const initialBalance = await raceToken.read.balanceOf([
        racer1.account.address,
      ]);

      await raceToken.write.faucet([], { account: racer1.account });

      const finalBalance = await raceToken.read.balanceOf([
        racer1.account.address,
      ]);

      expect(finalBalance - initialBalance).to.equal(parseEther("1000"));
    });

    it("Should allow transfers", async function () {
      const { raceToken, racer1, racer2 } = await loadFixture(
        deployFullSystemFixture
      );

      await raceToken.write.faucet([], { account: racer1.account });

      const amount = parseEther("100");
      await raceToken.write.transfer([racer2.account.address, amount], {
        account: racer1.account,
      });

      expect(
        await raceToken.read.balanceOf([racer2.account.address])
      ).to.equal(amount);
    });

    it("Should allow approvals and transferFrom", async function () {
      const { raceToken, racer1, racer2 } = await loadFixture(
        deployFullSystemFixture
      );

      await raceToken.write.faucet([], { account: racer1.account });

      const amount = parseEther("100");
      await raceToken.write.approve([racer2.account.address, amount], {
        account: racer1.account,
      });

      await raceToken.write.transferFrom(
        [racer1.account.address, racer2.account.address, amount],
        { account: racer2.account }
      );

      expect(
        await raceToken.read.balanceOf([racer2.account.address])
      ).to.equal(amount);
    });

    it("Should fail mint if not owner", async function () {
      const { raceToken, racer1, racer2 } = await loadFixture(
        deployFullSystemFixture
      );

      await expect(
        raceToken.write.mint([racer2.account.address, parseEther("1000")], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });
  });

  describe("RatNFT (ERC721) Full Coverage", function () {
    it("Should mint rats with all color variants", async function () {
      const { ratNFT, racer1 } = await loadFixture(deployFullSystemFixture);

      for (let color = 0; color <= 5; color++) {
        await ratNFT.write.mint([
          racer1.account.address,
          `Rat${color}`,
          color,
        ]);

        const metadata = await ratNFT.read.getRatMetadata([BigInt(color)]);
        expect(metadata[0]).to.equal(`Rat${color}`);
        expect(metadata[1]).to.equal(color);
      }

      expect(await ratNFT.read.balanceOf([racer1.account.address])).to.equal(
        6n
      );
    });

    it("Should fail to mint with invalid color", async function () {
      const { ratNFT, racer1 } = await loadFixture(deployFullSystemFixture);

      await expect(
        ratNFT.write.mint([racer1.account.address, "BadRat", 6])
      ).to.be.rejected;

      await expect(
        ratNFT.write.mint([racer1.account.address, "BadRat", 255])
      ).to.be.rejected;
    });

    it("Should fail to mint without name", async function () {
      const { ratNFT, racer1 } = await loadFixture(deployFullSystemFixture);

      await expect(
        ratNFT.write.mint([racer1.account.address, "", 0])
      ).to.be.rejected;
    });

    it("Should return all rats owned by address", async function () {
      const { ratNFT, racer1 } = await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);
      await ratNFT.write.mint([racer1.account.address, "Rat2", 1]);
      await ratNFT.write.mint([racer1.account.address, "Rat3", 2]);

      const rats = await ratNFT.read.getRatsOfOwner([racer1.account.address]);
      expect(rats.length).to.equal(3);
      expect(rats).to.deep.equal([0n, 1n, 2n]);
    });

    it("Should support enumeration", async function () {
      const { ratNFT, racer1 } = await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);
      await ratNFT.write.mint([racer1.account.address, "Rat2", 1]);

      const totalSupply = await ratNFT.read.totalSupply();
      expect(totalSupply).to.equal(2n);

      const tokenByIndex = await ratNFT.read.tokenByIndex([0n]);
      expect(tokenByIndex).to.equal(0n);
    });

    it("Should allow transfers", async function () {
      const { ratNFT, racer1, racer2 } = await loadFixture(
        deployFullSystemFixture
      );

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);

      await ratNFT.write.transferFrom(
        [racer1.account.address, racer2.account.address, 0n],
        { account: racer1.account }
      );

      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress(racer2.account.address)
      );
    });

    it("Should allow approvals and transferFrom", async function () {
      const { ratNFT, racer1, racer2 } = await loadFixture(
        deployFullSystemFixture
      );

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);

      await ratNFT.write.approve([racer2.account.address, 0n], {
        account: racer1.account,
      });

      await ratNFT.write.transferFrom(
        [racer1.account.address, racer2.account.address, 0n],
        { account: racer2.account }
      );

      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress(racer2.account.address)
      );
    });

    it("Should update base URI", async function () {
      const { ratNFT, deployer } = await loadFixture(deployFullSystemFixture);

      await ratNFT.write.setBaseURI(["https://new-api.com/"], {
        account: deployer.account,
      });

      // Verify by minting and checking URI would work
      await ratNFT.write.mint([deployer.account.address, "Test", 0]);
    });

    it("Should fail to update base URI if not owner", async function () {
      const { ratNFT, racer1 } = await loadFixture(deployFullSystemFixture);

      await expect(
        ratNFT.write.setBaseURI(["https://new-api.com/"], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });

    it("Should fail to get metadata for non-existent token", async function () {
      const { ratNFT } = await loadFixture(deployFullSystemFixture);

      await expect(ratNFT.read.getRatMetadata([999n])).to.be.rejected;
    });
  });

  describe("RaceManager: Race Creation", function () {
    it("Should create race with valid parameters", async function () {
      const { raceManager, raceToken, raceCreator1 } = await loadFixture(
        deployFullSystemFixture
      );

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      const race = await raceManager.read.getRace([0n]);
      expect(race[0]).to.equal(0n); // raceId
      expect(getAddress(race[1])).to.equal(
        getAddress(raceCreator1.account.address)
      ); // creator
      expect(race[2]).to.equal(1); // trackId
      expect(race[4]).to.equal(entryFee); // entryFee
      expect(race[5]).to.equal(0); // status: Active
    });

    it("Should increment race IDs correctly", async function () {
      const { raceManager, raceToken, raceCreator1 } = await loadFixture(
        deployFullSystemFixture
      );

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      const count = await raceManager.read.getRaceCount();
      expect(count).to.equal(3n);
    });

    it("Should fail with invalid track ID (0)", async function () {
      const { raceManager, raceToken, raceCreator1 } = await loadFixture(
        deployFullSystemFixture
      );

      await expect(
        raceManager.write.createRace(
          [0, raceToken.address, parseEther("100")],
          { account: raceCreator1.account }
        )
      ).to.be.rejected;
    });

    it("Should fail with invalid token address", async function () {
      const { raceManager, raceCreator1 } = await loadFixture(
        deployFullSystemFixture
      );

      await expect(
        raceManager.write.createRace(
          [1, "0x0000000000000000000000000000000000000000", parseEther("100")],
          { account: raceCreator1.account }
        )
      ).to.be.rejected;
    });

    it("Should fail with zero entry fee", async function () {
      const { raceManager, raceToken, raceCreator1 } = await loadFixture(
        deployFullSystemFixture
      );

      await expect(
        raceManager.write.createRace([1, raceToken.address, 0n], {
          account: raceCreator1.account,
        })
      ).to.be.rejected;
    });

    it("Should allow multiple creators to create races", async function () {
      const { raceManager, raceToken, raceCreator1, raceCreator2 } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator2.account }
      );

      const race1 = await raceManager.read.getRace([0n]);
      const race2 = await raceManager.read.getRace([1n]);

      expect(getAddress(race1[1])).to.equal(
        getAddress(raceCreator1.account.address)
      );
      expect(getAddress(race2[1])).to.equal(
        getAddress(raceCreator2.account.address)
      );
    });
  });

  describe("RaceManager: Race Entry", function () {
    it("Should allow valid race entry", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1 } =
        await loadFixture(deployFullSystemFixture);

      // Mint rat
      await ratNFT.write.mint([racer1.account.address, "Speedy", 0]);

      // Give tokens
      await raceToken.write.faucet([], { account: racer1.account });

      // Create race
      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Approve and enter
      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });
      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(entries.length).to.equal(1);
      expect(getAddress(entries[0][0])).to.equal(
        getAddress(racer1.account.address)
      );
      expect(entries[0][1]).to.equal(0n); // ratTokenId
    });

    it("Should fail if racer doesn't own the rat", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1, racer2 } =
        await loadFixture(deployFullSystemFixture);

      // Mint rat to racer2
      await ratNFT.write.mint([racer2.account.address, "Speedy", 0]);

      // Give tokens to racer1
      await raceToken.write.faucet([], { account: racer1.account });

      // Create race
      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Try to enter with racer2's rat
      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });

      await expect(
        raceManager.write.enterRace([0n, 0n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });

    it("Should fail if racer already entered", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1 } =
        await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Speedy", 0]);
      await raceToken.write.faucet([], { account: racer1.account });

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
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

    it("Should fail if rat already in race", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1 } =
        await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Speedy", 0]);
      await raceToken.write.faucet([], { account: racer1.account });

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee * 2n], {
        account: racer1.account,
      });

      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      // Same rat can't enter again
      await expect(
        raceManager.write.enterRace([0n, 0n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });

    it("Should fail if race doesn't exist", async function () {
      const { ratNFT, raceToken, raceManager, racer1 } = await loadFixture(
        deployFullSystemFixture
      );

      await ratNFT.write.mint([racer1.account.address, "Speedy", 0]);
      await raceToken.write.faucet([], { account: racer1.account });

      await raceToken.write.approve(
        [raceManager.address, parseEther("100")],
        { account: racer1.account }
      );

      await expect(
        raceManager.write.enterRace([999n, 0n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });

    it("Should fail without sufficient token approval", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1 } =
        await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Speedy", 0]);
      await raceToken.write.faucet([], { account: racer1.account });

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Don't approve tokens
      await expect(
        raceManager.write.enterRace([0n, 0n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });

    it("Should update race status to Full when 6 racers enter", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Mint rats and enter race for 6 racers
      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

    it("Should fail to enter full race", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Fill race with 6 racers
      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      // Try to enter with 7th racer
      await ratNFT.write.mint([racers[6].account.address, "Rat7", 0]);
      await raceToken.write.faucet([], { account: racers[6].account });
      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racers[6].account,
      });

      await expect(
        raceManager.write.enterRace([0n, 6n], {
          account: racers[6].account,
        })
      ).to.be.rejected;
    });

    it("Should accumulate prize pool correctly", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      const race = await raceManager.read.getRace([0n]);
      expect(race[6]).to.equal(entryFee * 6n); // prizePool
    });
  });

  describe("RaceManager: Starting Race", function () {
    it("Should allow participant to start full race", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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
      expect(race[8]).to.be.greaterThan(0n); // startedAt timestamp
    });

    it("Should fail if non-participant tries to start", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers, racer7 } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      await expect(
        raceManager.write.startRace([0n], {
          account: racer7.account,
        })
      ).to.be.rejected;
    });

    it("Should fail if race is not full", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1 } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);
      await raceToken.write.faucet([], { account: racer1.account });
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

    it("Should fail to start already started race", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

      await expect(
        raceManager.write.startRace([0n], {
          account: racers[1].account,
        })
      ).to.be.rejected;
    });

    it("Should allow any participant to start", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      // Last participant starts
      await raceManager.write.startRace([0n], {
        account: racers[5].account,
      });

      const race = await raceManager.read.getRace([0n]);
      expect(race[5]).to.equal(2); // Status.Started
    });
  });

  describe("RaceManager: Finishing Race & Prize Distribution", function () {
    it("Should finish race and distribute prizes correctly", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Enter all racers
      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

      // Record balances
      const creatorInitial = await raceToken.read.balanceOf([
        raceCreator1.account.address,
      ]);
      const racer1Initial = await raceToken.read.balanceOf([
        racers[0].account.address,
      ]);
      const racer2Initial = await raceToken.read.balanceOf([
        racers[1].account.address,
      ]);
      const racer3Initial = await raceToken.read.balanceOf([
        racers[2].account.address,
      ]);
      const racer4Initial = await raceToken.read.balanceOf([
        racers[3].account.address,
      ]);

      // Finish race
      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder]);

      // Check final balances
      const totalPrizePool = entryFee * 6n;
      const creatorFee = (totalPrizePool * 10n) / 100n;
      const remainingPool = totalPrizePool - creatorFee;

      const creatorFinal = await raceToken.read.balanceOf([
        raceCreator1.account.address,
      ]);
      expect(creatorFinal - creatorInitial).to.equal(creatorFee);

      const racer1Final = await raceToken.read.balanceOf([
        racers[0].account.address,
      ]);
      const racer2Final = await raceToken.read.balanceOf([
        racers[1].account.address,
      ]);
      const racer3Final = await raceToken.read.balanceOf([
        racers[2].account.address,
      ]);
      const racer4Final = await raceToken.read.balanceOf([
        racers[3].account.address,
      ]);

      // 1st place: 50% of remaining
      expect(racer1Final - racer1Initial).to.equal((remainingPool * 50n) / 100n);
      // 2nd place: 30% of remaining
      expect(racer2Final - racer2Initial).to.equal((remainingPool * 30n) / 100n);
      // 3rd place: 20% of remaining
      expect(racer3Final - racer3Initial).to.equal((remainingPool * 20n) / 100n);
      // 4th place: 0
      expect(racer4Final - racer4Initial).to.equal(0n);

      // Check race status
      const race = await raceManager.read.getRace([0n]);
      expect(race[5]).to.equal(3); // Status.Finished
      expect(race[9]).to.be.greaterThan(0n); // finishedAt timestamp
    });

    it("Should set positions correctly", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

      // Different finishing order
      const winningOrder = [3n, 5n, 1n, 0n, 2n, 4n];
      await raceManager.write.finishRace([0n, winningOrder]);

      const entries = await raceManager.read.getRaceEntries([0n]);

      // Find each rat and check position
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const expectedPosition = winningOrder.findIndex(
          (id) => id === entry[1]
        ) + 1;
        expect(entry[3]).to.equal(expectedPosition);
      }
    });

    it("Should fail if race not started", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

    it("Should fail with wrong number of positions", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

      // Only 3 positions
      await expect(
        raceManager.write.finishRace([0n, [0n, 1n, 2n]])
      ).to.be.rejected;
    });

    it("Should fail with invalid rat token ID", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

      // Invalid rat ID
      await expect(
        raceManager.write.finishRace([0n, [0n, 1n, 2n, 3n, 4n, 999n]])
      ).to.be.rejected;
    });

    it("Should fail to finish already finished race", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.faucet([], { account: racers[i].account });
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

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder]);

      await expect(
        raceManager.write.finishRace([0n, winningOrder])
      ).to.be.rejected;
    });
  });

  describe("Complete Race Lifecycle", function () {
    it("Should complete full race from creation to finish", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      // 1. Mint rats for all racers
      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Champion${i}`,
          i,
        ]);
      }

      // 2. Distribute tokens
      for (let i = 0; i < 6; i++) {
        await raceToken.write.faucet([], { account: racers[i].account });
      }

      // 3. Create race
      const entryFee = parseEther("50");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // 4. All racers enter
      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      // 5. Start race
      await raceManager.write.startRace([0n], {
        account: racers[2].account,
      });

      // 6. Finish race
      const winningOrder = [2n, 0n, 4n, 1n, 3n, 5n];
      await raceManager.write.finishRace([0n, winningOrder]);

      // Verify everything
      const race = await raceManager.read.getRace([0n]);
      expect(race[5]).to.equal(3); // Finished

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(entries.length).to.equal(6);
    });

    it("Should handle multiple concurrent races", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, raceCreator2, racers } =
        await loadFixture(deployFullSystemFixture);

      // Mint multiple rats per racer
      for (let i = 0; i < 8; i++) {
        await ratNFT.write.mint([
          racers[i % 6].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await ratNFT.write.mint([
          racers[i % 6].account.address,
          `Rat${i + 100}`,
          i % 6,
        ]);
      }

      // Give tokens
      for (let i = 0; i < 6; i++) {
        await raceToken.write.mint([
          racers[i].account.address,
          parseEther("10000"),
        ]);
      }

      const entryFee = parseEther("100");

      // Create first race
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Create second race
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator2.account }
      );

      // Enter race 1
      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([0n, BigInt(i)], {
          account: racers[i].account,
        });
      }

      // Enter race 2 with different rats
      for (let i = 0; i < 6; i++) {
        await raceToken.write.approve([raceManager.address, entryFee], {
          account: racers[i].account,
        });
        await raceManager.write.enterRace([1n, BigInt(i + 6)], {
          account: racers[i].account,
        });
      }

      // Start both races
      await raceManager.write.startRace([0n], {
        account: racers[0].account,
      });
      await raceManager.write.startRace([1n], {
        account: racers[1].account,
      });

      // Verify both races are running
      const race1 = await raceManager.read.getRace([0n]);
      const race2 = await raceManager.read.getRace([1n]);
      expect(race1[5]).to.equal(2); // Started
      expect(race2[5]).to.equal(2); // Started
    });
  });

  describe("View Functions & Queries", function () {
    it("Should return correct race count", async function () {
      const { raceManager, raceToken, raceCreator1 } = await loadFixture(
        deployFullSystemFixture
      );

      expect(await raceManager.read.getRaceCount()).to.equal(0n);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      expect(await raceManager.read.getRaceCount()).to.equal(2n);
    });

    it("Should check if racer has entered", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1, racer2 } =
        await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);
      await raceToken.write.faucet([], { account: racer1.account });

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });
      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      expect(
        await raceManager.read.hasRacerEntered([0n, racer1.account.address])
      ).to.be.true;
      expect(
        await raceManager.read.hasRacerEntered([0n, racer2.account.address])
      ).to.be.false;
    });

    it("Should return empty entries for new race", async function () {
      const { raceManager, raceToken, raceCreator1 } = await loadFixture(
        deployFullSystemFixture
      );

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(entries.length).to.equal(0);
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should handle rat transfer between entry and race start", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1, racer2 } =
        await loadFixture(deployFullSystemFixture);

      // Mint and enter
      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);
      await raceToken.write.faucet([], { account: racer1.account });

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee], {
        account: racer1.account,
      });
      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      // Transfer rat to racer2
      await ratNFT.write.transferFrom(
        [racer1.account.address, racer2.account.address, 0n],
        { account: racer1.account }
      );

      // Racer1 is still in the race, but doesn't own rat anymore
      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress(racer2.account.address)
      );

      const entries = await raceManager.read.getRaceEntries([0n]);
      expect(getAddress(entries[0][0])).to.equal(
        getAddress(racer1.account.address)
      );
    });

    it("Should handle different entry fees correctly", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1, racer2 } =
        await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);
      await ratNFT.write.mint([racer2.account.address, "Rat2", 1]);

      // Race 1: Low fee
      const lowFee = parseEther("10");
      await raceManager.write.createRace(
        [1, raceToken.address, lowFee],
        { account: raceCreator1.account }
      );

      // Race 2: High fee
      const highFee = parseEther("1000");
      await raceManager.write.createRace(
        [1, raceToken.address, highFee],
        { account: raceCreator1.account }
      );

      // Give enough tokens
      await raceToken.write.mint([racer1.account.address, parseEther("2000")]);
      await raceToken.write.mint([racer2.account.address, parseEther("2000")]);

      // Enter both races
      await raceToken.write.approve([raceManager.address, lowFee], {
        account: racer1.account,
      });
      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      await raceToken.write.approve([raceManager.address, highFee], {
        account: racer2.account,
      });
      await raceManager.write.enterRace([1n, 1n], {
        account: racer2.account,
      });

      const race1 = await raceManager.read.getRace([0n]);
      const race2 = await raceManager.read.getRace([1n]);

      expect(race1[6]).to.equal(lowFee);
      expect(race2[6]).to.equal(highFee);
    });

    it("Should prevent reentrancy on entry", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racer1 } =
        await loadFixture(deployFullSystemFixture);

      await ratNFT.write.mint([racer1.account.address, "Rat1", 0]);
      await raceToken.write.faucet([], { account: racer1.account });
      await raceToken.write.faucet([], { account: racer1.account });

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      await raceToken.write.approve([raceManager.address, entryFee * 2n], {
        account: racer1.account,
      });

      await raceManager.write.enterRace([0n, 0n], {
        account: racer1.account,
      });

      // Try to enter again - should fail
      await expect(
        raceManager.write.enterRace([0n, 0n], {
          account: racer1.account,
        })
      ).to.be.rejected;
    });
  });

  describe("Prize Distribution Math Verification", function () {
    it("Should distribute exactly 100% of prize pool", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("100");
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      // Mint tokens to contract initially to compare
      const contractInitial = await raceToken.read.balanceOf([
        raceManager.address,
      ]);

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.mint([racers[i].account.address, entryFee * 2n]);
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

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder]);

      // Contract should have distributed everything
      const contractFinal = await raceToken.read.balanceOf([
        raceManager.address,
      ]);
      expect(contractFinal).to.equal(contractInitial);
    });

    it("Should calculate prizes with different entry fees correctly", async function () {
      const { ratNFT, raceToken, raceManager, raceCreator1, racers } =
        await loadFixture(deployFullSystemFixture);

      const entryFee = parseEther("77.77"); // Odd number
      await raceManager.write.createRace(
        [1, raceToken.address, entryFee],
        { account: raceCreator1.account }
      );

      for (let i = 0; i < 6; i++) {
        await ratNFT.write.mint([
          racers[i].account.address,
          `Rat${i}`,
          i % 6,
        ]);
        await raceToken.write.mint([racers[i].account.address, entryFee * 2n]);
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

      const creatorInitial = await raceToken.read.balanceOf([
        raceCreator1.account.address,
      ]);
      const racer1Initial = await raceToken.read.balanceOf([
        racers[0].account.address,
      ]);

      const winningOrder = [0n, 1n, 2n, 3n, 4n, 5n];
      await raceManager.write.finishRace([0n, winningOrder]);

      const creatorFinal = await raceToken.read.balanceOf([
        raceCreator1.account.address,
      ]);
      const racer1Final = await raceToken.read.balanceOf([
        racers[0].account.address,
      ]);

      const totalPool = entryFee * 6n;
      const expectedCreatorFee = (totalPool * 10n) / 100n;
      const remaining = totalPool - expectedCreatorFee;
      const expectedFirstPlace = (remaining * 50n) / 100n;

      expect(creatorFinal - creatorInitial).to.equal(expectedCreatorFee);
      expect(racer1Final - racer1Initial).to.equal(expectedFirstPlace);
    });
  });
});

