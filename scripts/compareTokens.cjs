const { ethers } = require("ethers");

const ADDRESSES = [
  "0x637e22A1EBbca50EA2d34027c238317fD10003eB",
  "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"
];
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
  
  for (const addr of ADDRESSES) {
    const token = new ethers.Contract(addr, ERC20_ABI, provider);
    
    try {
      const [name, symbol, decimals] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals()
      ]);
      
      console.log("\nAddress:", addr);
      console.log("Name:", name);
      console.log("Symbol:", symbol);
      console.log("Decimals:", decimals);
    } catch (e) {
      console.log("\nAddress:", addr);
      console.log("✗ Error - Invalid or not a token contract");
    }
  }
}

main();
