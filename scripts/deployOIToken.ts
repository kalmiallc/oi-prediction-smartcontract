import "@nomicfoundation/hardhat-verify";
import { artifacts, ethers, run } from 'hardhat';

async function main() {

    const args: any[] = [
        "OI Token",
        "OI",
    ]
    
    const oiTokenContract = await ethers.deployContract("OIToken", args);
    console.log("OIToken deployed to:", oiTokenContract.target);

    console.log("Sleep for 30 sec...");
    await new Promise(r => setTimeout(r, 30000));
    console.log("Continue...");

    try {

        const result = await run("verify:verify", {
            address: oiTokenContract.target,
            constructorArguments: args,
        })

        console.log(result)
    } catch (e: any) {
        console.log(e.message)
    }
    console.log("Deployed contract at:", oiTokenContract.target)

}
main().then(() => process.exit(0))