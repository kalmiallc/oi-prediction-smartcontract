// type of our contract
import { OIBetShowcaseContract } from "../typechain-types";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";

const oiBetShowcaseContract: OIBetShowcaseContract =
  artifacts.require("OIBetShowcase");

describe("Flare bet data contract", function () {
  let owner: any;
  let flareBetContract: OIBetShowcaseContract;
  const title = "Test Event";
  const sport = 5; // Football
  const choiceA = "Team A";
  const choiceB = "Team B";
  const choiceC = "Draw";
  const initialPool = ethers.parseUnits("1000", "ether");
  const initialVotesA = 5;
  const initialVotesB = 15;
  const initialVotesC = 30;
  const title2 = "Test Event 2";
  const title3 = "Test Event 3";
  const startTime = Math.floor(Date.now() + 4000 / 1000); // Current timestamp in seconds
  const startTime3 = Math.floor(Date.now() / 1000); // Current timestamp in seconds
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
  
      // Create an event
      const tranData = flareBetContract.createSportEvent(
        title,
        startTime,
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
        .withArgs(anyValue, title, sport, startTime);

      const tranDat2 = flareBetContract.createSportEvent(
        title2,
        startTime,
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
        .withArgs(anyValue, title2, sport, startTime);

      const tranData3 = flareBetContract.createSportEvent(
        title3,
        startTime3,
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
        .withArgs(anyValue, title3, sport,  startTime3);
    });

    it("Should retrieve events by date and sport", async () => {
      const events1 = await flareBetContract.getSportEventsByDateAndSport(
        startOfDay1,
        sport
      );
      expect(events1.length).to.equal(2);
      const total = events1[0].poolAmount;
      const choices = events1[0].choices;
      // sum choices totalBetsAmount
      let totalBetsAmount = 0;
      for (let i = 0; i < choices.length; i++) {
        totalBetsAmount += Number(choices[i].totalBetsAmount);
      }
      expect(Number(totalBetsAmount)).to.equal(Number(total));

      const events2 = await flareBetContract.getSportEventsByDateAndSport(
        startOfDay3,
        sport
      );
      expect(events2.length).to.equal(1);
    });

    describe("Betting on an event", function () {
      let initialChoices: any;
      it("Should bet on an event", async () => {
        const events = await flareBetContract.getSportEventsByDateAndSport(
          startOfDay1,
          sport
        );
        const event = events[0];
        expect(event.title).to.equal(title);
        initialChoices = event.choices;
        const voter = owner.address;
        const voteAmount = ethers.parseUnits("10", "ether");
        const choice = 1;
        const uid = event.uid;

        const tranData = flareBetContract.placeBet(uid, choice, {
          value: voteAmount,
        });
        await expect(tranData)
          .to.emit(flareBetContract, "BetPlaced")
          .withArgs(anyValue, uid, voter, voteAmount, choice);

        const updatedEvents = await flareBetContract.getSportEventsByDateAndSport(
          startOfDay1,
          sport
        );
        const updatedEvent = updatedEvents[0];
        const updatedChoices = updatedEvent.choices;
        expect(updatedChoices[1].totalBetsAmount).not.to.equal(initialChoices[1].totalBetsAmount);
        expect(updatedChoices[1].currentMultiplier).not.to.equal(initialChoices[1].currentMultiplier);
        console.log("initialChoices", initialChoices);
        console.log("updatedChoices", updatedChoices);
      });

      it("Should retrieve votes for an event", async () => {
        const latestBlock = await ethers.provider.getBlock("latest");
        const currentTimestamp = latestBlock?.timestamp || 0;
        const startOfDay = currentTimestamp  - (currentTimestamp % 86400);
        const bets = await flareBetContract.getBetsByDate(startOfDay);       
        expect(bets).to.not.be.empty;
        expect(bets.length).to.equal(1);
        expect(bets[0].id).to.equal(1);
        expect(bets[0].betAmount).to.equal(ethers.parseUnits("10", "ether"));
        expect(bets[0].winMultiplier).to.be.greaterThan(1);
      });
    });
  });
});
