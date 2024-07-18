import "@nomicfoundation/hardhat-verify";
import { artifacts, ethers, run } from 'hardhat';

async function main() {

    const args: any[] = [
        "0xAa6Cf267D26121D4176413D80e0e851558aa6736" // coston MatchResultVerification
    ]
    
    const flareBetContract = await ethers.deployContract("OIBetShowcase", args);
    console.log("OIBetShowcase deployed to:", flareBetContract.target);

    console.log("Sleep for 30 sec...");
    await new Promise(r => setTimeout(r, 30000));
    console.log("Continue...");

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