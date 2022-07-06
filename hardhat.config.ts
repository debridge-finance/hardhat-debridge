import "@typechain/hardhat";

// need to import this package itself
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
