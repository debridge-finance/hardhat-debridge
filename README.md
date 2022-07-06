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



## Tasks

<_A description of each task added by this plugin. If it just overrides internal
tasks, this may not be needed_>

This plugin creates no additional tasks.

<_or_>

This plugin adds the _example_ task to Hardhat:
```
output of `npx hardhat help example`
```


## Usage

<_A description of how to use this plugin. How to use the tasks if there are any, etc._>

There are no additional steps you need to take for this plugin to work.

Install it and access ethers through the Hardhat Runtime Environment anywhere
you need it (tasks, scripts, tests, etc).
