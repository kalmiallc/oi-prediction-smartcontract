// type of our contract
import { OIBetShowcaseContract } from "../../typechain-types";
import { ZeroAddress } from "ethers";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";

const oiBetShowcaseContract: OIBetShowcaseContract =
  artifacts.require("OIBetShowcase");

describe("Flare bet data contract", function () {
  let owner: any;
  let flareBetContract: OIBetShowcaseContract;
  const title = "Test Event";
  const duration = 3600; // 1 hour
  const sport = "Soccer";
  const choiceA = "Team A";
  const choiceB = "Team B";
  const choiceC = "Draw";
  const initialPool = 1000;
  const initialVotesA = 10;
  const initialVotesB = 15;
  const initialVotesC = 35;
  const title2 = "Test Event 2";
  const title3 = "Test Event 3";
  const startTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  const startTime3 = Math.floor(Date.now() + 1000 / 1000); // Current timestamp in seconds
  const startOfDay1 = startTime - (startTime % 86400);
  const startOfDay3 = startTime3 - (startTime3 % 86400);

  before(async () => {
    const [signer1] = await ethers.getSigners();
    owner = signer1;
    // flareBetContract = await oiBetShowcaseContract.new();
    flareBetContract = await ethers.deployContract("OIBetShowcase", []);
  });

  describe("Retrieving bet events", function () {
    before(async () => {
      const ownerAddress = owner.address; // Store the owner address in a separate variable
      await flareBetContract.grantRole(
        ethers.encodeBytes32String("DEFAULT_ADMIN_ROLE"),
        ownerAddress
      );

      const ownerRole = await flareBetContract.hasRole(
        ethers.encodeBytes32String("DEFAULT_ADMIN_ROLE"),
        ownerAddress
      );
      expect(ownerRole).to.equal(true);

      // Create an event
      const tranData = flareBetContract.createSportEvent(
        title,
        startTime,
        duration,
        sport,
        choiceA,
        choiceB,
        choiceC,
        initialVotesA,
        initialVotesB,
        initialVotesC,
        initialPool
      );

      await expect(tranData)
        .to.emit(flareBetContract, "SportEventCreated")
        .withArgs(anyValue, title, startTime);

      const tranDat2 = flareBetContract.createSportEvent(
        title2,
        startTime,
        duration,
        sport,
        choiceA,
        choiceB,
        choiceC,
        initialVotesA,
        initialVotesB,
        initialVotesC,
        initialPool
      );
      await expect(tranDat2)
        .to.emit(flareBetContract, "SportEventCreated")
        .withArgs(anyValue, title2, startTime);

      const tranData3 = flareBetContract.createSportEvent(
        title3,
        startTime3,
        duration,
        sport,
        choiceA,
        choiceB,
        choiceC,
        initialVotesA,
        initialVotesB,
        initialVotesC,
        initialPool
      );
      await expect(tranData3)
        .to.emit(flareBetContract, "SportEventCreated")
        .withArgs(anyValue, title3, startTime3);
    });

    it("Should retrieve events by date", async () => {
      const events = await flareBetContract.getSportEventsByDate(startOfDay1);
      expect(events.length).to.equal(2);
      expect(events[0].title).to.equal(title);
      expect(events[1].title).to.equal(title2);
      console.log(events[0]);
    });

    it("Should retrieve events by date and sport", async () => {
      const events1 = await flareBetContract.getSportEventsByDateAndSport(
        startOfDay1,
        sport
      );
      expect(events1.length).to.equal(2);

      const events2 = await flareBetContract.getSportEventsByDateAndSport(
        startOfDay3,
        sport
      );
      expect(events2.length).to.equal(1);
    });

    describe("Voting on an event", function () {
      it("Should vote on an event", async () => {
        const events = await flareBetContract.getSportEventsByDateAndSport(
          startOfDay1,
          sport
        );
        const event = events[0];
        expect(event.title).to.equal(title);
        const voter = owner.address;
        const voteAmount = 100;
        const choice = 1;
        const uid = event.uuid;

        const tranData = flareBetContract.placeBet(uid, choice, {
          value: voteAmount,
        });
        await expect(tranData)
          .to.emit(flareBetContract, "BetPlaced")
          .withArgs(anyValue, uid, voter, voteAmount, choice);
      });

      it("Should retrieve votes for an event", async () => {
        const latestBlock = await ethers.provider.getBlock("latest");
        const currentTimestamp = latestBlock?.timestamp || 0;
        const startOfDay = currentTimestamp  - (currentTimestamp % 86400);
        const bets = await flareBetContract.getBetsByDate(startOfDay);       
        expect(bets).to.not.be.empty;
        expect(bets.length).to.equal(1);
        expect(bets[0].id).to.equal(1);
        expect(bets[0].betAmount).to.equal(100);
      });
    });
  });
});
