import { Context as EVMContext } from "@debridge-finance/desdk/lib/evm";
import { BigNumber } from "ethers";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { DeBridgeGate } from "../typechain";

import {
  CrossChainCounter,
  CrossChainCounter__factory,
  CrossChainIncrementor,
  CrossChainIncrementor__factory,
} from "../fixture-projects/hardhat-debridge-test-env/typechain/index";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
    contracts: TestSuiteState;
    evmContext: EVMContext;
  }
}

export function useEnvironment(fixtureProjectName: string) {
  beforeEach("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "..", "fixture-projects", fixtureProjectName));
    this.hre = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}

export interface TestSuiteState {
  gate: DeBridgeGate;
  gateProtocolFee: BigNumber;
  counter: CrossChainCounter;
  incrementor: CrossChainIncrementor;
}

// Creates a set of contracts for each test suite (useful for before() and beforeEach())
export async function deployContracts(
  hre: HardhatRuntimeEnvironment
): Promise<TestSuiteState> {
  const gate = await hre.deBridge.emulator.deployGate();

  const Counter = await new CrossChainCounter__factory().connect(
    (await hre.ethers.getSigners())[0]
  );
  const counter = await Counter.deploy(gate.address);

  const Incrementor = await new CrossChainIncrementor__factory().connect(
    (await hre.ethers.getSigners())[0]
  );
  const incrementor = await Incrementor.deploy(
    gate.address,
    hre.ethers.provider.network.chainId,
    counter.address
  );

  await counter.addChainSupport(
    hre.ethers.provider.network.chainId,
    incrementor.address
  );

  return {
    gate,
    gateProtocolFee: await gate.globalFixedNativeFee(),
    counter,
    incrementor,
  };
}
