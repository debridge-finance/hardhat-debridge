import {
  Context,
  SignersSignatureStorage,
  Submission,
} from "@debridge-finance/desdk/lib/evm";
import { Contract, ContractFactory, ethers } from "ethers";
import { FunctionFragment } from "ethers/lib/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CallProxy,
  CallProxy__factory,
  DeBridgeGate,
  DeBridgeGate__factory,
  ERC1967Proxy__factory,
  MockSignatureVerifier__factory,
  MockWeth,
  MockWeth__factory,
} from "../typechain";
import { SentEvent } from "../typechain/@debridge-finance/contracts/contracts/interfaces/IDeBridgeGate";

import buildinfo from "./buildinfo";
import { getRandom } from "./utils";

//
// Define the state so we can ease deBridgeSimulator usage
//

interface InternalEmulatorState {
  currentGate?: DeBridgeGate;
  submissions: { [key: string]: Submission };
  latestScannedBlock: number;
  coreInitialized: boolean;
  validators: ethers.Signer[];
}

const STATE: InternalEmulatorState = {
  submissions: {},
  latestScannedBlock: 0,
  coreInitialized: false,
  validators: [],
};

function _check(hre: HardhatRuntimeEnvironment) {
  if (!["hardhat", "localhost"].includes(hre.network.name)) {
    throw new Error("deBridge.emulator is intended for hardhat network only");
  }
}

async function _initializeCore(hre: HardhatRuntimeEnvironment): Promise<void> {
  if (
    !STATE.coreInitialized ||
    // check if hardhat-network has been reset
    (STATE.currentGate &&
      "0x" === (await hre.ethers.provider.getCode(STATE.currentGate?.address)))
  ) {
    // import buildinfo
    const { input, output, solcVersion } = buildinfo;
    await hre.network.provider.request({
      method: "hardhat_addCompilationResult",
      params: [solcVersion, input, output],
    });

    // set validators
    STATE.validators = (await hre.ethers.getSigners()).slice(0, 12);

    // done
    STATE.coreInitialized = true;
  }
}

//
// deployGate
//

export type DeployDebridgeGateFunction = () => Promise<DeBridgeGate>;

export function makeDeployGate(
  hre: HardhatRuntimeEnvironment
): DeployDebridgeGateFunction {
  _check(hre);

  // this is a simple implementation of hardhat-upgrades plugin
  // which puts the impl contract under the ERC1967Proxy umbrella
  // and calls the initialize() method
  async function deployProxified(
    factory: ContractFactory,
    args?: unknown[]
  ): Promise<Contract> {
    // find the initialize() function fragment
    const initializeFuncFragment = factory.interface.fragments.find(
      (fragment) =>
        fragment.name === "initialize" && fragment.type === "function"
    ) as FunctionFragment;
    if (!initializeFuncFragment) {
      throw new Error("Contact does not have the initialize() func");
    }

    // deploy the implementation contract
    const impl = await factory.deploy();
    await impl.deployed();

    // deploy proxy, passing the impl address + the call to the initialize method
    const [signer] = await hre.ethers.getSigners();
    const Proxy = new ERC1967Proxy__factory(signer);
    const proxy = await Proxy.deploy(
      impl.address,
      factory.interface.encodeFunctionData(initializeFuncFragment, args)
    );
    await proxy.deployed();

    return factory.attach(proxy.address);
  }

  return async function deployGate(): Promise<DeBridgeGate> {
    await _initializeCore(hre);
    const [signer] = await hre.ethers.getSigners();

    // setup WETH9 for wrapping
    const Weth = new MockWeth__factory(signer);
    const weth = (await Weth.deploy("wrapped Ether", "wETH")) as MockWeth;
    await weth.deployed();

    const DeBridgeGateFactory = new DeBridgeGate__factory(signer);
    const deBridgeGate = (await deployProxified(DeBridgeGateFactory, [
      0,
      weth.address,
    ])) as DeBridgeGate;
    await deBridgeGate.deployed();

    // setup callproxy
    const CallProxyFactory = new CallProxy__factory(signer);
    const callProxy = (await deployProxified(CallProxyFactory)) as CallProxy;
    await callProxy.deployed();

    await callProxy.grantRole(
      await callProxy.DEBRIDGE_GATE_ROLE(),
      deBridgeGate.address
    );
    await deBridgeGate.setCallProxy(callProxy.address);

    // setup signature verifier
    const Verifier = new MockSignatureVerifier__factory(signer);
    const signatureVerifierMock = await Verifier.deploy();
    await deBridgeGate.setSignatureVerifier(signatureVerifierMock.address);

    // setup chain support (loopback)
    const chainId = await hre.ethers.provider.send("eth_chainId", []);
    await deBridgeGate.setChainSupport(chainId, true, false);
    await deBridgeGate.setChainSupport(chainId, true, true);

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
    await _initializeCore(hre);
    const gate = claimContext.gate || STATE.currentGate;
    if (!gate) {
      throw new Error("DeBridgeGate not yet deployed");
    }

    const evmContext = {
      deBridgeGateAddress: gate.address,
      provider: gate.provider,
      signatureStorage: new SignersSignatureStorage(STATE.validators),
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
        const args = await claim.getEncodedArgs();
        await gate.claim(...args, { gasLimit: 8_000_000 });
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
