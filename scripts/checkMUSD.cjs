const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const VIBETRAX_ADDRESS = "0x2AdA3E78d8dB7AA996a7B06BDc90fE4A19356CF7";
const RPC_URL = "https://rpc.test.mezo.org";

const VIBETRAX_ABI = [
  {
    "inputs": [],
    "name": "musd",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const vibetrax = new ethers.Contract(VIBETRAX_ADDRESS, VIBETRAX_ABI, provider);
  
  try {
    const musdAddress = await vibetrax.musd();
    console.log("✓ VibeTrax contract:", VIBETRAX_ADDRESS);
    console.log("✓ MUSD address in VibeTrax:", musdAddress);
    console.log("");
    console.log("Your .env.local has:");
    console.log("  VITE_MUSD_ADDRESS=" + process.env.VITE_MUSD_ADDRESS);
    console.log("");
    
    if (musdAddress.toLowerCase() === process.env.VITE_MUSD_ADDRESS.toLowerCase()) {
      console.log("✓ ADDRESSES MATCH - Configuration is correct");
    } else {
      console.log("✗ ADDRESSES DO NOT MATCH");
      console.log("  Contract expects: " + musdAddress);
      console.log("  .env.local has:  " + process.env.VITE_MUSD_ADDRESS);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main();
