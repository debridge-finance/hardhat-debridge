# hardhat-debridge

**Easily test your integrations with [deBridge](https://debridge.finance).** A plugin for [Hardhat](https://hardhat.org) provides the toolkit for emulating the flow of the bridge, including onchain contracts and off-chain validation activity.

## Rationale

[deBridge](https://debridge.finance) is a generic messaging and cross-chain interoperability protocol that enables decentralized transfers of arbitrary data and assets between various blockchains. Given the complexity of the protocol itself and the number of different components involved in the flow, **integration development** and its sufficient **unit testing** may by very tricky as it typically requires a complete infrastructure setup.

`hardhat-debridge` provides the toolkit for creating lightweight and blazing-fast emulation environment on top of [hardhat network](https://hardhat.org/hardhat-network), behaving close to how the mainnet setup of the deBridge infrastructure does.

In a nutshell, this plugin is suitable to validate cross-chain interactions as follows:
- developing **unit test cases** for your contracts, or developing **integration test cases** to validate the behavior and the interaction between the contracts intended to reside on the different chains and communicate through the deBridge gate: deBridge infrastructure emulator is a part of a runtime (runtime emulation);
- performing **functional tests** on the deBridge infrastructure emulator running as a local process.

## Installation

Install the package:

```bash
npm install --save-dev @debridge-finance/hardhat-debridge
```

Import the plugin in your `hardhat.config.js`:

```js
require("@debridge-finance/hardhat-debridge");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "@debridge-finance/hardhat-debridge";
```

## Examples

Consider looking into [`debridge-finance/cross-chain-dapp-example`](https://github.com/debridge-finance/) repo representing the complete example of the fictional cross-chain dApp which leverages the deBridge protocol for sending increment commands across chains. Under the hood, that example if excessively covered with simple units tests made possible with the help of this `hardhat-debridge` plugin.

## Writing tests

Import `deBridge` from hardhat:

```ts
import { deBridge } from "hardhat";
```

Use `deBridge.emulation.deployGate()` to deploy the deBridgeGate emulation contract to the current hardhat network. Use `deBridge.emulation.autoClaim()` to invoke the emulation of the bridging process, while the claim txn is being constructed and executed like it has to be on the mainnet.

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
        senderContractChainA = await getSenderContract();
        calleeContractChainB = await getCalleeContract(senderContractChainA.address);
    })

    it("Test Case #1", async () => {
        // Call the sender contract which interacts with the deBridgeGate under the hood
        // asking it to broadcast a message. A message is an instruction to call
        // the callee contract. A call may contain arbitrary values, if the callee
        // contract's ABI is expects them.
        await senderContractChainA.sendValueToChainB(senderContractChainA.VALUE_1, {
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

...