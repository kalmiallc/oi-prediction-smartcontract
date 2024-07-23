import { ethers } from "hardhat";
import { Sports } from "./listOfSports";

describe("Flare bet contract", function () {
  let owner, executor, account1, account2, BC, TOKEN, VERIFICATION;
  let EVENTS;

  before(async () => {
    await hre.network.provider.send("hardhat_reset");
  });

  beforeEach(async () => {
    [owner, executor, account1, account2] = await ethers.getSigners();

    VERIFICATION = await ethers.deployContract("DummyVerification", []);
    await VERIFICATION.waitForDeployment();

    TOKEN = await ethers.deployContract("OIToken", ['OI Token', 'OI']);
    await TOKEN.waitForDeployment();

    BC = await ethers.deployContract("OIBetShowcase", [(await TOKEN.getAddress()), (await VERIFICATION.getAddress())]);
    await BC.waitForDeployment();

    // approve
    await TOKEN.approve(await BC.getAddress(), ethers.MaxUint256);
    await TOKEN.transfer(account1.address, ethers.parseUnits("100000", "ether"));
    await TOKEN.connect(account1).approve(await BC.getAddress(), ethers.MaxUint256);

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

    EVENTS = getEvents();
    for (const event of EVENTS) {
      const gender = 0;
      const eventUID = ethers.keccak256(
        abiCoder.encode(
          ['uint32', 'uint8', 'uint256', 'string'],
          [ Object.keys(Sports).indexOf(event.sport), gender, convertStartTime(event.startTime), event.match ]
        )
      );

      const txInst = await BC.createSportEvent(
        event.match, // title
        event.match,
        convertStartTime(event.startTime),
        gender,
        Object.keys(Sports).indexOf(event.sport),
        [event.choice1, event.choice2, event.choice3],
        [event.initialBets1, event.initialBets2, event.initialBets3],
        ethers.parseUnits(event.initialPool.toString(), "ether"),
        eventUID
      );
      await txInst.wait();  
    }
  });

  it("Verify sport event creation", async () => {
    const event0 = EVENTS[0];
    const gender = 0;
    const startTime = convertStartTime(event0.startTime);
    const sportId = Object.keys(Sports).indexOf(event0.sport);
    const uid = await BC.generateUID(
      sportId,
      gender,
      startTime,
      event0.match, 
    );

    const sportEvent = await BC.sportEvents(uid);
    expect(sportEvent[0]).to.equal(uid);
    expect(sportEvent[1]).to.equal(event0.match);
    expect(sportEvent[2]).to.equal(event0.match);
    expect(sportEvent[3]).to.equal(startTime);
    expect(sportEvent[4]).to.equal(sportId);
    expect(sportEvent[5]).to.equal(ethers.parseUnits(event0.initialPool, "ether"));
    expect(sportEvent[6]).to.equal(0);
  });

  it("Check expected return", async () => {
    const event0 = EVENTS[0];
    const gender = 0;
    const startTime = convertStartTime(event0.startTime);
    const sportId = Object.keys(Sports).indexOf(event0.sport);
    const uid = await BC.generateUID(
      sportId,
      gender,
      startTime,
      event0.match, 
    );

    let betAmount = ethers.parseUnits("5", "ether");
    let tx;
    let result;
    let sportEvent;

    // approve
    await TOKEN.approve(await BC.getAddress(), ethers.MaxUint256);

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    expect(result).to.equal(ethers.parseUnits("13.56", "ether"));

    await expect(BC.placeBet(uid, 4, betAmount)).to.be.revertedWith(`Invalid choice`);

    // Bet and decrease weight on choiceId = 0
    tx = await BC.placeBet(uid, 0, betAmount);
    await tx.wait();

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    expect(result).to.equal(ethers.parseUnits("10.49", "ether"));

    // Bet and decrease weight on choiceId = 0
    tx = await BC.placeBet(uid, 0, betAmount);
    await tx.wait();

    result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    expect(result).to.equal(ethers.parseUnits("9.125", "ether"));
    result = await BC.calculateAproximateBetReturn(betAmount, 1, uid);
    expect(result).to.equal(ethers.parseUnits("14.85", "ether"));
    result = await BC.calculateAproximateBetReturn(betAmount, 2, uid);
    expect(result).to.equal(ethers.parseUnits("14.85", "ether"));

    // Bet and decrease weight on choiceId = 1
    tx = await BC.placeBet(uid, 1, betAmount);
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
      tx = await BC.placeBet(uid, 0, betAmount);
      await tx.wait();
    }

    // result = await BC.calculateAproximateBetReturn(betAmount, 0, uid);
    // console.log(ethers.formatUnits(result, "ether"));

    // choiceData = await BC.getEventChoiceData(uid, 0);
    // console.log(ethers.formatUnits(choiceData[2], "ether"));

    // sportEvent = await BC.sportEvents(uid);
    // console.log(ethers.formatUnits(sportEvent[4], "ether"));

    const betAmount2 = ethers.parseUnits("40", "ether");

    result = await BC.calculateAproximateBetReturn(betAmount2, 0, uid);
    // console.log(ethers.formatUnits(result, "ether"));

    tx = await BC.placeBet(uid, 0, betAmount2);
    await tx.wait();

    // Try claiming before result drawn
    const lastBetId = await BC.betId();

    await expect(BC.claimWinnings(666)).to.be.revertedWith(`Invalid betId`);
    await expect(BC.claimWinnings(1)).to.be.revertedWith(`Result not drawn`);

    // Set winner
    const RANDOM_STRING  = "0x000000000000000000000000000000000000000000000000000000000000DEAD";
    const txWin = await BC.finalizeMatch(
      {
        merkleProof: [],
        data: {
          attestationType: RANDOM_STRING,
          sourceId: RANDOM_STRING,
          votingRound: 0,
          lowestUsedTimestamp: 0,
          requestBody: {
            date: startTime,
            sport: sportId,
            gender: gender,
            teams: event0.match
          },
          responseBody: {
            timestamp: startTime,
            result: 1
          }
        }
      } 
    );
    await txWin.wait();

    await expect(BC.connect(account1).claimWinnings(1)).to.be.revertedWith(`You are not the bettor`);

    // BetId 3 is not a winner
    let claimTx;
    let expectedReturn;
    let ownerBalanceBefore;
    let betData;
    for(let i = 1; i <= lastBetId; i++) {
      ownerBalanceBefore = await TOKEN.balanceOf(owner.address);

      if (i == 3) {
        await expect(BC.claimWinnings(i)).to.be.revertedWith(`Not winner`);
      } else {

        betData = await BC.betById(i);

        expectedReturn = BigInt(betData[3] * betData[4]) / BigInt(1000);

        claimTx = await BC.claimWinnings(i);
        await claimTx.wait();

        // Verify that the right amount was claimed and transferred to owner.address
        expect(ownerBalanceBefore + expectedReturn).to.equal(
          await TOKEN.balanceOf(owner.address)
        );
      }
    }
    
  });

  it("Check bets view functions", async () => {
    const gender = 0;
    const uid_event_0 = await BC.generateUID(
      Object.keys(Sports).indexOf(EVENTS[0].sport),
      gender,
      convertStartTime(EVENTS[0].startTime),
      EVENTS[0].match, 
    );

    const uid_event_1 = await BC.generateUID(
      Object.keys(Sports).indexOf(EVENTS[1].sport),
      gender,
      convertStartTime(EVENTS[1].startTime),
      EVENTS[1].match, 
    );

    const betAmount = ethers.parseUnits("5", "ether");

    // Place 10 bets with owner to EVENT 0
    for(let i = 0; i < 10; i++) {
      const tx = await BC.placeBet(uid_event_0, 0, betAmount);
      await tx.wait();
    }

    // Place 20 bets with account1 to EVENT 0
    for(let i = 0; i < 20; i++) {
      const tx = await BC.connect(account1).placeBet(uid_event_0, 1, betAmount);
      await tx.wait();
    }

    // Place 5 bets with owner to EVENT 1
    for(let i = 0; i < 5; i++) {
      const tx = await BC.placeBet(uid_event_1, 0, betAmount);
      await tx.wait();
    }

    // Place 15 bets with account1 to EVENT 1
    for(let i = 0; i < 15; i++) {
      const tx = await BC.connect(account1).placeBet(uid_event_1, 1, betAmount);
      await tx.wait();
    }

    const date_event_0 = convertStartTime(EVENTS[0].date);
    const date_event_1 = convertStartTime(EVENTS[1].date);
    let betRes;

    // EVENT 0 start
    // EVENT 0 start
    // EVENT 0 start

    // Check result of getBetsByDateAndUser
    betRes = await BC.getBetsByDateAndUser(date_event_0, owner.address);
    expect(betRes.length).to.equal(10);

    betRes = await BC.getBetsByDateAndUser(date_event_0, account1.address);
    expect(betRes.length).to.equal(20);

    // Check result of getBetsByDate
    betRes = await BC.getBetsByDate(date_event_0);
    expect(betRes.length).to.equal(30);

    // EVENT 1 start
    // EVENT 1 start
    // EVENT 1 start

    // Check result of getBetsByDateAndUser
    betRes = await BC.getBetsByDateAndUser(date_event_1, owner.address);
    expect(betRes.length).to.equal(5);

    betRes = await BC.getBetsByDateAndUser(date_event_1, account1.address);
    expect(betRes.length).to.equal(15);

    // Check result of getBetsByDate
    betRes = await BC.getBetsByDate(date_event_1);
    expect(betRes.length).to.equal(20);
  });

  it("Return betsByUser 1200 bets in 1 call", async () => {
    const betAmount = ethers.parseUnits("1", "ether");
    const gender = 0;
    const uid_event_0 = await BC.generateUID(
      Object.keys(Sports).indexOf(EVENTS[0].sport),
      gender,
      convertStartTime(EVENTS[0].startTime),
      EVENTS[0].match, 
    );

    // Place 3000 bets with account1 to EVENT 0
    for(let i = 0; i < 3000; i++) {
      const tx = await BC.connect(account1).placeBet(uid_event_0, 1, betAmount);
      await tx.wait();
    }

    const betRes = await BC.getBetsByUserFromTo(account1.address, 0, 1200);
    expect(betRes.length).to.equal(1200);
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
      "date": "2024-07-28",
      "time": "13:30",
      "startTime": "2024-07-28T13:30:00Z",
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