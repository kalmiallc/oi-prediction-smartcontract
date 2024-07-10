import { ethers } from "hardhat";

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
        event.timestamp,
        event.duration,
        event.sport,
        event.team1,
        event.team2,
        event.draw,
        event.oddsTeam1,
        event.oddsTeam2,
        event.oddsDraw,
        ethers.parseUnits(event.stake, "ether")
      );
      await txInst.wait();  
    }
  });

  it("Verify sport event creation", async () => {
    const event0 = EVENTS[0];
    const uuid = await BC.generateUUID(event0.match, event0.timestamp);

    const sportEvent = await BC.sportEvents(uuid);
    expect(sportEvent[0]).to.equal(uuid);
    expect(sportEvent[1]).to.equal(event0.match);
    expect(sportEvent[2]).to.equal(event0.timestamp);
    expect(sportEvent[3]).to.equal(event0.duration);
    expect(sportEvent[4]).to.equal(event0.sport);
    expect(sportEvent[5]).to.equal(ethers.parseUnits(event0.stake, "ether"));
    expect(sportEvent[6]).to.equal(0);
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

function getEvents() {
  return [
    {
      "match": "Slovenia - Spain",
      "timestamp": timestamp + 3600,
      "duration": 10800,
      "sport": "Soccer",
      "team1": "Slovenia",
      "team2": "Spain",
      "draw": "Draw",
      "oddsTeam1": 5,
      "oddsTeam2": 15,
      "oddsDraw": 30,
      "stake": "1000"
    },
    {
      "match": "France - Germany",
      "timestamp": timestamp + 3600,
      "duration": 10800,
      "sport": "Soccer",
      "team1": "France",
      "team2": "Germany",
      "draw": "Draw",
      "oddsTeam1": 4,
      "oddsTeam2": 12,
      "oddsDraw": 25,
      "stake": "800"
    }
  ];
}