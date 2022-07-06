import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import { Event, Signer } from "ethers";
import { extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { SentEvent } from "../typechain/IDeBridgeGate";
import { DeployDebridgeGateFunction, GetClaimArgsFunction, DecodeSubmissionAutoParamsToFunction as DecodeSubmissionAutoParamsToFunction, AutoClaimFunction } from "./functions";
import "./type-extensions";

export interface DeBridge {
  emulator: {
    deployGate: DeployDebridgeGateFunction;
    autoClaim: AutoClaimFunction,
    getClaimArgs: GetClaimArgsFunction;
  };

  utils: {
    decodeSubmissionAutoParamsTo: DecodeSubmissionAutoParamsToFunction;
  };
}

extendEnvironment((hre) => {
  hre.deBridge = lazyObject(
    (): DeBridge => {
      const { makeDeployGate, makeGetClaimArgs, makeDecodeSubmissionAutoParamsToFunction, makeAutoClaimFunction } = require("./functions");

      return {
        emulator: {
          deployGate: makeDeployGate(hre),
          autoClaim: makeAutoClaimFunction(hre),
          getClaimArgs: makeGetClaimArgs(hre),
        },
        utils: {
          decodeSubmissionAutoParamsTo: makeDecodeSubmissionAutoParamsToFunction(hre)
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

    // we need to listen for '*' rather than 'event' because the latter doesn't daemonize the process for some reason
    gate.on("*", async (obj: Event) => {

      // take only Event objects
      if (
        obj.event !== undefined &&
        obj.args !== undefined &&
        obj.blockNumber > gate.deployTransaction.blockNumber!
      ) {

        // cleanup args: by default they are represented as an Array, where args
        // are represented both as array keys and as array/object properties
        // To make a cleaner output, we leave only object properties
        const eventArgsObj = {} as any;
        Object.keys(obj.args)
          .filter((key) => !/^\d+$/.test(key))
          .forEach((key) => {
            eventArgsObj[key] = obj.args![key];
          });

        // print only these events for cleaner output
        if (['Sent', 'Claimed'].includes(obj.event))
          console.log(
            `Captured event: \x1b[32m ${obj.event} \x1b[0m`,
            eventArgsObj
          );

        // handle the Sent event, process automatic claim if applicable
        if (obj.event == 'Sent') {
          const sentEvent = obj as SentEvent;
          console.log(`📣 Captured submission: \x1b[31m ${sentEvent.args.submissionId} \x1b[0m`)

          const autoParams = hre.deBridge.utils.decodeSubmissionAutoParamsTo(sentEvent);

          if (autoParams.executionFee.lt(args.minExecutionFee)) {
            console.log(`[SubmissionId: \x1b[31m${sentEvent.args.submissionId}\x1b[0m] Broadcasted execution fee (${autoParams.executionFee.toString()}) is less than minimum (${args.minExecutionFee}), skipping automatic claim`)
            return;
          }

          console.log(`[SubmissionId: \x1b[31m${sentEvent.args.submissionId}\x1b[0m] Signing and broadcasting a claim txn`)

          try {
            const claimTx = await gate.claim(
              ... await hre.deBridge.emulator.getClaimArgs({
                sentEvent: sentEvent
              }, {
                gasLimit: 8_000_000
              })
            );

            await claimTx.wait();
          }
          catch (e) {
            const txHash = (<any>e)?.data?.txHash as string;
            const errMessage = (<any>e)?.data?.message || e
            console.error(`[SubmissionId: \x1b[31m${sentEvent.args.submissionId}\x1b[0m] Claim txn failed: ${errMessage}`, txHash)
          }
        }
      }
    });

    // this is needed to keep this task running as a fg daemon
    return new Promise(() => {/*_*/});
  });