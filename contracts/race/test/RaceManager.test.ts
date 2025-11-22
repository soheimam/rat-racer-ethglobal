import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("RaceManager - Complete Tests", function () {
    async function deployContractsFixture() {
        const [owner, creator, racer1, racer2, racer3, racer4, racer5, racer6, other] =
            await hre.viem.getWalletClients();

        const ratNFT = await hre.viem.deployContract("RatNFT", [
            "Street Racer Rat",
            "RAT",
            "https://test.com/rats/"
        ]);

        const raceToken = await hre.viem.deployContract("RaceToken", []);

        const raceManager = await hre.viem.deployContract("RaceManager", [
            ratNFT.address,
        ]);

        const publicClient = await hre.viem.getPublicClient();

        const racers = [racer1, racer2, racer3, racer4, racer5, racer6];
        for (let i = 0; i < racers.length; i++) {
            await ratNFT.write.mint([racers[i].account.address, i % 3]); // imageIndex: 0=white, 1=brown, 2=pink
        }

        const entryFee = parseEther("100");
        for (const racer of racers) {
            await raceToken.write.mint([racer.account.address, entryFee * 10n]);
            await raceToken.write.approve([raceManager.address, entryFee * 100n], {
                account: racer.account,
            });
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
            other,
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
        });

        it("Should revert with invalid track ID", async function () {
            const { raceManager, creator, raceToken, entryFee } = await loadFixture(
                deployContractsFixture
            );

            await expect(
                raceManager.write.createRace([0, raceToken.address, entryFee], {
                    account: creator.account,
                })
            ).to.be.rejectedWith("Invalid track ID");
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
    });

    describe("Race Entry", function () {
        it("Should allow racer to enter with valid rat", async function () {
            const { raceManager, creator, racer1, raceToken, entryFee } =
                await loadFixture(deployContractsFixture);

            await raceManager.write.createRace([1, raceToken.address, entryFee], {
                account: creator.account,
            });

            await raceManager.write.enterRace([0n, 1n], { account: racer1.account });

            const entries = await raceManager.read.getRaceEntries([0n]);
            expect(entries).to.have.lengthOf(1);
        });

        it("Should prevent rat from entering multiple active races", async function () {
            const { raceManager, creator, racer1, raceToken, entryFee } =
                await loadFixture(deployContractsFixture);

            await raceManager.write.createRace([1, raceToken.address, entryFee], {
                account: creator.account,
            });
            await raceManager.write.createRace([2, raceToken.address, entryFee], {
                account: creator.account,
            });

            await raceManager.write.enterRace([0n, 1n], { account: racer1.account });

            await expect(
                raceManager.write.enterRace([1n, 1n], { account: racer1.account })
            ).to.be.rejectedWith("Rat already in active race");
        });

        it("Should change race status to Full when 6th racer enters", async function () {
            const { raceManager, creator, racers, raceToken, entryFee } =
                await loadFixture(deployContractsFixture);

            await raceManager.write.createRace([1, raceToken.address, entryFee], {
                account: creator.account,
            });

            for (let i = 0; i < 6; i++) {
                await raceManager.write.enterRace([0n, BigInt(i + 1)], {
                    account: racers[i].account,
                });
            }

            const race = await raceManager.read.getRace([0n]);
            expect(race.status).to.equal(1); // Full
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
                await raceManager.write.enterRace([0n, BigInt(i + 1)], {
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
        });

        it("Should revert when non-participant tries to start", async function () {
            const { raceManager, other } = await loadFixture(fillRaceFixture);

            await expect(
                raceManager.write.startRace([0n], { account: other.account })
            ).to.be.rejectedWith("Must be a participant");
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
                await raceManager.write.enterRace([0n, BigInt(i + 1)], {
                    account: racers[i].account,
                });
            }

            await raceManager.write.startRace([0n], { account: racers[0].account });

            return fixture;
        }

        it("Should allow anyone to finish race", async function () {
            const { raceManager, other } = await loadFixture(startedRaceFixture);

            const winningOrder = [1n, 2n, 3n, 4n, 5n, 6n];
            await raceManager.write.finishRace([0n, winningOrder], {
                account: other.account,
            });

            const race = await raceManager.read.getRace([0n]);
            expect(race.status).to.equal(3); // Finished
        });

        it("Should distribute prizes correctly (50/30/20)", async function () {
            const { raceManager, creator, racers, raceToken, entryFee } =
                await loadFixture(startedRaceFixture);

            const totalPool = entryFee * 6n;
            const creatorFee = (totalPool * 10n) / 100n;
            const remainingPool = totalPool - creatorFee;

            const expectedPrizes = [
                (remainingPool * 50n) / 100n,
                (remainingPool * 30n) / 100n,
                (remainingPool * 20n) / 100n,
            ];

            const balancesBefore = await Promise.all(
                racers.slice(0, 3).map((r) => raceToken.read.balanceOf([r.account.address]))
            );

            const winningOrder = [1n, 2n, 3n, 4n, 5n, 6n];
            await raceManager.write.finishRace([0n, winningOrder], {
                account: racers[0].account,
            });

            const balancesAfter = await Promise.all(
                racers.slice(0, 3).map((r) => raceToken.read.balanceOf([r.account.address]))
            );

            for (let i = 0; i < 3; i++) {
                expect(balancesAfter[i] - balancesBefore[i]).to.equal(expectedPrizes[i]);
            }
        });

        it("Should release rats after race finishes", async function () {
            const { raceManager, racers } = await loadFixture(startedRaceFixture);

            expect(await raceManager.read.isRatRacing([1n])).to.be.true;

            const winningOrder = [1n, 2n, 3n, 4n, 5n, 6n];
            await raceManager.write.finishRace([0n, winningOrder], {
                account: racers[0].account,
            });

            expect(await raceManager.read.isRatRacing([1n])).to.be.false;
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

        it("Should refund all entrants when cancelled", async function () {
            const { raceManager, creator, racer1, racer2, raceToken, entryFee } =
                await loadFixture(deployContractsFixture);

            await raceManager.write.createRace([1, raceToken.address, entryFee], {
                account: creator.account,
            });

            const racer1BalanceBefore = await raceToken.read.balanceOf([
                racer1.account.address,
            ]);

            await raceManager.write.enterRace([0n, 1n], { account: racer1.account });
            await raceManager.write.enterRace([0n, 2n], { account: racer2.account });

            await raceManager.write.cancelRace([0n], { account: creator.account });

            const racer1BalanceAfter = await raceToken.read.balanceOf([
                racer1.account.address,
            ]);

            expect(racer1BalanceAfter).to.equal(racer1BalanceBefore);
        });

        it("Should revert when non-creator tries to cancel", async function () {
            const { raceManager, creator, other, raceToken, entryFee } =
                await loadFixture(deployContractsFixture);

            await raceManager.write.createRace([1, raceToken.address, entryFee], {
                account: creator.account,
            });

            await expect(
                raceManager.write.cancelRace([0n], { account: other.account })
            ).to.be.rejectedWith("Only creator can cancel");
        });
    });

    describe("Global Rat Locking", function () {
        it("Should prevent rat from entering multiple races", async function () {
            const { raceManager, creator, racer1, raceToken, entryFee } =
                await loadFixture(deployContractsFixture);

            await raceManager.write.createRace([1, raceToken.address, entryFee], {
                account: creator.account,
            });
            await raceManager.write.createRace([2, raceToken.address, entryFee], {
                account: creator.account,
            });

            await raceManager.write.enterRace([0n, 1n], { account: racer1.account });

            await expect(
                raceManager.write.enterRace([1n, 1n], { account: racer1.account })
            ).to.be.rejectedWith("Rat already in active race");
        });

        it("Should allow rat to enter new race after previous finishes", async function () {
            const { raceManager, creator, racers, racer1, raceToken, entryFee } =
                await loadFixture(deployContractsFixture);

            await raceManager.write.createRace([1, raceToken.address, entryFee], {
                account: creator.account,
            });

            for (let i = 0; i < 6; i++) {
                await raceManager.write.enterRace([0n, BigInt(i + 1)], {
                    account: racers[i].account,
                });
            }

            await raceManager.write.startRace([0n], { account: racers[0].account });

            const winningOrder = [1n, 2n, 3n, 4n, 5n, 6n];
            await raceManager.write.finishRace([0n, winningOrder], {
                account: racers[0].account,
            });

            expect(await raceManager.read.isRatRacing([1n])).to.be.false;

            await raceManager.write.createRace([2, raceToken.address, entryFee], {
                account: creator.account,
            });

            await raceManager.write.enterRace([1n, 1n], { account: racer1.account });
            expect(await raceManager.read.isRatRacing([1n])).to.be.true;
        });
    });

    describe("Multi-Token Support", function () {
        it("Should work with any ERC20 token", async function () {
            const { raceManager, creator, entryFee } =
                await loadFixture(deployContractsFixture);

            const customToken = await hre.viem.deployContract("RaceToken", []);

            await raceManager.write.createRace([1, customToken.address, entryFee], {
                account: creator.account,
            });

            const race = await raceManager.read.getRace([0n]);
            expect(race.entryToken).to.equal(getAddress(customToken.address));
        });
    });
});

