import 'hardhat/types/runtime';

import type { DeBridge } from '.';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    deBridge: DeBridge;
  }
}
