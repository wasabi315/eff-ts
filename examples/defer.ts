import { Effect as Eff } from "../src/mod.ts";

class Defer extends Eff.Effect<void> {
  constructor(public thunk: () => void) {
    super();
  }
}

export { type Defer };

export const defer = (thunk: () => void) => Eff.perform(new Defer(thunk));

export function run<T>(comp: Eff.Effectful<T>) {
  const thunks: (() => void)[] = [];
  return Eff.matchWith(comp, {
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

function* main(): Eff.Effectful<void> {
  console.log("counting");
  for (let i = 0; i < 10; i++) {
    yield* defer(() => console.log(i));
  }
  console.log("done");
}

if (import.meta.main) {
  Eff.run(run(main()));
}
