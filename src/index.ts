import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import { Event } from "ethers";
import { extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";

import { DeployDebridgeGateFunction, GetClaimArgsFunction } from "./functions";
import "./type-extensions";

export interface DeBridge {
  emulator: {
    deployGate: DeployDebridgeGateFunction;
    getClaimArgs: GetClaimArgsFunction;
  };
}

extendEnvironment((hre) => {
  hre.deBridge = lazyObject(
    (): DeBridge => {
      const { makeDeployGate, makeGetClaimArgs } = require("./functions");

      return {
        emulator: {
          deployGate: makeDeployGate(hre),
          getClaimArgs: makeGetClaimArgs(hre),
        },
      };
    }
  );
});

task(
  "debridge-deploy-emulator",
  "Deploys deBridgeGate emulator contract with pre-configured defaults"
).setAction(async (args, hre) => {
  const gate = await hre.deBridge.emulator.deployGate();

  console.log(`DeBridgeGate emulator has been deployed at ${gate.address}`);
});

task(
  "debridge-run-emulator",
  "Deploys deBridgeGate emulator contract and runs a foreground claiming emulation service"
)
  .addOptionalParam(
    "minExecutionFee",
    "Claiming emulation service will automatically construct and broadcast claiming txns with this minimum execution fee included",
    "0"
  )
  .setAction(async (args, hre) => {
    const gate = await hre.deBridge.emulator.deployGate();

    console.log(
      `DeBridgeGate emulator has been deployed at \x1b[31m ${gate.address} \x1b[0m`
    );

    gate.on("*", (obj: Event) => {
      if (
        obj.event !== undefined &&
        obj.args !== undefined &&
        obj.blockNumber > gate.deployTransaction.blockNumber!
      ) {
        const eventArgsObj = {} as any;
        Object.keys(obj.args)
          .filter((key) => !/^\d+$/.test(key))
          .forEach((key) => {
            eventArgsObj[key] = obj.args![key];
          });
        console.log(
          `Captured event: \x1b[32m ${obj.event} \x1b[0m`,
          eventArgsObj
        );
      }
    });

    // this is needed to keep task running as a fg daemon
    return new Promise(() => {});
  });
