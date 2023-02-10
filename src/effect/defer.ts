import * as Eff from "./effect.ts";

class Defer extends Eff.Effect<void> {
  constructor(public thunk: () => void) {
    super();
  }
}

export { type Defer };

export const defer = (thunk: () => void) => Eff.perform(new Defer(thunk));

export function run<E extends Eff.Effect, T>(comp: Eff.Effectful<E, T>) {
  const thunks: (() => void)[] = [];
  return Eff.matchWith<E, Defer, T, T>(comp, {
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
