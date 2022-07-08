import { BigNumber, Event } from "ethers";

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
}

export class DeBridgeEmulator {
  constructor(
    private gate: DeBridgeGate,
    private opts: DeBridgeEmulatorOpts = { minExFee: BigNumber.from("0") }
  ) {}

  public run() {
    this.gate.on("*", async (obj: Event) => this.listener(obj));
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

    console.log(`Captured event: \x1b[32m ${obj.event} \x1b[0m`, eventArgsObj);

    // handle the Sent event, process automatic claim if applicable
    if (obj.event === "Sent") {
      await this.tryClaim(obj as SentEvent);
    }
  }

  private async tryClaim(sentEvent: SentEvent) {
    console.log(
      `📣 Captured submission: \x1b[31m ${sentEvent.args.submissionId} \x1b[0m`
    );

    const autoParams = parseAutoParamsTo(sentEvent);

    if (autoParams.executionFee.lt(this.opts.minExFee)) {
      console.log(
        `[SubmissionId: \x1b[31m${
          sentEvent.args.submissionId
        }\x1b[0m] Broadcasted execution fee (${autoParams.executionFee.toString()}) is less than minimum (${this.opts.minExFee.toString()}), skipping automatic claim`
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
