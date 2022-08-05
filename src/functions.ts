import {
  Context,
  DummySignatureStorage,
  Submission,
} from "@debridge-finance/desdk/lib/evm";
import { deployMockContract } from "ethereum-waffle";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CallProxy,
  DeBridgeGate,
  MockWeth,
  MockWeth__factory,
} from "../typechain";
import { SentEvent } from "../typechain/@debridge-finance/contracts/contracts/interfaces/IDeBridgeGate";

import { getRandom } from "./utils";

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
  submissions: { [key: string]: Submission };
  latestScannedBlock: number;
}

const STATE: InternalEmulatorState = {
  submissions: {},
  latestScannedBlock: 0,
};

//
// deployGate
//

export type DeployDebridgeGateFunction = () => Promise<DeBridgeGate>;

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

interface EmulatorClaimContext {
  gate?: DeBridgeGate;
  txHash?: string;
}

export type AutoClaimFunction = (
  ctx?: EmulatorClaimContext
) => Promise<string[]>;

export function makeAutoClaimFunction(
  hre: HardhatRuntimeEnvironment
): AutoClaimFunction {
  _check(hre);

  return async function autoClaim(
    claimContext: EmulatorClaimContext = {}
  ): Promise<string[]> {
    const gate = claimContext.gate || STATE.currentGate;
    if (!gate) {
      throw new Error("DeBridgeGate not yet deployed");
    }

    const evmContext = {
      deBridgeGateAddress: gate.address,
      provider: gate.provider,
      signatureStorage: new DummySignatureStorage(),
    };

    // pull all submissions (either from specific tx or from all recent blocks)
    const submissions = claimContext.txHash
      ? await getSubmissions(claimContext.txHash, evmContext)
      : await pullSubmissions(gate, evmContext);

    // find those that were not tracked yet
    const claims = await Promise.all(
      submissions.map(async (submission) => submission.toEVMClaim(evmContext))
    );
    const submissionStates = await Promise.all(
      claims.map(async (claim) => claim.isClaimed())
    );

    // find out which submissions must be claimed
    const claimsToExecute = claims.filter(
      (_, k) => submissionStates[k] === false
    );

    // claim them all
    return Promise.all(
      claimsToExecute.map(async (claim) => {
        const args = await claim.getClaimArgs();
        await gate.claim(...args);
        return claim.submissionId.toString();
      })
    );
  };
}

async function getSubmissions(
  txHash: string,
  ctx: Context
): Promise<Submission[]> {
  return Submission.findAll(txHash, ctx);
}

async function pullSubmissions(
  gate: DeBridgeGate,
  ctx: Context
): Promise<Submission[]> {
  const events = await gate.queryFilter(
    gate.filters.Sent(),
    STATE.latestScannedBlock
  );
  if (events.length) {
    STATE.latestScannedBlock = events[events.length - 1].blockNumber - 1;
  }
  return Promise.all(
    events.map(
      async (s: SentEvent): Promise<Submission> =>
        Submission.find(s.transactionHash, s.args.submissionId, ctx) as Promise<
          Submission
        >
    )
  );
}
