// Translated from https://go.dev/tour/flowcontrol/13 .
// Non-local control flows can be implemented with effect handlers.

import {
  Continuation,
  Effect,
  Effectful,
  matchWith,
  perform,
  runEffectful,
} from "../src/mod.ts";

class Defer extends Effect<void> {
  constructor(public thunk: () => void) {
    super();
  }
}

const defer = (thunk: () => void) => perform(new Defer(thunk));

function run<T>(comp: Effectful<T>) {
  const thunks: (() => void)[] = [];

  return matchWith(comp, {
    retc(x) {
      thunks.forEach((thunk) => thunk());
      return x;
    },
    exnc(exn) {
      thunks.forEach((thunk) => thunk());
      throw exn;
    },
    effc(on) {
      on(Defer, (eff: Defer, cont: Continuation<void, T>) => {
        thunks.unshift(eff.thunk);
        return cont.continue();
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

runEffectful(run(main()));
