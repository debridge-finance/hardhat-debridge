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