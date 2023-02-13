// Translated from https://go.dev/tour/flowcontrol/13 .
// Non-local control flows can be implemented with effect handlers.

import { Effect as Eff } from "../src/mod.ts";

class Defer extends Eff.Effect<void> {
  constructor(public thunk: () => void) {
    super();
  }
}

const defer = (thunk: () => void) => Eff.perform(new Defer(thunk));

function run<T>(comp: Eff.Effectful<T>) {
  const thunks: (() => void)[] = [];

  return Eff.matchWith(comp, {
    retc(x) {
      thunks.forEach((thunk) => thunk());
      return x;
    },
    exnc(exn) {
      thunks.forEach((thunk) => thunk());
      throw exn;
    },
    effc(when) {
      when(Defer, (eff, k) => {
        thunks.unshift(eff.thunk);
        return k.continue();
      });
    },
  });
}

function* main() {
  console.log("counting");

  for (let i = 0; i < 10; i++) {
    yield* defer(() => console.log(i));
  }

  console.log("done");
}

Eff.run(run(main()));
