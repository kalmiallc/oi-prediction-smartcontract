import "@nomicfoundation/hardhat-verify";
import { ethers } from "hardhat";
import { OIBetShowcaseContract } from "../typechain-types";
import sampleData from "./sampleSportEvents.json";
import { Sports } from "../test/listOfSports";
import { convertStartTime } from "../test/bet-algorithm-test";

async function main() {
  const contractAddress = "0xEbc2388AB1Be3A972d6e919B5d13E9cE012E1D00";
  const contractIst: OIBetShowcaseContract = await ethers.getContractAt(
    "OIBetShowcase",
    contractAddress
  );

  await fillSampleData(contractIst);
  // await grantAdminRole(contractIst);

}
main().then(() => process.exit(0));

async function grantAdminRole(contractIst: OIBetShowcaseContract) {
  const grantRoleTx = await contractIst.grantRole(
    ethers.encodeBytes32String("DEFAULT_ADMIN_ROLE"),
    "0x5f2B7077a7e5B4fdD97cBb56D9aD02a4f326896d"
  );

  const grantRoleResp = await grantRoleTx.wait();
  console.log("Grant Role", grantRoleResp);
  console.log("Admin", await contractIst.DEFAULT_ADMIN_ROLE());
}
async function fillSampleData(contractIst: OIBetShowcaseContract) {
  for (const event of sampleData) {
    const txInst = await contractIst.createSportEvent(
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

    const added = await txInst.wait();
    console.log("Added:" + event.match + " hash: ", added.hash);
    console.log("Results", added.logs[0].args);
    // return;
  }
}


