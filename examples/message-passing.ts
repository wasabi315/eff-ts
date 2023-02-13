import { Effect as Eff } from "../src/mod.ts";

class Exchange extends Eff.Effect<string> {
  constructor(public msg: string) {
    super();
  }
}

const exchange = (msg: string) => Eff.perform(new Exchange(msg));

type Status =
  | { done: true }
  | {
      done: false;
      msg: string;
      cont: Eff.Continuation<string, Status>;
    };

function step(task: Eff.Effectful<void>) {
  return Eff.matchWith<void, Status>(task, {
    retc() {
      return { done: true };
    },
    errc(err) {
      throw err;
    },
    effc(when) {
      when(Exchange, (eff, k) => {
        return Eff.pure({ done: false, msg: eff.msg, cont: k });
      });
    },
  });
}

function* runBoth(
  steps1: Eff.Effectful<Status>,
  steps2: Eff.Effectful<Status>
): Eff.Effectful<void> {
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

function* task(name: string, msg: string): Eff.Effectful<void> {
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
Eff.run(runBoth(step(task1), step(task2)));
