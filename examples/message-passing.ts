import { Effect as Eff } from "../src/effect.ts";

class Exchange extends Eff.Effect<string> {
  constructor(public msg: string) {
    super();
  }
}

const exchange = (msg: string) => Eff.perform(new Exchange(msg));

type Status<E extends Eff.Effect> =
  | { done: true }
  | {
      done: false;
      msg: string;
      cont: Eff.Continuation<string, E, Status<E>>;
    };

function step<E extends Eff.Effect>(task: Eff.Effectful<E, void>) {
  return Eff.matchWith<E, Exchange, void, Status<Exclude<E, Exchange>>>(task, {
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

function* runBoth<E extends Eff.Effect>(
  steps1: Eff.Effectful<E, Status<E>>,
  steps2: Eff.Effectful<E, Status<E>>
): Eff.Effectful<E, void> {
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

function* task(name: string, msg: string): Eff.Effectful<Exchange, void> {
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
