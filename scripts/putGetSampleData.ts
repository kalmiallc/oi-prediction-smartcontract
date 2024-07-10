import "@nomicfoundation/hardhat-verify";
import { ethers } from "hardhat";
import { OIBetShowcaseContract } from "../typechain-types";
import crypto from "crypto";
import { Sports } from "../test/listOfSports";

async function main() {
  const contractAddress = "0x97C72b91F953cC6142ebA598fa376B80fbACA1C2";
  const contractIst: OIBetShowcaseContract = await ethers.getContractAt(
    "OIBetShowcase",
    contractAddress
  );

  await getSportEventsData('Soccer', new Date('2024-07-02'), contractIst);
  // await placeBet(
  //   "0x48a553bff85aba4849256e25520f266bd9506fa58e7206acbed25b253c73db52",
  //   10,
  //   0,
  //   contractIst
  // );

  // await getBetData(4, contractIst);
  await getEventByUid("Italy - Brazil", 1720009222, Sports.Football, contractIst);
}
main().then(() => process.exit(0));

async function getSportEventsData(
  sport: string,
  date: Date,
  contractIst: OIBetShowcaseContract
) {
  const dateTimestamp = date.getTime() / 1000;
  const startOfDay = Math.floor(dateTimestamp - (dateTimestamp % 86400));
  console.log("Start of day", startOfDay);
  console.log("Sport", sport);

  const startOfDayEvents = await contractIst.getSportEventsByDateAndSport(
    startOfDay,
    sport
  );
  console.log("Events", startOfDayEvents);
  console.log("Events length", startOfDayEvents.length);
  for (const event of startOfDayEvents) {
    console.log("Event", event);
    console.log("Event start time:", new Date(Number(event[2]) * 1000));
  }
}

async function placeBet(
  uid: string,
  amount: number,
  choice: number,
  contractIst: OIBetShowcaseContract
) {
  const txInst = await contractIst.placeBet(uid, choice, {
    value: ethers.parseEther(amount.toString()),
  });
  const added = await txInst.wait();
  console.log("placed bet" + " hash: ", added.hash);
  console.log("Results", added.logs);
}
async function getBetData(id: number, contractIst: OIBetShowcaseContract) {
  const data = await contractIst.betsById(id, 0); //need to pass array index.
  const betAmount = Number(data[3]) / 10 ** 18;
  const winMultiplier = Number(data[4]) / 1000;
  const approximateWin = betAmount * winMultiplier;
  console.log("Bet amount", betAmount);
  console.log("Multiplier", winMultiplier)
  console.log("Approximate win amount", approximateWin);
  
}

async function getEventByUid(
  title: string,
  startTime: Number,
  sport: Sports,
  contractIst: OIBetShowcaseContract
) {
  const itemsKeccak = createUid(sport, title, startTime);

  const data = await contractIst.getSportEventFromUUID(itemsKeccak);
  console.log("Data", data);
}
export function createUid(sport: Sports, title: string, startTime: Number) {
  const sportIndex = Object.keys(Sports).indexOf(sport);
  console.log("Sport index for: ", sport, sportIndex);

  const itemsKeccak = ethers.solidityPackedKeccak256(
    ['string', 'uint256', 'uint8'],
    [title, startTime, sportIndex]
  );
  return itemsKeccak;
}

