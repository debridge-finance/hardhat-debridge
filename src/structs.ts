import { BigNumber } from "ethers";
import { ParamType } from "ethers/lib/utils";

export enum Flag {
  UNWRAP_ETH = 0,
  /// @dev Flag to revert if external call fails
  REVERT_IF_EXTERNAL_FAIL = 1,
  /// @dev Flag to call proxy with a sender contract
  PROXY_WITH_SENDER = 2,
  /// @dev Data is hash in DeBridgeGate send method
  SEND_HASHED_DATA = 3,
  /// @dev First 24 bytes from data is gas limit for external call
  SEND_EXTERNAL_CALL_GAS_LIMIT = 4,
  /// @dev Support multi send for externall call
  MULTI_SEND = 5,
}

export class Flags {
  private _flags: number = 0;

  constructor(flags: number) {
    this._flags = flags;
  }

  public setFlags(...flags: Flag[]) {
    flags.forEach((f) => this.setFlag(f));
  }

  public setFlag(flag: Flag) {
    // tslint:disable-next-line:no-bitwise
    this._flags = this._flags | (1 << flag);
  }

  public unsetFlag(flag: Flag) {
    // tslint:disable-next-line:no-bitwise
    this._flags = this._flags & ~(1 << flag);
  }

  public isSet(flag: Flag) {
    // tslint:disable-next-line:no-bitwise
    const v = (this._flags >> flag) & 1;
    return v === 1;
  }

  public toString() {
    return this._flags.toString();
  }
}

export const SubmissionAutoParamsTo = ParamType.from({
  type: "tuple",
  name: "SubmissionAutoParamsTo",
  components: [
    { name: "executionFee", type: "uint256" },
    { name: "flags", type: "uint256" },
    { name: "fallbackAddress", type: "bytes" },
    { name: "data", type: "bytes" },
  ],
});

export interface IRawSubmissionAutoParamsTo {
  executionFee: BigNumber;
  flags: BigNumber;
  fallbackAddress: string;
  data: string;
}

export interface ISubmissionAutoParamsTo {
  executionFee: BigNumber;
  flags: Flags;
  fallbackAddress: string;
  data: string;
}

export const SubmissionAutoParamsFrom = ParamType.from({
  type: "tuple",
  name: "SubmissionAutoParamsFrom",
  components: [
    { name: "executionFee", type: "uint256" },
    { name: "flags", type: "uint256" },
    { name: "fallbackAddress", type: "address" },
    { name: "data", type: "bytes" },
    { name: "nativeSender", type: "bytes" },
  ],
});

export interface IRawSubmissionAutoParamsFrom
  extends IRawSubmissionAutoParamsTo {
  nativeSender: string;
}

export interface ISubmissionAutoParamsFrom extends ISubmissionAutoParamsTo {
  nativeSender: string;
}
