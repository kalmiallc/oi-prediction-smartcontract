import "@nomicfoundation/hardhat-verify";
import { ethers } from "hardhat";
import { OIBetShowcaseContract } from "../typechain-types";
import sampleData from "./sampleSportEvents.json";

async function main() {
  const contractAddress = "0x7eC34DC6f0F6C3939fbE1D0b1041746596495a60";
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

    const added = await txInst.wait();
    console.log("Added:" + event.match + " hash: ", added.hash);
    console.log("Results", added.logs[0].args);
    // return;
  }
}


