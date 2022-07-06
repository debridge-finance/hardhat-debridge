import { deployMockContract } from "ethereum-waffle";
import { BigNumber, ContractReceipt, ContractTransaction, Overrides, Signer } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CallProxy,
  DeBridgeGate,
  MockWeth,
  MockWeth__factory,
} from "../typechain";
import { SentEvent } from "../typechain/IDeBridgeGate";

import { Flags, IRawSubmissionAutoParamsTo, ISubmissionAutoParamsTo, SubmissionAutoParamsFrom, SubmissionAutoParamsTo } from "./structs";

function _check(hre: HardhatRuntimeEnvironment) {
  if (!["hardhat", "localhost"].includes(hre.network.name)) {
    throw new Error("deBridge.emulator is intended for hardhat network only");
  }
}

//
// Define the state so we can ease deBridgeSimulator usage
//

interface InternalEmulatorState {
  currentGate?: DeBridgeGate;
}

const STATE: InternalEmulatorState = {};

//
// deployGate
//

export type DeployDebridgeGateFunction = () => Promise<DeBridgeGate>;

function getRandom(min: number, max: number, decimals = 18) {
  const denominator = 4;
  min *= 10 ** denominator;
  max *= 10 ** denominator;
  decimals -= denominator;
  const v = Math.floor(Math.random() * (max - min + 1) + min);
  return BigNumber.from("10").pow(decimals).mul(v);
}

export function makeDeployGate(
  hre: HardhatRuntimeEnvironment
): DeployDebridgeGateFunction {
  _check(hre);

  return async function deployGate(): Promise<DeBridgeGate> {
    // setup WETH9 for wrapping
    const Weth = (await hre.ethers.getContractFactory(
      "MockWeth"
    )) as MockWeth__factory;
    const weth = (await Weth.deploy("wrapped Ether", "wETH")) as MockWeth;
    await weth.deployed();

    const DeBridgeGateFactory = await hre.ethers.getContractFactory(
      "DeBridgeGate"
    );
    const deBridgeGate = (await hre.upgrades.deployProxy(DeBridgeGateFactory, [
      0,
      weth.address,
    ])) as DeBridgeGate;
    await deBridgeGate.deployed();

    // setup callproxy
    const CallProxyFactory = await hre.ethers.getContractFactory("CallProxy");
    const callProxy = (await hre.upgrades.deployProxy(
      CallProxyFactory
    )) as CallProxy;
    await callProxy.deployed();

    await callProxy.grantRole(
      await callProxy.DEBRIDGE_GATE_ROLE(),
      deBridgeGate.address
    );
    await deBridgeGate.setCallProxy(callProxy.address);

    // setup signature verifier
    const Verifier = await hre.ethers.getContractFactory("SignatureVerifier");
    const signatureVerifierMock = await deployMockContract(
      (await hre.ethers.getSigners())[0],
      [...Verifier.interface.fragments]
    );
    await signatureVerifierMock.mock.submit.returns();

    await deBridgeGate.setSignatureVerifier(signatureVerifierMock.address);

    // setup chain support (loopback)
    await deBridgeGate.setChainSupport(
      hre.ethers.provider.network.chainId,
      true,
      false
    );
    await deBridgeGate.setChainSupport(
      hre.ethers.provider.network.chainId,
      true,
      true
    );

    // setup global fee
    // For emulation purposes, we pick a random value from a range so that
    // developers consuming this plugin will cultivate a good habit of not
    // relying on hardcoded values and will explicitly query it from the contract
    // This helps to avoid a protocol rust:
    // "If a protocol is designed with a flexible structure, but that
    // flexibility is never used in practice, some implementation is going
    // to assume it is constant"
    // (c) https://blog.cloudflare.com/why-tls-1-3-isnt-in-browsers-yet/
    const [minRndFee, maxRndFee] = [0.001, 0.5];
    const randomGlobalFee = getRandom(minRndFee, maxRndFee, 18 /*decimals*/);
    await deBridgeGate.updateGlobalFee(randomGlobalFee, 10 /*globalTransferFeeBps*/);

    STATE.currentGate = deBridgeGate;
    return deBridgeGate;
  };
}

//
// autoClaim
//

export type AutoClaimFunction = (
  opts?: GetClaimArgsOpts,
  overrides?: Overrides & { from?: string | Promise<string> }
) => Promise<ContractTransaction>;

export function makeAutoClaimFunction(
  hre: HardhatRuntimeEnvironment
): AutoClaimFunction {
  _check(hre);

  return async function makeAutoClaim(
    opts: GetClaimArgsOpts = {},
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction> {
    opts.gate = opts.gate || STATE.currentGate;
    if (!opts.gate) {
      throw new Error("DeBridgeGate not yet deployed");
    }

    return await opts.gate.claim(
      ...await hre.deBridge.emulator.getClaimArgs(opts, overrides)
    )
  }
}

//
// getClaimArgs
//

type ClaimArgs = Parameters<DeBridgeGate["claim"]>;

interface GetClaimArgsOpts {
  gate?: DeBridgeGate;
  sendTransactionReceipt?: ContractReceipt;
  sentEvent?: SentEvent
}

export type GetClaimArgsFunction = (
  opts?: GetClaimArgsOpts,
  overrides?: Overrides & { from?: string | Promise<string> }
) => Promise<ClaimArgs>;

export function makeGetClaimArgs(
  hre: HardhatRuntimeEnvironment
): GetClaimArgsFunction {
  _check(hre);

  return async function getClaimArgs(
    opts: GetClaimArgsOpts = {},
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ClaimArgs> {
    opts.gate = opts.gate || STATE.currentGate;
    if (!opts.gate) {
      throw new Error("DeBridgeGate not yet deployed");
    }

    // find the last Sent() event emitted
    const sentEvent = opts.sentEvent ||
     (await opts.gate.queryFilter(opts.gate.filters.Sent()))
      .reverse()
      .find((ev) =>
        opts.sendTransactionReceipt
          ? ev.transactionHash === opts.sendTransactionReceipt.transactionHash
          : true
      );
    if (!sentEvent) {
      throw new Error("Sent() event not found");
    }

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
    const autoParamsFrom = defaultAbiCoder.encode(
      [SubmissionAutoParamsFrom],
      [autoParamsFromValues]
    );

    return [
      sentEvent.args.debridgeId,
      sentEvent.args.amount,
      hre.ethers.provider.network.chainId,
      sentEvent.args.receiver,
      sentEvent.args.nonce,
      "0x123456",
      autoParamsFrom,
      overrides || undefined
    ];
  };
}

//
// decodeSubmissionAutoParamsToFunction
//

export type DecodeSubmissionAutoParamsToFunction = (event: SentEvent) => ISubmissionAutoParamsTo;

export function makeDecodeSubmissionAutoParamsToFunction(hre: HardhatRuntimeEnvironment): Function {
  return (event: SentEvent): ISubmissionAutoParamsTo => {
    const struct = defaultAbiCoder.decode(
      [SubmissionAutoParamsTo],
      event.args.autoParams
    )[0] as IRawSubmissionAutoParamsTo;

    return {
      ...struct,
      flags: new Flags(struct.flags.toNumber()),
    };
  }
}