/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PayableOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../../../common";

export interface ICallProxyInterface extends utils.Interface {
  functions: {
    "call(address,address,bytes,uint256,bytes,uint256)": FunctionFragment;
    "callERC20(address,address,address,bytes,uint256,bytes,uint256)": FunctionFragment;
    "submissionChainIdFrom()": FunctionFragment;
    "submissionNativeSender()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "call"
      | "callERC20"
      | "submissionChainIdFrom"
      | "submissionNativeSender"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "call",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "callERC20",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "submissionChainIdFrom",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "submissionNativeSender",
    values?: undefined
  ): string;

  decodeFunctionResult(functionFragment: "call", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "callERC20", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "submissionChainIdFrom",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "submissionNativeSender",
    data: BytesLike
  ): Result;

  events: {};
}

export interface ICallProxy extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ICallProxyInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    call(
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    callERC20(
      _token: PromiseOrValue<string>,
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    submissionChainIdFrom(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    submissionNativeSender(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  call(
    _reserveAddress: PromiseOrValue<string>,
    _receiver: PromiseOrValue<string>,
    _data: PromiseOrValue<BytesLike>,
    _flags: PromiseOrValue<BigNumberish>,
    _nativeSender: PromiseOrValue<BytesLike>,
    _chainIdFrom: PromiseOrValue<BigNumberish>,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callERC20(
    _token: PromiseOrValue<string>,
    _reserveAddress: PromiseOrValue<string>,
    _receiver: PromiseOrValue<string>,
    _data: PromiseOrValue<BytesLike>,
    _flags: PromiseOrValue<BigNumberish>,
    _nativeSender: PromiseOrValue<BytesLike>,
    _chainIdFrom: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  submissionChainIdFrom(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  submissionNativeSender(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    call(
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    callERC20(
      _token: PromiseOrValue<string>,
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    submissionChainIdFrom(overrides?: CallOverrides): Promise<BigNumber>;

    submissionNativeSender(overrides?: CallOverrides): Promise<string>;
  };

  filters: {};

  estimateGas: {
    call(
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    callERC20(
      _token: PromiseOrValue<string>,
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    submissionChainIdFrom(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    submissionNativeSender(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    call(
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    callERC20(
      _token: PromiseOrValue<string>,
      _reserveAddress: PromiseOrValue<string>,
      _receiver: PromiseOrValue<string>,
      _data: PromiseOrValue<BytesLike>,
      _flags: PromiseOrValue<BigNumberish>,
      _nativeSender: PromiseOrValue<BytesLike>,
      _chainIdFrom: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    submissionChainIdFrom(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    submissionNativeSender(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
