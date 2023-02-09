import { Effect as E } from "../src/effect.ts";

class Exchange extends E.Effect {
  constructor(public msg: string) {
    super();
  }
}

const exchange = (msg: string) => E.perform<string>(new Exchange(msg));

type Status =
  | { done: true }
  | { done: false; msg: string; cont: E.Continuation<unknown, Status> };

function step(task: E.Effectful<void>): E.Effectful<Status> {
  return E.matchWith(task, {
    retc() {
      return { done: true };
    },
    errc(err) {
      throw err;
    },
    effc(eff) {
      if (eff instanceof Exchange) {
        return (k) => E.pure({ done: false, msg: eff.msg, cont: k });
      }
      return null;
    },
  });
}

function* runBoth(
  steps1: E.Effectful<Status>,
  steps2: E.Effectful<Status>
): E.Effectful<void> {
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

function* task(name: string, msg: string): E.Effectful<void> {
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
