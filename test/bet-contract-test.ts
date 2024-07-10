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
        event.choice1,
        event.choice2,
        event.choice3,
        event.initialBets1,
        event.initialBets2,
        event.initialBets3,
        ethers.parseUnits(event.initialPool.toString(), "ether")
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

  // before(async () => {
    
  //   const [signer1] = await ethers.getSigners();
  //   const balance = await ethers.provider.getBalance(signer1.address);
  //   console.log("Signer1:", signer1.address);
  //   console.log("Balance:", balance.toString());

  //   flareBetContract = await ethers.deployContract("OIBetShowcase", []);

  //   for (const event of sampleData) {
  //     const txInst = await flareBetContract.createSportEvent(
  //       event.match,
  //       event.timestamp,
  //       event.duration,
  //       event.sport,
  //       event.team1,
  //       event.team2,
  //       event.draw,
  //       event.oddsTeam1,
  //       event.oddsTeam2,
  //       event.oddsDraw,
  //       ethers.parseUnits(event.stake, "ether")
  //     );

  //     const added = await txInst.wait();
  //     // console.log("Added:" + event.match + " hash: ", added.hash);
  //     // console.log("Results", added.logs[0].args);
  //     const startOfDay = Math.floor(
  //       event.timestamp - (event.timestamp % 86400)
  //     );
  //     eventDates.push(startOfDay);
  //     eventUIIDs.push(added.logs[0].args[0]);
  //   }
  //   console.log("Added uuids length:", eventUIIDs.length);
  // });
  
  // it("Should survive multiple bets", async () => {
  //   for (let a = 0; a < eventUIIDs.length - 1; a++) {
  //     for (let i = 0; i < 250; i++) {
  //       //random number between 1 and 100
  //       const amount = Math.floor(Math.random() * 100) + 1;

  //       const voteAmount = ethers.parseUnits(amount.toString(), "ether");
  //       // random choice 0 1 2
        
  //       // weight of the choice
  //       const choice = getWeightedChoice([1,7,2]);

  //       const uid = eventUIIDs[a];

  //       const dataBefore = await flareBetContract.getSportEventFromUUID(uid);
  //       if (dataBefore.startTime > Math.floor(Date.now() / 1000)) {
  //         continue;
  //       }
  //       const poolSize = Number(dataBefore.poolAmount) / 10 ** 18;
  //       const choiceA = Number(dataBefore.choices[0][2]) / 10 ** 18;
  //       const choiceB = Number(dataBefore.choices[1][2]) / 10 ** 18;
  //       const choiceC = Number(dataBefore.choices[2][2]) / 10 ** 18;
  //       const factorA = Number(dataBefore.choices[0][3]) / 1000;
  //       const factorB = Number(dataBefore.choices[1][3]) / 1000;
  //       const factorC = Number(dataBefore.choices[2][3]) / 1000;
  //       console.log("Sport Event - before, poolSize:", poolSize);
  //       console.log("Sport Event - before, choice A:", choiceA);
  //       console.log("Sport Event - before, choice B:", choiceB);
  //       console.log("Sport Event - before, choice C:", choiceC);
  //       console.log("Sport Event - before, factor A:", factorA);
  //       console.log("Sport Event - before, factor B:", factorB);
  //       console.log("Sport Event - before, factor C:", factorC);

  //       expect(poolSize).to.be.greaterThan(0);
  //       expect(poolSize).to.be.greaterThan(choiceA);
  //       expect(poolSize).to.be.greaterThan(choiceB);
  //       expect(poolSize).to.be.greaterThan(choiceC);

  //       const tranData = await flareBetContract.placeBet(uid, choice, {
  //         value: voteAmount,
  //       });

  //       const added = await tranData.wait();
  //       const args = added.logs[0].args;
  //       await ethers.provider.send("hardhat_setBalance", [
  //         args[2].toString(),
  //         "0x1000000000000000000000000000000000000",
  //       ]);
  //       console.log(
  //         `Bet ${args[0]} placed on ${uid} for ${
  //           Number(args[3]) / 10 ** 18
  //         } on choice ${args[4]}`
  //       );
  //     }
  //   }
  // });
});


function getWeightedChoice(weights: number[]) {
  const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);

  // Generate a random number in the range of 0 to totalWeight
  let randomNum = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    // Subtract the weight of choice i from randomNum
    randomNum -= weights[i];

    // If randomNum falls below 0, select choice i
    if (randomNum < 0) {
      return i;
    }
  }
}

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
      "initialBets1": 4,
      "initialBets2": 12,
      "initialBets3": 25,
      "initialPool": "800"
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