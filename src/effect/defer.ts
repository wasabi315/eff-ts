import * as E from "./effect.ts";

class Defer extends E.Effect {
  constructor(public thunk: () => void) {
    super();
  }
}

export const defer = (thunk: () => void) => E.perform<void>(new Defer(thunk));

export function run<T>(comp: E.Effectful<T>): E.Effectful<T> {
  const thunks: (() => void)[] = [];
  return E.matchWith<T, T>(comp, {
    retc(x) {
      thunks.forEach((thunk) => thunk());
      return x;
    },
    errc(err) {
      thunks.forEach((thunk) => thunk());
      throw err;
    },
    effc(eff) {
      if (eff instanceof Defer) {
        return (k) => {
          thunks.unshift(eff.thunk);
          return k.continue();
        };
      }
      return null;
    },
  });
}
