import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { getAddress } from "viem";

describe("RatNFT", function () {
  async function deployRatNFTFixture() {
    const [owner, user1, user2, user3] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const ratNFT = await hre.viem.deployContract("RatNFT", []);

    return { ratNFT, owner, user1, user2, user3, publicClient };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.name()).to.equal("Street Racer Rat");
      expect(await ratNFT.read.symbol()).to.equal("RAT");
    });

    it("Should set the correct owner", async function () {
      const { ratNFT, owner } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.owner()).to.equal(
        getAddress(owner.account.address)
      );
    });

    it("Should start with zero total supply", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.totalSupply()).to.equal(0n);
    });
  });

  describe("Minting", function () {
    it("Should mint a rat to specified address", async function () {
      const { ratNFT, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address]);

      expect(await ratNFT.read.totalSupply()).to.equal(1n);
      expect(await ratNFT.read.ownerOf([1n])).to.equal(
        getAddress(user1.account.address)
      );
    });

    it("Should mint multiple rats with incrementing token IDs", async function () {
      const { ratNFT, user1 } = await loadFixture(deployRatNFTFixture);

      for (let i = 0; i < 5; i++) {
        await ratNFT.write.mint([user1.account.address]);
      }

      expect(await ratNFT.read.totalSupply()).to.equal(5n);
    });

    it("Should revert when minting to zero address", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);

      await expect(
        ratNFT.write.mint(["0x0000000000000000000000000000000000000000"])
      ).to.be.rejectedWith("Cannot mint to zero address");
    });

    it("Should emit RatMinted event", async function () {
      const { ratNFT, user1, publicClient } = await loadFixture(
        deployRatNFTFixture
      );

      const hash = await ratNFT.write.mint([user1.account.address]);

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await ratNFT.getEvents.RatMinted();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.to).to.equal(
        getAddress(user1.account.address)
      );
      expect(events[0].args.tokenId).to.equal(1n);
    });
  });

  describe("Owner Queries", function () {
    it("Should return correct rats for owner", async function () {
      const { ratNFT, user1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address]);
      await ratNFT.write.mint([user1.account.address]);
      await ratNFT.write.mint([user1.account.address]);

      expect(await ratNFT.read.balanceOf([user1.account.address])).to.equal(3n);
    });

    it("Should update balance after transfer", async function () {
      const { ratNFT, user1, user2 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address]);

      await ratNFT.write.transferFrom(
        [user1.account.address, user2.account.address, 1n],
        { account: user1.account }
      );

      expect(await ratNFT.read.balanceOf([user1.account.address])).to.equal(0n);
      expect(await ratNFT.read.balanceOf([user2.account.address])).to.equal(1n);
    });
  });

  describe("Base URI", function () {
    it("Should allow owner to update base URI", async function () {
      const { ratNFT, owner, user1, publicClient } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address]);

      const hash = await ratNFT.write.setBaseURI(["https://newapi.ratracer.xyz/rats/"], {
        account: owner.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const events = await ratNFT.getEvents.BaseURIUpdated();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.newBaseURI).to.equal("https://newapi.ratracer.xyz/rats/");
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

  describe("ERC721 Compliance", function () {
    it("Should support ERC721 interface", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.supportsInterface(["0x80ac58cd"])).to.be.true;
    });

    it("Should support ERC721Enumerable interface", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);
      expect(await ratNFT.read.supportsInterface(["0x780e9d63"])).to.be.true;
    });

    it("Should allow approved address to transfer", async function () {
      const { ratNFT, user1, user2 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([user1.account.address]);

      await ratNFT.write.approve([user2.account.address, 1n], {
        account: user1.account,
      });

      await ratNFT.write.transferFrom(
        [user1.account.address, user2.account.address, 1n],
        { account: user2.account }
      );

      expect(await ratNFT.read.ownerOf([1n])).to.equal(
        getAddress(user2.account.address)
      );
    });
  });
});

