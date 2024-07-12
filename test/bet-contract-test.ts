import { ethers } from "hardhat";
import { Sports } from "./listOfSports";

let timestamp = Math.ceil(new Date().getTime() / 1000);

describe("Flare bet contract", function () {
  let owner, executor, account1, account2, BC;
  let EVENTS;

  before(async () => {
    await hre.network.provider.send("hardhat_reset");
  });

  beforeEach(async () => {
    [owner, executor, account1, account2] = await ethers.getSigners();

    BC = await ethers.deployContract("OIBetShowcase", []);

    EVENTS = getEvents();
    for (const event of EVENTS) {
      const txInst = await BC.createSportEvent(
        event.match,
        convertStartTime(event.startTime),
        Object.keys(Sports).indexOf(event.sport),
        [event.choice1, event.choice2, event.choice3],
        [event.initialBets1, event.initialBets2, event.initialBets3],
        ethers.parseUnits(event.initialPool.toString(), "ether"),
        {value: ethers.parseUnits(event.initialPool.toString(), "ether")}
      );
      await txInst.wait();  
    }
  });

  it("Verify sport event creation", async () => {
    const event0 = EVENTS[0];
    const startTime = convertStartTime(event0.startTime);
    const sportId = Object.keys(Sports).indexOf(event0.sport);
    const uid = await BC.generateUID(
      event0.match, 
      startTime,
      sportId
    );

    const sportEvent = await BC.sportEvents(uid);
    expect(sportEvent[0]).to.equal(uid);
    expect(sportEvent[1]).to.equal(event0.match);
    expect(sportEvent[2]).to.equal(startTime);
    expect(sportEvent[3]).to.equal(sportId);
    expect(sportEvent[4]).to.equal(ethers.parseUnits(event0.initialPool, "ether"));
    expect(sportEvent[5]).to.equal(0);
  });

  it("Check expected return", async () => {
    const event0 = EVENTS[0];
    const startTime = convertStartTime(event0.startTime);
    const sportId = Object.keys(Sports).indexOf(event0.sport);
    const uid = await BC.generateUID(
      event0.match, 
      startTime,
      sportId
    );

    let betAmount = ethers.parseUnits("5", "ether");
    let tx;
    let result;
    let sportEvent;

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    expect(result).to.equal(ethers.parseUnits("13.56", "ether"));

    await expect(BC.placeBet(uid, 4, {value: betAmount})).to.be.revertedWith(`Invalid choice`);

    // Bet and decrease weight on choiceId = 0
    tx = await BC.placeBet(uid, 0, {value: betAmount});
    await tx.wait();

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    expect(result).to.equal(ethers.parseUnits("10.49", "ether"));

    // Bet and decrease weight on choiceId = 0
    tx = await BC.placeBet(uid, 0, {value: betAmount});
    await tx.wait();

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    expect(result).to.equal(ethers.parseUnits("9.125", "ether"));
    result = await BC.calculateAproximateBetReturn(betAmount, 1, uid);
    expect(result).to.equal(ethers.parseUnits("14.85", "ether"));
    result = await BC.calculateAproximateBetReturn(betAmount, 2, uid);
    expect(result).to.equal(ethers.parseUnits("14.85", "ether"));

    // Bet and decrease weight on choiceId = 1
    tx = await BC.placeBet(uid, 1, {value: betAmount});
    await tx.wait();

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    expect(result).to.equal(ethers.parseUnits("9.52", "ether"));
    result = await BC.calculateAproximateBetReturn(betAmount, 1, uid);
    expect(result).to.equal(ethers.parseUnits("11.17", "ether"));
    result = await BC.calculateAproximateBetReturn(betAmount, 2, uid);
    expect(result).to.equal(ethers.parseUnits("15.495", "ether"));

    // Get event data
    // sportEvent = await BC.sportEvents(uid);
    // console.log(ethers.formatUnits(sportEvent[4], "ether"));

    let choiceData;
    // choiceData = await BC.getEventChoiceData(uid, 0);
    // console.log(ethers.formatUnits(choiceData[2], "ether"));

    // choiceData = await BC.getEventChoiceData(uid, 1);
    // console.log(ethers.formatUnits(choiceData[2], "ether"));

    // choiceData = await BC.getEventChoiceData(uid, 2);
    // console.log(ethers.formatUnits(choiceData[2], "ether"));

    // Place another 10 bets on choice 0
    for(let i = 0; i < 10; i++) {
      tx = await BC.placeBet(uid, 0, {value: betAmount});
      await tx.wait();
    }

    // result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    // console.log(ethers.formatUnits(result, "ether"));

    // choiceData = await BC.getEventChoiceData(uid, 0);
    // console.log(ethers.formatUnits(choiceData[2], "ether"));

    // sportEvent = await BC.sportEvents(uid);
    // console.log(ethers.formatUnits(sportEvent[4], "ether"));

    betAmount = ethers.parseUnits("40", "ether");

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    // console.log(ethers.formatUnits(result, "ether"));

    tx = await BC.placeBet(uid, 0, {value: betAmount});
    await tx.wait();

    // Try claiming before result drawn
    const lastBetId = await BC.betId();

    await expect(BC.claimWinnings(666)).to.be.revertedWith(`Invalid betId`);
    await expect(BC.claimWinnings(1)).to.be.revertedWith(`Result not drawn`);

    // Manually set winner
    const txWin = await BC.setWinner(uid, 1);
    await txWin.wait();

    await expect(BC.connect(account1).claimWinnings(1)).to.be.revertedWith(`You are not the bettor`);

    // BetId 3 is not a winner
    let claimTx;
    for(let i = 1; i <= lastBetId; i++) {
      if (i == 3) {
        await expect(BC.claimWinnings(i)).to.be.revertedWith(`Not winner`);
      } else {
        claimTx = await BC.claimWinnings(i);
        await claimTx.wait();
      }
    }
    
  });
});

export function convertStartTime(startTime: string) {
  return new Date(startTime).getTime() / 1000; // Convert startTime to Unix epoch
}

function getEvents() {
  return [
    {
      "date": "2024-07-27",
      "time": "11:00",
      "startTime": "2024-07-27T11:00:00Z",
      "gender": "Men",
      "group": "A",
      "teams": ["Australia", "Winner OQT ESP"],
      "uid": "10ba0fdf-630a-479b-8907-7a7d81778efe",
      "match": "Men - Group A - Australia vs Winner OQT ESP",
      "sport": "Basketball3x3",
      "choice1": "France",
      "choice2": "Germany",
      "choice3": "Draw",
      "initialBets1": 10,
      "initialBets2": 10,
      "initialBets3": 10,
      "initialPool": "100"
    },
    {
      "date": "2024-07-27",
      "time": "13:30",
      "startTime": "2024-07-27T13:30:00Z",
      "gender": "Men",
      "group": "B",
      "teams": ["Germany", "Japan"],
      "sport": "Basketball3x3",
      "uid": "7dd2bbd5-3943-407a-829e-8feaa3822b2b",
      "match": "Men - Group B - Germany vs Japan",
      "choice1": "France",
      "choice2": "Germany",
      "choice3": "Draw",
      "initialBets1": 4,
      "initialBets2": 12,
      "initialBets3": 25,
      "initialPool": "800"
    }
  ];
}