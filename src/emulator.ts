import chalk from "chalk";
import { BigNumber, Event, utils } from "ethers";

import { DeBridgeGate } from "../typechain";
import { ClaimedEvent, SentEvent } from "../typechain/DeBridgeGate";

import {
  collapseArgs,
  convertSentAutoParamsToClaimAutoParams,
  parseAutoParamsFrom,
  parseAutoParamsTo,
} from "./utils";

interface DeBridgeEmulatorOpts {
  minExFee: BigNumber;
  autoClaim: boolean;
}

const DEFAULT_OPTS: DeBridgeEmulatorOpts = {
  minExFee: BigNumber.from("0"),
  autoClaim: true,
};

export class DeBridgeEmulator {
  constructor(
    private gate: DeBridgeGate,
    private opts: DeBridgeEmulatorOpts = DEFAULT_OPTS
  ) {
    console.info("DeBridge emulator is starting...");
    if (opts.autoClaim) {
      console.info(
        "Will automatically construct and broadcast txns to the destination chain to claim messages coming to the deBridgeGate contract on the origin chain"
      );
      if (opts.minExFee.gt("0")) {
        console.info(
          chalk.yellow(
            `Only messages with at least ${chalk.bold(
              utils.formatEther(opts.minExFee)
            )} ETH included in the executionFee will be automatically claimed`
          )
        );
      }
    } else {
      console.warn(
        chalk.yellow("Will not construct txns to claim messages either")
      );
    }
  }

  public run() {
    this.gate.on("*", async (obj: Event) => this.listener(obj));
    console.info("DeBridge emulator is waiting for events...");
  }

  private unwindEventArgs(event: SentEvent | ClaimedEvent): object {
    // cleanup args: by default they are represented as an Array, where args
    // are represented both as array keys and as array/object properties
    // To make a cleaner output, we leave only object properties
    const eventArgsObj = collapseArgs(event.args) as any;

    if (event.event === "Sent") {
      eventArgsObj.feeParams = collapseArgs(eventArgsObj.feeParams);
      eventArgsObj.autoParams = parseAutoParamsTo(event as SentEvent);
      eventArgsObj.autoParams.flags = eventArgsObj.autoParams.flags.toHumanReadableString();
    } else if (event.event === "Claimed") {
      eventArgsObj.autoParams = parseAutoParamsFrom(event as ClaimedEvent);
      eventArgsObj.autoParams.flags = eventArgsObj.autoParams.flags.toHumanReadableString();
    }

    return eventArgsObj;
  }

  private async listener(obj: Event) {
    if (!["Sent", "Claimed"].includes(obj?.event || "")) {
      return;
    }
    await this.handleEvent(obj as SentEvent | ClaimedEvent);
  }

  private async handleEvent(obj: SentEvent | ClaimedEvent) {
    // cleanup args: by default they are represented as an Array, where args
    // are represented both as array keys and as array/object properties
    // To make a cleaner output, we leave only object properties
    const eventArgsObj = this.unwindEventArgs(obj);

    console.log(`Captured event: ${chalk.green(obj.event)}`, eventArgsObj);

    // handle the Sent event, process automatic claim if applicable
    if (obj.event === "Sent") {
      await this.tryClaim(obj as SentEvent);
    }
  }

  private async tryClaim(sentEvent: SentEvent) {
    console.log(
      `📣 Captured submission: ${chalk.red(sentEvent.args.submissionId)}`
    );

    const autoParams = parseAutoParamsTo(sentEvent);

    if (autoParams.executionFee.lt(this.opts.minExFee)) {
      console.log(
        `[SubmissionId: ${chalk.red(
          sentEvent.args.submissionId
        )}] Broadcasted execution fee (${autoParams.executionFee.toString()}) is less than minimum (${this.opts.minExFee.toString()}), skipping automatic claim`
      );
      return;
    }

    console.log(
      `[SubmissionId: \x1b[31m${sentEvent.args.submissionId}\x1b[0m] Signing and broadcasting a claim txn`
    );

    try {
      const claimTx = await this.gate.claim(
        sentEvent.args.debridgeId,
        sentEvent.args.amount,
        (await this.gate.provider.getNetwork()).chainId,
        sentEvent.args.receiver,
        sentEvent.args.nonce,
        "0x123456", // signatureVerifier is mocked, accepts arbitrary data
        convertSentAutoParamsToClaimAutoParams(sentEvent),
        {
          gasLimit: 8_000_000,
        }
      );

      await claimTx.wait();
    } catch (e) {
      const txHash = (e as any)?.data?.txHash as string;
      const errMessage = (e as any)?.data?.message || e;
      console.error(
        `[SubmissionId: \x1b[31m${sentEvent.args.submissionId}\x1b[0m] Claim txn failed: ${errMessage}`,
        txHash
      );
    }
  }
}
