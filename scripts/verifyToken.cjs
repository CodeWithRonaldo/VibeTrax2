const { ethers } = require("ethers");

const MUSD_ADDRESS = "0x637e22A1EBbca50EA2d34027c238317fD10003eB";
const RPC_URL = "https://rpc.test.mezo.org";

const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  }
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const token = new ethers.Contract(MUSD_ADDRESS, ERC20_ABI, provider);
  
  try {
    const [name, symbol, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals()
    ]);
    
    console.log("Token Address:", MUSD_ADDRESS);
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    
    if (symbol === "MUSD") {
      console.log("✓ This is the correct MUSD token for Mezo testnet");
    } else {
      console.log("✗ This may NOT be MUSD - it's " + symbol);
    }
  } catch (e) {
    console.error("✗ Error - Token address may not exist or is invalid:", e.message);
  }
}

main();
