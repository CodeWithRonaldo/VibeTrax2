require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: ".env.local" });

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    mezoTestnet: {
      url: "https://rpc.test.mezo.org",
      chainId: 31611,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
