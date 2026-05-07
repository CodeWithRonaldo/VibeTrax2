const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const MUSD_ADDRESS = "0x637e22A1EBbca50EA2d34027c238317fD10003eB";
const RPC_URL = "https://rpc.test.mezo.org";

// Derive address from PRIVATE_KEY
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const buyerAddress = wallet.address;

const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "name": "balance", "type": "uint256" }
    ],
    "type": "function"
  }
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const musd = new ethers.Contract(MUSD_ADDRESS, ERC20_ABI, provider);
  
  try {
    const balance = await musd.balanceOf(buyerAddress);
    const balanceInMUSD = ethers.formatUnits(balance, 18);
    
    console.log("Buyer address:", buyerAddress);
    console.log("MUSD balance:", balanceInMUSD, "MUSD");
    console.log("Balance in wei:", balance.toString());
    
    if (parseFloat(balanceInMUSD) > 0) {
      console.log("✓ Account has MUSD");
    } else {
      console.log("✗ Account has NO MUSD - this could be the issue!");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main();
