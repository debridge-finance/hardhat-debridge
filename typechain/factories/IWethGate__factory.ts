/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { IWethGate, IWethGateInterface } from "../IWethGate";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class IWethGate__factory {
  static readonly abi = _abi;
  static createInterface(): IWethGateInterface {
    return new utils.Interface(_abi) as IWethGateInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IWethGate {
    return new Contract(address, _abi, signerOrProvider) as IWethGate;
  }
}
