import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import { BigNumber } from "ethers";
import {
  TASK_NODE,
  TASK_NODE_SERVER_READY,
} from "hardhat/builtin-tasks/task-names";
import { extendEnvironment, subtask, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";

import { DeBridgeEmulator } from "./emulator";
import {
  AutoClaimFunction,
  DeployDebridgeGateFunction,
} from "./functions";
import "./type-extensions";

const TASK_DEBRIDGE_DEPLOY_EMULATOR_CONTRACT =
  "debridge-deploy-emulator-contract";
const SUBTASK_DEBRIDGE_DEPLOY_EMULATOR_CONTRACT_AND_RUN_LISTENER =
  "subtask-debrige-deploy-emulator";

let localArgs: any = null;

export interface DeBridge {
  emulator: {
    deployGate: DeployDebridgeGateFunction;
    autoClaim: AutoClaimFunction;
  };
}

extendEnvironment((hre) => {
  hre.deBridge = lazyObject(
    (): DeBridge => {
      const {
        makeDeployGate,
        makeAutoClaimFunction,
      } = require("./functions");

      return {
        emulator: {
          deployGate: makeDeployGate(hre),
          autoClaim: makeAutoClaimFunction(hre),
        },
      };
    }
  );
});

task(
  TASK_DEBRIDGE_DEPLOY_EMULATOR_CONTRACT,
  "Deploys deBridgeGate emulator contract with pre-configured defaults"
).setAction(async (args, hre) => {
  const gate = await hre.deBridge.emulator.deployGate();

  console.log(
    `DeBridgeGate emulator contract has been deployed at \x1b[31m${gate.address}\x1b[0m`
  );

  return gate;
});

subtask(TASK_NODE_SERVER_READY).setAction(async (args, hre, runSuper) => {
  await runSuper(args);

  if (localArgs !== null) {
    await hre.run(localArgs.RUN_TASK, {
      ...localArgs,
    });
  }
});

subtask(SUBTASK_DEBRIDGE_DEPLOY_EMULATOR_CONTRACT_AND_RUN_LISTENER)
  .addOptionalParam(
    "minExecutionFee",
    "Claiming emulation service will automatically construct and broadcast claiming txns with this minimum execution fee included",
    "0"
  )
  .setAction(async (args, hre) => {
    const gate = await hre.run(TASK_DEBRIDGE_DEPLOY_EMULATOR_CONTRACT);
    const emulator = new DeBridgeEmulator(gate, {
      minExFee: BigNumber.from(args.minExecutionFee),
      autoClaim: !args.noAutoClaim,
    });

    emulator.run();

    // this is needed to keep this task running as a fg daemon
    return new Promise(() => {
      /*_*/
    });
  });

task(
  "debridge-run-emulator",
  "Deploys deBridgeGate emulator contract and runs a foreground claiming emulation service"
)
  .addOptionalParam(
    "minExecutionFee",
    "Emulator will automatically construct and broadcast txns that claim messages coming to bridge with this minimum execution fee included",
    "0"
  )
  .addFlag(
    "noAutoClaim",
    "Disables emulator to construct and broadcast txns to claim messages coming to bridge"
  )
  .setAction(async (args, hre) => {
    if (hre.network.name === "hardhat") {
      localArgs = {
        ...args,
        RUN_TASK: SUBTASK_DEBRIDGE_DEPLOY_EMULATOR_CONTRACT_AND_RUN_LISTENER,
      };
      return hre.run(TASK_NODE);
    } else {
      return hre.run(
        SUBTASK_DEBRIDGE_DEPLOY_EMULATOR_CONTRACT_AND_RUN_LISTENER,
        args
      );
    }
  });
