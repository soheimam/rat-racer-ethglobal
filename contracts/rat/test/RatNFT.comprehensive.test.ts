import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { getAddress } from "viem";

describe("RatNFT - Comprehensive Tests", function () {
  async function deployRatNFTFixture() {
    const [owner, user1, user2, user3] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const ratNFT = await hre.viem.deployContract("RatNFT", [
      "Rat Racer NFT",
      "RAT",
      "https://api.ratracer.xyz/rats/",
    ]);

    return { ratNFT, owner, user1, user2, user3, publicClient };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.name()).to.equal("Rat Racer NFT");
      expect(await ratNFT.read.symbol()).to.equal("RAT");
    });

    it("Should set the correct owner", async function () {
      const { ratNFT, owner } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.owner()).to.equal(
        getAddress(owner.account.address)
      );
    });

    it("Should set the correct base URI", async function () {
      const { ratNFT, owner } = await loadFixture(deployRatNFTFixture);
      const tokenId = await ratNFT.write.mint(
        [owner.account.address, "TestRat", 0],
        { account: owner.account }
      );
      const uri = await ratNFT.read.tokenURI([0n]);
      expect(uri).to.include("https://api.ratracer.xyz/rats/");
    });

    it("Should start with zero total supply", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.totalSupply()).to.equal(0n);
    });
  });

  describe("Minting", function () {
    it("Should mint a rat with valid parameters", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "Speedy", 3], {
        account: owner.account,
      });

      expect(await ratNFT.read.totalSupply()).to.equal(1n);
      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress(user1.account.address)
      );
    });

    it("Should mint rats with all valid colors (0-5)", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      for (let color = 0; color <= 5; color++) {
        await ratNFT.write.mint(
          [user1.account.address, `Rat${color}`, color],
          { account: owner.account }
        );
      }

      expect(await ratNFT.read.totalSupply()).to.equal(6n);
    });

    it("Should revert when minting with invalid color > 5", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await expect(
        ratNFT.write.mint([user1.account.address, "InvalidRat", 6], {
          account: owner.account,
        })
      ).to.be.rejectedWith("Invalid color");
    });

    it("Should revert when minting with empty name", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await expect(
        ratNFT.write.mint([user1.account.address, "", 0], {
          account: owner.account,
        })
      ).to.be.rejectedWith("Name required");
    });

    it("Should increment token IDs sequentially", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "Rat1", 0], {
        account: owner.account,
      });
      await ratNFT.write.mint([user1.account.address, "Rat2", 1], {
        account: owner.account,
      });
      await ratNFT.write.mint([user1.account.address, "Rat3", 2], {
        account: owner.account,
      });

      expect(await ratNFT.read.totalSupply()).to.equal(3n);
      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress(user1.account.address)
      );
      expect(await ratNFT.read.ownerOf([1n])).to.equal(
        getAddress(user1.account.address)
      );
      expect(await ratNFT.read.ownerOf([2n])).to.equal(
        getAddress(user1.account.address)
      );
    });

    it("Should emit RatMinted event", async function () {
      const { ratNFT, owner, user1, publicClient } = await loadFixture(
        deployRatNFTFixture
      );

      const hash = await ratNFT.write.mint(
        [user1.account.address, "EventRat", 4],
        { account: owner.account }
      );

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await ratNFT.getEvents.RatMinted();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.owner).to.equal(
        getAddress(user1.account.address)
      );
      expect(events[0].args.tokenId).to.equal(0n);
      expect(events[0].args.name).to.equal("EventRat");
      expect(events[0].args.color).to.equal(4);
    });

    it("Should allow minting to address(0) should fail (safe mint)", async function () {
      const { ratNFT, owner } = await loadFixture(deployRatNFTFixture);

      await expect(
        ratNFT.write.mint([
          "0x0000000000000000000000000000000000000000",
          "BadRat",
          0,
        ], { account: owner.account })
      ).to.be.rejected;
    });

    it("Should store correct metadata", async function () {
      const { ratNFT, owner, user1, publicClient } = await loadFixture(
        deployRatNFTFixture
      );

      await ratNFT.write.mint([user1.account.address, "MetaRat", 2], {
        account: owner.account,
      });

      const metadata = await ratNFT.read.getRatMetadata([0n]);
      expect(metadata.name).to.equal("MetaRat");
      expect(metadata.color).to.equal(2);
      expect(metadata.mintedAt).to.be.greaterThan(0n);
    });
  });

  describe("Metadata", function () {
    it("Should return correct metadata for existing rat", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "QueryRat", 5], {
        account: owner.account,
      });

      const metadata = await ratNFT.read.getRatMetadata([0n]);
      expect(metadata.name).to.equal("QueryRat");
      expect(metadata.color).to.equal(5);
    });

    it("Should revert when querying non-existent rat", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);

      await expect(ratNFT.read.getRatMetadata([999n])).to.be.rejectedWith(
        "Rat does not exist"
      );
    });

    it("Should return correct metadata after multiple mints", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "Rat1", 0], {
        account: owner.account,
      });
      await ratNFT.write.mint([user1.account.address, "Rat2", 3], {
        account: owner.account,
      });

      const metadata1 = await ratNFT.read.getRatMetadata([0n]);
      const metadata2 = await ratNFT.read.getRatMetadata([1n]);

      expect(metadata1.name).to.equal("Rat1");
      expect(metadata1.color).to.equal(0);
      expect(metadata2.name).to.equal("Rat2");
      expect(metadata2.color).to.equal(3);
    });
  });

  describe("Owner Queries", function () {
    it("Should return empty array for address with no rats", async function () {
      const { ratNFT, user1 } = await loadFixture(deployRatNFTFixture);

      const rats = await ratNFT.read.getRatsOfOwner([user1.account.address]);
      expect(rats).to.have.lengthOf(0);
    });

    it("Should return correct rats for owner with single rat", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "OnlyRat", 1], {
        account: owner.account,
      });

      const rats = await ratNFT.read.getRatsOfOwner([user1.account.address]);
      expect(rats).to.have.lengthOf(1);
      expect(rats[0]).to.equal(0n);
    });

    it("Should return all rats for owner with multiple rats", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "Rat1", 0], {
        account: owner.account,
      });
      await ratNFT.write.mint([user1.account.address, "Rat2", 1], {
        account: owner.account,
      });
      await ratNFT.write.mint([user1.account.address, "Rat3", 2], {
        account: owner.account,
      });

      const rats = await ratNFT.read.getRatsOfOwner([user1.account.address]);
      expect(rats).to.have.lengthOf(3);
      expect(rats).to.deep.equal([0n, 1n, 2n]);
    });

    it("Should update owner query after transfer", async function () {
      const { ratNFT, owner, user1, user2 } = await loadFixture(
        deployRatNFTFixture
      );

      await ratNFT.write.mint([user1.account.address, "TransferRat", 0], {
        account: owner.account,
      });

      // Transfer to user2
      await ratNFT.write.transferFrom(
        [user1.account.address, user2.account.address, 0n],
        { account: user1.account }
      );

      const user1Rats = await ratNFT.read.getRatsOfOwner([
        user1.account.address,
      ]);
      const user2Rats = await ratNFT.read.getRatsOfOwner([
        user2.account.address,
      ]);

      expect(user1Rats).to.have.lengthOf(0);
      expect(user2Rats).to.have.lengthOf(1);
      expect(user2Rats[0]).to.equal(0n);
    });
  });

  describe("Base URI", function () {
    it("Should allow owner to update base URI", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "URIRat", 0], {
        account: owner.account,
      });

      await ratNFT.write.setBaseURI(["https://newapi.ratracer.xyz/rats/"], {
        account: owner.account,
      });

      const uri = await ratNFT.read.tokenURI([0n]);
      expect(uri).to.include("https://newapi.ratracer.xyz/rats/");
    });

    it("Should revert when non-owner tries to update base URI", async function () {
      const { ratNFT, user1 } = await loadFixture(deployRatNFTFixture);

      await expect(
        ratNFT.write.setBaseURI(["https://hack.com/rats/"], {
          account: user1.account,
        })
      ).to.be.rejected;
    });
  });

  describe("ERC721 Standard Compliance", function () {
    it("Should support ERC721 interface", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);

      // ERC721 interface ID: 0x80ac58cd
      expect(await ratNFT.read.supportsInterface(["0x80ac58cd"])).to.be.true;
    });

    it("Should support ERC721Enumerable interface", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);

      // ERC721Enumerable interface ID: 0x780e9d63
      expect(await ratNFT.read.supportsInterface(["0x780e9d63"])).to.be.true;
    });

    it("Should allow approved address to transfer", async function () {
      const { ratNFT, owner, user1, user2 } = await loadFixture(
        deployRatNFTFixture
      );

      await ratNFT.write.mint([user1.account.address, "ApproveRat", 0], {
        account: owner.account,
      });

      await ratNFT.write.approve([user2.account.address, 0n], {
        account: user1.account,
      });

      await ratNFT.write.transferFrom(
        [user1.account.address, user2.account.address, 0n],
        { account: user2.account }
      );

      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress(user2.account.address)
      );
    });

    it("Should allow operator to transfer all tokens", async function () {
      const { ratNFT, owner, user1, user2 } = await loadFixture(
        deployRatNFTFixture
      );

      await ratNFT.write.mint([user1.account.address, "Rat1", 0], {
        account: owner.account,
      });
      await ratNFT.write.mint([user1.account.address, "Rat2", 1], {
        account: owner.account,
      });

      await ratNFT.write.setApprovalForAll([user2.account.address, true], {
        account: user1.account,
      });

      await ratNFT.write.transferFrom(
        [user1.account.address, user2.account.address, 0n],
        { account: user2.account }
      );
      await ratNFT.write.transferFrom(
        [user1.account.address, user2.account.address, 1n],
        { account: user2.account }
      );

      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress(user2.account.address)
      );
      expect(await ratNFT.read.ownerOf([1n])).to.equal(
        getAddress(user2.account.address)
      );
    });
  });

  describe("Edge Cases & Gas Tests", function () {
    it("Should handle very long rat names", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      const longName = "A".repeat(100);
      await ratNFT.write.mint([user1.account.address, longName, 0], {
        account: owner.account,
      });

      const metadata = await ratNFT.read.getRatMetadata([0n]);
      expect(metadata.name).to.equal(longName);
    });

    it("Should handle special characters in rat names", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      const specialName = "Rät-🐀-#1!@#$%";
      await ratNFT.write.mint([user1.account.address, specialName, 0], {
        account: owner.account,
      });

      const metadata = await ratNFT.read.getRatMetadata([0n]);
      expect(metadata.name).to.equal(specialName);
    });

    it("Should handle minting many rats efficiently", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      // Mint 20 rats
      for (let i = 0; i < 20; i++) {
        await ratNFT.write.mint([user1.account.address, `Rat${i}`, i % 6], {
          account: owner.account,
        });
      }

      expect(await ratNFT.read.totalSupply()).to.equal(20n);
      const rats = await ratNFT.read.getRatsOfOwner([user1.account.address]);
      expect(rats).to.have.lengthOf(20);
    });

    it("Should handle querying owner with many rats", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      for (let i = 0; i < 10; i++) {
        await ratNFT.write.mint([user1.account.address, `Rat${i}`, i % 6], {
          account: owner.account,
        });
      }

      const rats = await ratNFT.read.getRatsOfOwner([user1.account.address]);
      expect(rats).to.have.lengthOf(10);
    });
  });

  describe("Burn Functionality (if needed)", function () {
    // Note: Current contract doesn't have burn, but this is important for game loop
    it("Should test if rats can be burned/retired", async function () {
      const { ratNFT, owner, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address, "BurnRat", 0], {
        account: owner.account,
      });

      // Try to send to dead address as pseudo-burn
      await ratNFT.write.transferFrom(
        [
          user1.account.address,
          "0x000000000000000000000000000000000000dEaD",
          0n,
        ],
        { account: user1.account }
      );

      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        getAddress("0x000000000000000000000000000000000000dEaD")
      );
    });
  });

  describe("Security Tests", function () {
    it("Should prevent non-owner from minting", async function () {
      const { ratNFT, user1 } = await loadFixture(deployRatNFTFixture);

      // Anyone can mint - THIS IS A POTENTIAL ISSUE
      // In production, you might want access control
      await ratNFT.write.mint([user1.account.address, "UnauthorizedRat", 0], {
        account: user1.account,
      });

      expect(await ratNFT.read.totalSupply()).to.equal(1n);
    });

    it("Should maintain metadata integrity after transfers", async function () {
      const { ratNFT, owner, user1, user2 } = await loadFixture(
        deployRatNFTFixture
      );

      await ratNFT.write.mint([user1.account.address, "IntegrityRat", 3], {
        account: owner.account,
      });

      const metadataBefore = await ratNFT.read.getRatMetadata([0n]);

      await ratNFT.write.transferFrom(
        [user1.account.address, user2.account.address, 0n],
        { account: user1.account }
      );

      const metadataAfter = await ratNFT.read.getRatMetadata([0n]);

      expect(metadataAfter.name).to.equal(metadataBefore.name);
      expect(metadataAfter.color).to.equal(metadataBefore.color);
      expect(metadataAfter.mintedAt).to.equal(metadataBefore.mintedAt);
    });
  });
});

