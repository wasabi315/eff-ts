// Translated from https://github.com/ocaml-multicore/ocaml-effects-tutorial/blob/master/sources/msg_passing.ml .

import {
  Continuation,
  Effect,
  Effectful,
  matchWith,
  perform,
  pure,
  runEffectful,
} from "../src/mod.ts";

class Xchg extends Effect<number> {
  constructor(public msg: number) {
    super();
  }
}

type Status =
  | { done: true }
  | { done: false; msg: number; cont: Continuation<number, Status> };

function step(task: Effectful<void>) {
  return matchWith(task, {
    retc(): Status {
      return { done: true };
    },
    exnc(exn) {
      throw exn;
    },
    effc(match) {
      return match.with(Xchg, (eff, k) => {
        return pure({ done: false, msg: eff.msg, cont: k });
      });
    },
  });
}

function* runBoth(
  steps1: Effectful<Status>,
  steps2: Effectful<Status>,
): Effectful<void> {
  const [status1, status2] = [yield* steps1, yield* steps2];
  if (status1.done && status2.done) {
    return;
  }
  if (!status1.done && !status2.done) {
    return yield* runBoth(
      status1.cont.continue(status2.msg),
      status2.cont.continue(status1.msg),
    );
  }
  throw new Error("Improper synchronization");
}

function* task(name: string, n: number): Effectful<void> {
  if (n === 0) {
    return;
  }

  console.log(`${name}: sending ${n}!`);
  const v = yield* perform(new Xchg(n));
  console.log(`${name}: received ${v}!`);

  yield* task(name, n - 1);
}

runEffectful(runBoth(step(task("a", 3)), step(task("b", 3))));
