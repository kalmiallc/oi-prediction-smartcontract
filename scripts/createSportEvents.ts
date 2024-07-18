import "@nomicfoundation/hardhat-verify";
import { ethers } from "hardhat";
import { OIBetShowcaseContract } from "../typechain-types";

async function main() {
  const contractAddress = "0xD421D62163FC668A45b224D2145F2e2578582F54";
  const contractIst: OIBetShowcaseContract = await ethers.getContractAt(
    "OIBetShowcase",
    contractAddress
  );

  await fillSampleData(contractIst);
}
main().then(() => process.exit(0));

const matchesUrl = "https://oi-flare-proxy-api.vercel.app/events?date=2024-07-27";
// const matchesUrl = "https://oi-flare-proxy-api.vercel.app/events?date=2024-07-27&sport=Football";

async function fillSampleData(contractIst: OIBetShowcaseContract) {
  let res = await fetch(matchesUrl);
  res = await res.json();
  
  let i = 0; 
  for (const event of res) {
    i++;
    // if (i <= 2) {
    //   continue;
    // }
    const choices = event.choices.map(x => x.choice);
    const initialBets = event.choices.map(x => x.initialBet);

    // Override initialPool
    // Override initialPool
    // Override initialPool
    event.initialPool = 10;

    const txInst = await contractIst.createSportEvent(
      event.teams.join(","),
      event.startTime,
      event.genderByIndex,
      event.sportByIndex,
      choices,
      initialBets,
      ethers.parseUnits(event.initialPool.toString(), "ether"), // Initial pool value
      event.uid,
      {value: ethers.parseUnits(event.initialPool.toString(), "ether")}
    );

    const added = await txInst.wait();
    console.log("Added:" + event.match + " hash: ", added.hash);
    console.log("Results", added.logs[0].args);
    // return;
  }
}

export function convertStartTime(startTime: string) {
  return new Date(startTime).getTime() / 1000; // Convert startTime to Unix epoch
}


