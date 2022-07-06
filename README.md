# hardhat-debridge

**Easily test your integrations with the [deBridge cross-chain protocol](https://debridge.finance).** A plugin for [Hardhat](https://hardhat.org) provides the toolkit for emulating the flow of the bridge, including onchain contracts and off-chain validation activity.

## Rationale

[deBridge](https://debridge.finance) is a generic messaging and cross-chain interoperability protocol that enables decentralized transfers of arbitrary data and assets between various blockchains. Given the complexity of the protocol itself and the number of different components involved in the flow, **integration development** and its sufficient **unit testing** may by very tricky as it typically requires a complete infrastructure setup.

`hardhat-debridge` provides the toolkit for creating lightweight and blazing-fast emulation environment on top of [hardhat network](https://hardhat.org/hardhat-network), behaving close to how the mainnet setup of the deBridge infrastructure does.

In a nutshell, this plugin is suitable to validate cross-chain interactions as follows:
- developing unit test cases for your contracts, where deBridge infrastructure emulator is a part of a runtime (runtime emulation);
- performing functional/integration tests against deBridge infrastructure emulator running as a local process

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

## Making tests

...

## Running the emulator daemon

...