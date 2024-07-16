import "@nomicfoundation/hardhat-verify";
import { ethers } from "hardhat";
import { OIBetShowcaseContract } from "../typechain-types";
import sampleData from "./sampleSportEvents.json";
import { Sports } from "../test/listOfSports";

async function main() {
  const contractAddress = "0x93Ff41ac89E20fcbb947324042501B5f9dB6a782";
  const contractIst: OIBetShowcaseContract = await ethers.getContractAt(
    "OIBetShowcase",
    contractAddress
  );

  await fillSampleData(contractIst);
}
main().then(() => process.exit(0));

async function fillSampleData(contractIst: OIBetShowcaseContract) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  for (const event of sampleData) {
    const gender = 0;
    const sport = Object.keys(Sports).indexOf(event.sport);
    const choices = [event.choice1, event.choice2];
    const initialBets = [event.initialBets1, event.initialBets2];

    const eventUID = ethers.keccak256(
      abiCoder.encode(
        ['uint32', 'uint8', 'uint256', 'string'],
        [ Object.keys(Sports).indexOf(event.sport), gender, convertStartTime(event.startTime), event.match ]
      )
    );

    if (
      false == ["Basketball", "Basketball3x3", "Tennis", "Volleyball", "Badminton"].includes(event.sport)
    ) {
      choices.push(event.choice3);
      initialBets.push(event.initialBets3);
    }

    const txInst = await contractIst.createSportEvent(
      event.match,
      convertStartTime(event.startTime),
      gender,
      sport,
      choices,
      initialBets,
      ethers.parseUnits(event.initialPool.toString(), "ether"), // Initial pool value
      eventUID,
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


