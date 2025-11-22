import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";

describe("RatNFT", function () {
  async function deployRatNFTFixture() {
    const [owner, addr1, addr2] = await hre.viem.getWalletClients();

    const ratNFT = await hre.viem.deployContract("RatNFT", [
      "Rat Racer NFT",
      "RAT",
      "https://api.ratracer.xyz/rats/",
    ]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      ratNFT,
      owner,
      addr1,
      addr2,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { ratNFT } = await loadFixture(deployRatNFTFixture);

      expect(await ratNFT.read.name()).to.equal("Rat Racer NFT");
      expect(await ratNFT.read.symbol()).to.equal("RAT");
    });

    it("Should set the owner correctly", async function () {
      const { ratNFT, owner } = await loadFixture(deployRatNFTFixture);

      expect(await ratNFT.read.owner()).to.equal(
        owner.account.address.toLowerCase()
      );
    });
  });

  describe("Minting", function () {
    it("Should mint a rat with correct metadata", async function () {
      const { ratNFT, addr1 } = await loadFixture(deployRatNFTFixture);

      const tokenId = await ratNFT.write.mint([
        addr1.account.address,
        "Speedy",
        2,
      ]);

      const metadata = await ratNFT.read.getRatMetadata([0n]);
      expect(metadata[0]).to.equal("Speedy");
      expect(metadata[1]).to.equal(2);
    });

    it("Should fail to mint with invalid color", async function () {
      const { ratNFT, addr1 } = await loadFixture(deployRatNFTFixture);

      await expect(
        ratNFT.write.mint([addr1.account.address, "Invalid", 6])
      ).to.be.rejected;
    });

    it("Should fail to mint without name", async function () {
      const { ratNFT, addr1 } = await loadFixture(deployRatNFTFixture);

      await expect(
        ratNFT.write.mint([addr1.account.address, "", 2])
      ).to.be.rejected;
    });

    it("Should increment token IDs correctly", async function () {
      const { ratNFT, addr1, addr2 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([addr1.account.address, "Rat1", 0]);
      await ratNFT.write.mint([addr2.account.address, "Rat2", 1]);

      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        addr1.account.address.toLowerCase()
      );
      expect(await ratNFT.read.ownerOf([1n])).to.equal(
        addr2.account.address.toLowerCase()
      );
    });
  });

  describe("Queries", function () {
    it("Should return all rats owned by an address", async function () {
      const { ratNFT, addr1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([addr1.account.address, "Rat1", 0]);
      await ratNFT.write.mint([addr1.account.address, "Rat2", 1]);
      await ratNFT.write.mint([addr1.account.address, "Rat3", 2]);

      const rats = await ratNFT.read.getRatsOfOwner([addr1.account.address]);
      expect(rats.length).to.equal(3);
      expect(rats[0]).to.equal(0n);
      expect(rats[1]).to.equal(1n);
      expect(rats[2]).to.equal(2n);
    });

    it("Should return correct balance", async function () {
      const { ratNFT, addr1 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([addr1.account.address, "Rat1", 0]);
      await ratNFT.write.mint([addr1.account.address, "Rat2", 1]);

      const balance = await ratNFT.read.balanceOf([addr1.account.address]);
      expect(balance).to.equal(2n);
    });
  });

  describe("Transfers", function () {
    it("Should allow transfers", async function () {
      const { ratNFT, addr1, addr2 } = await loadFixture(deployRatNFTFixture);

      await ratNFT.write.mint([addr1.account.address, "Rat1", 0]);

      await ratNFT.write.transferFrom(
        [addr1.account.address, addr2.account.address, 0n],
        { account: addr1.account }
      );

      expect(await ratNFT.read.ownerOf([0n])).to.equal(
        addr2.account.address.toLowerCase()
      );
    });
  });
});

