import "@typechain/hardhat";
// import "@debridge-finance/hardhat-debridge";
import "./src"

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.7",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    }
  },
};
