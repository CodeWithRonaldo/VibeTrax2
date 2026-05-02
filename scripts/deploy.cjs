const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const musd = "0x637e22A1EBbca50EA2d34027c238317fD10003eB";
  const platformWallet = deployer.address; // change to your platform wallet

  const VibeTrax = await hre.ethers.getContractFactory("VibeTrax");
  const vibetrax = await VibeTrax.deploy(musd, platformWallet);
  await vibetrax.waitForDeployment();

  console.log("VibeTrax deployed to:", await vibetrax.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
