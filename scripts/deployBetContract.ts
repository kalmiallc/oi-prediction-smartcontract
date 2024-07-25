import "@nomicfoundation/hardhat-verify";
import { artifacts, ethers, run } from 'hardhat';

async function main() {

    const args: any[] = [
        // "0x21bb744BCc53d78b904c2E374EC460C086908537", // coston OI Token
        "0x82AF954d52Bb42F5075c392323D983415fe68672", // songbird OI Token
        // "0xAa6Cf267D26121D4176413D80e0e851558aa6736" // coston MatchResultVerification
        "0x97C72b91F953cC6142ebA598fa376B80fbACA1C2" // songbird MatchResultVerification
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