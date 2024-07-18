import "@nomicfoundation/hardhat-verify";
import { artifacts, ethers, run } from 'hardhat';

async function main() {

    const args: any[] = [
        "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3" // coston state connector
    ]
    
    const verContract = await ethers.deployContract("MatchResultVerification", args);
    console.log("MatchResultVerification deployed to:", verContract.target);

    console.log("Sleep for 30 sec...");
    await new Promise(r => setTimeout(r, 30000));
    console.log("Continue...");

    try {

        const result = await run("verify:verify", {
            address: verContract.target,
            constructorArguments: args,
        })

        console.log(result)
    } catch (e: any) {
        console.log(e.message)
    }
    console.log("Deployed contract at:", verContract.target)

}
main().then(() => process.exit(0))