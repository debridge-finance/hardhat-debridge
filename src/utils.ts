import { defaultAbiCoder } from "ethers/lib/utils";

import { ClaimedEvent, SentEvent } from "../typechain/DeBridgeGate";

import {
  Flags,
  IRawSubmissionAutoParamsFrom,
  IRawSubmissionAutoParamsTo,
  ISubmissionAutoParamsFrom,
  ISubmissionAutoParamsTo,
  SubmissionAutoParamsFrom,
  SubmissionAutoParamsTo,
} from "./structs";

export function collapseArgs(args: any[]): object {
  // cleanup args: by default they are represented as an Array, where args
  // are represented both as array keys and as array/object properties
  // To make a cleaner output, we leave only object properties
  const eventArgsObj = {} as any;
  Object.keys(args)
    .filter((key) => !/^\d+$/.test(key))
    .forEach((key) => {
      eventArgsObj[key] = args[key as any];
    });
  return eventArgsObj;
}

export function parseAutoParamsTo(source: SentEvent): ISubmissionAutoParamsTo {
  const struct = collapseArgs(
    defaultAbiCoder.decode([SubmissionAutoParamsTo], source.args.autoParams)[0]
  ) as IRawSubmissionAutoParamsTo;

  return {
    ...struct,
    flags: new Flags(struct.flags.toNumber()),
  };
}

export function parseAutoParamsFrom(
  source: ClaimedEvent
): ISubmissionAutoParamsFrom {
  const struct = collapseArgs(
    defaultAbiCoder.decode(
      [SubmissionAutoParamsFrom],
      source.args.autoParams
    )[0]
  ) as IRawSubmissionAutoParamsFrom;

  return {
    ...struct,
    flags: new Flags(struct.flags.toNumber()),
  };
}

export function encodeAutoParamsFrom(
  params: ISubmissionAutoParamsFrom
): string {
  const autoParamsFromValues = [
    params.executionFee,
    params.flags.toString(),
    params.fallbackAddress,
    params.data,
    params.nativeSender,
  ];
  return defaultAbiCoder.encode(
    [SubmissionAutoParamsFrom],
    [autoParamsFromValues]
  );
}

export function convertSentAutoParamsToClaimAutoParams(
  sentEvent: SentEvent
): string {
  // decode SubmissionAutoParamsTo
  const autoParamsToValues = defaultAbiCoder.decode(
    [SubmissionAutoParamsTo],
    sentEvent.args.autoParams
  )[0];

  // make SubmissionAutoParamsFrom based on SubmissionAutoParamsTo value
  const autoParamsFromValues = [
    ...autoParamsToValues,
    sentEvent.args.nativeSender,
  ];

  return defaultAbiCoder.encode(
    [SubmissionAutoParamsFrom],
    [autoParamsFromValues]
  );
}
