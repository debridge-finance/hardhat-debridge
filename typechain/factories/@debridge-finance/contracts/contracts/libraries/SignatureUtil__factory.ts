/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../common";
import type {
  SignatureUtil,
  SignatureUtilInterface,
} from "../../../../../@debridge-finance/contracts/contracts/libraries/SignatureUtil";

const _abi = [
  {
    inputs: [],
    name: "SignatureInvalidLength",
    type: "error",
  },
  {
    inputs: [],
    name: "SignatureInvalidV",
    type: "error",
  },
  {
    inputs: [],
    name: "WrongArgumentLength",
    type: "error",
  },
];

const _bytecode =
  "0x60566037600b82828239805160001a607314602a57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea2646970667358221220e7a826afa97a1b9ca3a49291e6118814ced42a51ce1453c717043c291ed8904b64736f6c63430008070033";

type SignatureUtilConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SignatureUtilConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class SignatureUtil__factory extends ContractFactory {
  constructor(...args: SignatureUtilConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<SignatureUtil> {
    return super.deploy(overrides || {}) as Promise<SignatureUtil>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): SignatureUtil {
    return super.attach(address) as SignatureUtil;
  }
  override connect(signer: Signer): SignatureUtil__factory {
    return super.connect(signer) as SignatureUtil__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SignatureUtilInterface {
    return new utils.Interface(_abi) as SignatureUtilInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): SignatureUtil {
    return new Contract(address, _abi, signerOrProvider) as SignatureUtil;
  }
}
