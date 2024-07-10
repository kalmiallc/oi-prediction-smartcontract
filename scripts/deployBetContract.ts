import "@nomicfoundation/hardhat-verify";
import { artifacts, ethers, run } from 'hardhat';
import { SimpleFtsoExampleContract } from '../typechain-types';
const SimpleFtsoExample: SimpleFtsoExampleContract = artifacts.require('SimpleFtsoExample');


async function main() {


    const args: any[] = []
    
    const flareBetContract = await ethers.deployContract("OIBetShowcase", []);
    console.log("OIBetShowcase deployed to:", flareBetContract.target);
    try {

        const result = await run("verify:verify", {
            address: flareBetContract.target,
            constructorArguments: args,
        })

        console.log(result)
    } catch (e: any) {
        console.log(e.message)
    }
    console.log("Deployed contract at:", flareBetContract.target)

}
main().then(() => process.exit(0))