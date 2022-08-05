import { BigNumber } from "ethers";

export function collapseArgs(obj: any): object {
  // cleanup args: by default they are represented as an Array, where args
  // are represented both as array keys and as array/object properties
  // To make a cleaner output, we leave only object properties
  const eventArgsObj = {} as any;
  Object.keys(obj)
    .filter((key) => !/^\d+$/.test(key))
    .forEach((key) => {
      eventArgsObj[key] = obj[key as any];
    });
  return eventArgsObj;
}

export function getRandom(min: number, max: number, decimals = 18) {
  const denominator = 4;
  min *= 10 ** denominator;
  max *= 10 ** denominator;
  decimals -= denominator;
  const v = Math.floor(Math.random() * (max - min + 1) + min);
  return BigNumber.from("10").pow(decimals).mul(v);
}
