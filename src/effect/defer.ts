import * as E from "./effect.ts";

class Defer extends E.Effect<void> {
  constructor(public thunk: () => void) {
    super();
  }
}

export { type Defer };

export const defer = (thunk: () => void) => E.perform(new Defer(thunk));

export function run<E1 extends E.Effect, T>(
  comp: E.Effectful<E1, T>
): E.Effectful<Exclude<E1, Defer>, T> {
  const thunks: (() => void)[] = [];
  return E.matchWith(comp, {
    retc(x) {
      thunks.forEach((thunk) => thunk());
      return x;
    },
    errc(err) {
      thunks.forEach((thunk) => thunk());
      throw err;
    },
    effc(when) {
      when(Defer, (eff, k) => {
        thunks.unshift(eff.thunk);
        return k.continue();
      });
    },
  });
}
