import { Context, DummySignatureStorage, Submission } from "@debridge-finance/desdk/lib/evm";
import { deployMockContract } from "ethereum-waffle";
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Overrides,
} from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CallProxy,
  DeBridgeGate,
  MockWeth,
  MockWeth__factory,
} from "../typechain";
import {
  SentEvent,
} from "../typechain/@debridge-finance/contracts/contracts/interfaces/IDeBridgeGate";

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
    await deBridgeGate.updateGlobalFee(
      randomGlobalFee,
      10 /*globalTransferFeeBps*/
    );

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

  return async function autoClaim(
    opts: GetClaimArgsOpts = {},
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction> {
    opts.gate = opts.gate || STATE.currentGate;
    if (!opts.gate) {
      throw new Error("DeBridgeGate not yet deployed");
    }

    const args = await hre.deBridge.emulator.getClaimArgs(opts, overrides);
    return opts.gate.claim(
      ...args
    );
  };
}

//
// getClaimArgs
//

type ClaimArgs = Parameters<DeBridgeGate["claim"]>

interface GetClaimArgsOpts {
  gate?: DeBridgeGate;
  txHash?: string;
}

export type GetClaimArgsFunction = (
  opts?: GetClaimArgsOpts,
  overrides?: Overrides & { from?: string | Promise<string> }
) => Promise<ClaimArgs>;

async function getSubmission(txHash: string, ctx: Context): Promise<Submission | undefined> {
  const submissions = await Submission.findAll(txHash, ctx)
  if (submissions.length > 0) return submissions[0];
}

async function findLastSubmission(gate: DeBridgeGate, ctx: Context): Promise<Submission | undefined> {
    // find the last Sent() event emitted
    const sentEvent =
      (await gate.queryFilter(gate.filters.Sent()))
        .reverse()[0];

    if (!sentEvent)
      throw new Error("Sent() event not found");

    return Submission.find(
      sentEvent.transactionHash,
      sentEvent.args.submissionId,
      ctx
    );
}

export function makeGetClaimArgs(
  hre: HardhatRuntimeEnvironment
): GetClaimArgsFunction {
  _check(hre);

  return async function getClaimArgs(
    opts: GetClaimArgsOpts = {},
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ClaimArgs> {
    const gate = opts.gate || STATE.currentGate;
    if (!gate) {
      throw new Error("DeBridgeGate not yet deployed");
    }

    const ctx = {
      deBridgeGateAddress: gate.address,
      provider: gate.provider,
      signatureStorage: new DummySignatureStorage()
    };
    const submission = opts.txHash
      ? await getSubmission(opts.txHash, ctx)
      : await findLastSubmission(gate, ctx)

    if (!submission)
      throw new Error("Unexpected: submission not found")

    const claim = await submission.toEVMClaim(ctx);
    const args = await claim.getClaimArgs();

    return [
      ...args,
      overrides || {},
    ];
  };
}
