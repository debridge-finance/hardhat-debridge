# hardhat-debridge

**Easily test your integrations with [deBridge](https://debridge.finance).** A plugin for [Hardhat](https://hardhat.org) provides the toolkit to test and emulate dApps built on top of deBridge protocol.

![deBridge emulator schema](Schema.png)

## Rationale

[deBridge](https://debridge.finance) is a generic messaging and cross-chain interoperability protocol that enables decentralized transfers of arbitrary data and assets between various blockchains. Given the complexity of the protocol itself and the number of different components involved in the flow, **integration development** and its sufficient **unit testing** may by very tricky as it typically requires a complete infrastructure setup.

`hardhat-debridge` provides the toolkit for creating lightweight and blazing-fast emulation environment on top of [hardhat network](https://hardhat.org/hardhat-network), behaving close to how the mainnet setup of the deBridge infrastructure does.

In a nutshell, this plugin is suitable to validate cross-chain interactions as follows:
- developing **unit test cases** for your contracts, or developing **integration test cases** to validate the behavior and the interaction between the contracts intended to reside on the different chains and communicate through the deBridge gate: deBridge infrastructure emulator is a part of a runtime (runtime emulation);
- performing **functional tests** on the deBridge infrastructure emulator running as a local process.

## Installation

Install the package:

```bash
npm i --save-dev git@github.com:debridge-finance/hardhat-debridge.git
```

*This plugin is currently a technology preview. We are going to release the final version along with an npm package later this year.*

Import the plugin in your `hardhat.config.ts`:

```ts
import "@debridge-finance/hardhat-debridge";
```

## Examples

Consider looking into [`debridge-finance/debridge-cross-chain-dapp-example`](https://github.com/debridge-finance/debridge-cross-chain-dapp-example) repo representing a complete example of a fictional cross-chain dApp which leverages the deBridge protocol to send calls between its contracts across chains. Under the hood, that example if excessively covered with simple units tests made possible with the help of this `hardhat-debridge` plugin.

## Writing tests

After this plugin is being installed, import `deBridge` object into your test file:

```ts
import { deBridge } from "hardhat";
```

Use `deBridge.emulation.deployGate()` to deploy the deBridgeGate emulation contract to the current hardhat network; then you can point your contracts (that are responsible for invoking `deBridgeGate` contract to pass messages to other chains) to this deployed contract.

Use `deBridge.emulation.autoClaim()` to invoke the emulation of the bridging process: this will construct the claim txn (intended to be broadcasted to the destination chain) and execute it immediately.

Example:

```ts
describe("Test Suite #1", function () {

    let gate: any;
    let senderContractChainA: any;
    let calleeContractChainB: any;

    before(async () => {
        //
        // deploy emulation contract
        //
        gate = await deBridge.emulator.deployGate();

        //
        // deploy the contracts you are willing to test
        //
        senderContractChainA = await deploySenderContract();
        calleeContractChainB = await deployCalleeContract(senderContractChainA.address);
    })

    it("Test Case #1", async () => {
        // Call the sender contract which interacts with the deBridgeGate under the hood
        // asking it to broadcast a message. A message is an instruction to call
        // the callee contract. A call may contain arbitrary values, if the callee
        // contract's ABI is expects them.
        await senderContractChainA.sendValue(senderContractChainA.VALUE_1, {
            value: await gate.globalFixedNativeFee()
        });

        // Invoke the bridging emulation (claim tnx has to be executed automatically)
        // Here, the message constructed by the sender contract will be
        // broadcasted to the same chain and executed by deBridgeGate. During the
        // execution of the message, the deBridgeGate will call the callee contract
        // via deBridgeGate's CallProxy contract.
        await deBridge.emulator.autoClaim();

        // validate that callee contract has been called and received a value
        expect(await calleeContractChainB.receivedValue())
            .to.be.eq(senderContractChainA.VALUE_1)
    });
});
```

## Running the emulator daemon

`hardhat-debridge` plugin comes with the emulator, which deploys the loopback bridge to the currently running node and starts bridging messages coming to bridge back to the same chain.

To create your local test bench:

1. Run the local node in the first terminal, e.g.:
```
❯❯❯ npx hardhat node
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
...
```
2. Run the deBridge emulator in the second terminal, it will deploy a configured loopback bridge and print its address first:
```
❯❯❯ npx hardhat debridge-run-emulator --network localhost
DeBridgeGate emulator contract has been deployed at 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
DeBridge emulator is waiting for events...
...
```
3. In the third terminal, deploy your sender and receiver contracts to the same local node. Of course, these contracts are intended to reside on different chains, but for emulation purposes we use a loopback bridge, which assumes sender and receiver are on the same chain still communicating though the `deBridgeGate` contract.

Start calling your sender contract: you'll see transactions being printed in the first terminal while messages coming to the `deBridgeGate` contract being captured and bridged back in the second terminal.

## deSDK-friendly! 🐶

The emulator itself is based on vanilla contracts that implement the core deBridge protocol, introducing some handy automation for it under the hood. This means that you can use the emulator along with the deBridge SDK and send and track submissions and claims explicitly when necessary.

The only thing to remember is to pass the corresponding context where the emulator is being deployed.

[Consider looking](test/project.test.ts#L165-L186) into how this feature is used by the test cases for the `debridge-hardhat` itself, or inspect the following example:

```ts
// deploy the gate
const gate = await deBridge.emulator.deployGate();

// configure sender and callee contracts
// [...]

// call the contract that interacts with the gate. Mind that we keep
// the transaction hash where the call occurs to find a cross-chain submission
const tx = await senderContractChainA.sendValue(/*[...]*/);
const rcp = await tx.wait();

// NOW,
// instead of calling deBridge.emulator.autoClaim(),
// we are going to manage the submission explicitly

// craft the context deSDK shall work within
const evmContext = {
    // pass the current hardhat network. deSDK is ready to accept it
    provider: hre,

    // pass the custom address of the gate we are interacting with
    deBridgeGateAddress: gate.address,

    // emulated gate works without signatures, so pass a dummy
    signatureStorage: new evm.DummySignatureStorage()
}

// find all submissions that may have occurred within a transaction
const submissions = await evm.Submission.findAll(
    rcp.transactionHash, // <!-- provide the tx hash where the call occurred
    evmContext
);

// we know our contract made only one submission to the gate ,
// but in real life there can be multiple submissions (e.g. send to different
// chains) within one single transactions
const [submission] = submissions;

// claim this submission explicitly
const claim = await submission.toEVMClaim(evmContext);
const args = await claim.getClaimArgs();
await gate.claim(...args);
```

## Questions?

Welcome to the [`#developers-chat`](https://discord.com/channels/875308315700264970/876748142777864202) at the deBridge Discord server.
