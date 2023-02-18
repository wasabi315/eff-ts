// Translated from https://github.com/ocaml-multicore/ocaml-effects-tutorial/blob/master/sources/msg_passing.ml .

import { Effect as Eff } from "../src/mod.ts";

class Xchg extends Eff.Effect<number> {
  constructor(public msg: number) {
    super();
  }
}

type Status =
  | { done: true }
  | { done: false; msg: number; cont: Eff.Continuation<number, Status> };

function step(task: Eff.Effectful<void>) {
  return Eff.matchWith(task, {
    retc(): Status {
      return { done: true };
    },
    exnc(exn) {
      throw exn;
    },
    effc(match) {
      return match.with(Xchg, (eff, k) => {
        return Eff.pure({ done: false, msg: eff.msg, cont: k });
      });
    },
  });
}

function* runBoth(
  steps1: Eff.Effectful<Status>,
  steps2: Eff.Effectful<Status>,
): Eff.Effectful<void> {
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

function* task(name: string, n: number): Eff.Effectful<void> {
  if (n === 0) {
    return;
  }

  console.log(`${name}: sending ${n}!`);
  const v = yield* Eff.perform(new Xchg(n));
  console.log(`${name}: received ${v}!`);

  yield* task(name, n - 1);
}

Eff.run(runBoth(step(task("a", 3)), step(task("b", 3))));
