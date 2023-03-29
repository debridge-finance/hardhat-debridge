/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  ICallProxy,
  ICallProxyInterface,
} from "../../../../../@debridge-finance/contracts/contracts/interfaces/ICallProxy";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_reserveAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_receiver",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "_flags",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_nativeSender",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "_chainIdFrom",
        type: "uint256",
      },
    ],
    name: "call",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
      {
        internalType: "address",
        name: "_reserveAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_receiver",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "_flags",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_nativeSender",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "_chainIdFrom",
        type: "uint256",
      },
    ],
    name: "callERC20",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "submissionChainIdFrom",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "submissionNativeSender",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class ICallProxy__factory {
  static readonly abi = _abi;
  static createInterface(): ICallProxyInterface {
    return new utils.Interface(_abi) as ICallProxyInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ICallProxy {
    return new Contract(address, _abi, signerOrProvider) as ICallProxy;
  }
}
