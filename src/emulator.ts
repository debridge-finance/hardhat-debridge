import {
  ClaimAutoParams,
  Context as EVMContext,
  DummySignatureStorage,
  SendAutoParams,
  Submission,
} from "@debridge-finance/desdk/lib/evm";
import chalk from "chalk";
import { BigNumber, Event, utils } from "ethers";

import { DeBridgeGate } from "../typechain";
import {
  ClaimedEvent,
  SentEvent,
} from "../typechain/@debridge-finance/contracts/contracts/interfaces/IDeBridgeGate";

import { collapseArgs } from "./utils";

interface DeBridgeEmulatorOpts {
  minExFee: BigNumber;
  autoClaim: boolean;
}

const DEFAULT_OPTS: DeBridgeEmulatorOpts = {
  minExFee: BigNumber.from("0"),
  autoClaim: true,
};

export class DeBridgeEmulator {
  private evmCtx: EVMContext;

  constructor(
    private gate: DeBridgeGate,
    private opts: DeBridgeEmulatorOpts = DEFAULT_OPTS
  ) {
    this.evmCtx = {
      provider: this.gate.provider,
      deBridgeGateAddress: this.gate.address,
      signatureStorage: new DummySignatureStorage(),
    };

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
      eventArgsObj.autoParams = collapseArgs(
        SendAutoParams.decode(event.args.autoParams)
      );
      eventArgsObj.autoParams.flags = eventArgsObj.autoParams.flags.toHumanReadableString();
    } else if (event.event === "Claimed") {
      eventArgsObj.autoParams = collapseArgs(
        ClaimAutoParams.decode(event.args.autoParams)
      );
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

    console.log(
      `[Txn: ${obj.transactionHash}] Captured event: ${chalk.green(obj.event)}`,
      eventArgsObj
    );

    // handle the Sent event, process automatic claim if applicable
    if (obj.event === "Sent") {
      console.log(
        `[Txn: ${obj.transactionHash}] Captured submission: ${chalk.red(
          (obj as SentEvent).args.submissionId
        )}`
      );

      if (this.opts.autoClaim) {
        await this.tryClaim(obj as SentEvent);
      } else {
        console.warn("Automatic claiming is disabled");
      }
    }
  }

  private async tryClaim(sentEvent: SentEvent) {
    const submission = await Submission.find(
      sentEvent.transactionHash,
      sentEvent.args.submissionId,
      this.evmCtx
    );
    if (!submission) {
      throw new Error("Unexpected: submission not found");
    }

    const exFee = BigNumber.from(submission.autoParams.executionFee);
    if (exFee.lt(this.opts.minExFee)) {
      console.log(
        `[SubmissionId: ${chalk.red(
          submission.submissionId
        )}] Included execution fee (${submission.autoParams.executionFee.toString()}) is less than the given minimum (${this.opts.minExFee.toString()}), skipping automatic claim`
      );
      return;
    }

    console.log(
      `[SubmissionId: ${chalk.red(
        submission.submissionId
      )}] Signing and broadcasting a txn to claim the submission`
    );

    try {
      const claim = await submission.toEVMClaim(this.evmCtx);
      const args = await claim.getEncodedArgs();
      const claimTx = await this.gate.claim(...args, {
        gasLimit: 8_000_000,
      });

      const rcp = await claimTx.wait();

      console.log(
        `[SubmissionId: ${chalk.red(
          submission.submissionId
        )}] Claim txn has been included: ${rcp.transactionHash}`
      );
    } catch (e) {
      const txHash = (e as any)?.data?.txHash as string;
      const errMessage = (e as any)?.data?.message || e;
      console.error(
        `[SubmissionId: ${chalk.red(
          submission.submissionId
        )}] Claim txn failed: ${errMessage}`,
        txHash
      );
    }
  }
}
