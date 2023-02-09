import { Effect as E } from "../src/effect.ts";

class Exchange extends E.Effect<string> {
  constructor(public msg: string) {
    super();
  }
}

const exchange = (msg: string) => E.perform(new Exchange(msg));

type Status<E1 extends E.Effect> =
  | { done: true }
  | { done: false; msg: string; cont: E.Continuation<E1, string, Status<E1>> };

function step<E1 extends E.Effect>(
  task: E.Effectful<E1, void>
): E.Effectful<Exclude<E1, Exchange>, Status<Exclude<E1, Exchange>>> {
  return E.matchWith(task, {
    retc() {
      return { done: true };
    },
    errc(err) {
      throw err;
    },
    effc(when) {
      when(Exchange, (eff, k) => {
        return E.pure({ done: false, msg: eff.msg, cont: k });
      });
    },
  });
}

function* runBoth<E1 extends E.Effect>(
  steps1: E.Effectful<E1, Status<E1>>,
  steps2: E.Effectful<E1, Status<E1>>
): E.Effectful<E1, void> {
  const [status1, status2] = [yield* steps1, yield* steps2];
  if (status1.done && status2.done) {
    return;
  }
  if (!status1.done && !status2.done) {
    return yield* runBoth(
      status1.cont.continue(status2.msg),
      status2.cont.continue(status1.msg)
    );
  }
  throw new Error("Improper synchronization");
}

function* task(name: string, msg: string): E.Effectful<Exchange, void> {
  if (msg.length === 0) {
    console.log(`${name}: exiting`);
    return;
  }

  console.log(`${name}: sending   ${msg}`);
  msg = yield* exchange(msg);
  console.log(`${name}: received  ${msg}`);

  yield* task(name, msg.slice(0, -1));
}

const task1 = task("A", "Effect");
const task2 = task("B", "Handle");
E.run(runBoth(step(task1), step(task2)));
