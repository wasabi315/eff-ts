import {
  Effect,
  Effectful,
  LabeledEffect,
  perform,
  tryWith,
} from "../effect.ts";

/**
 * The State effect.
 * Each call to this function returns operations on a separate state, allowing you to mix multiple States.
 * @typeParam S The type of the state.
 */
export function State<L extends string extends L ? never : string, S>() {
  class Get extends LabeledEffect<L, S> {}
  class Put extends LabeledEffect<L, void> {
    constructor(public s: S) {
      super();
    }
  }

  /** Reads the current state. */
  const get = () => perform(new Get());
  /** Sets the state to a new value. */
  const put = (state: S) => perform(new Put(state));
  /** Modifies the state with a given function. */
  function* modify(f: (s: S) => S) {
    yield* put(f(yield* get()));
  }

  /** Runs a stateful computation under a provided initial state. */
  function run<ER extends Effect, T>(init: S, comp: Effectful<ER, T>) {
    let curr: S = init;
    return tryWith<ER, Get | Put, T>(comp, {
      effc(on) {
        on(Get, (_, k) => k.continue(curr));
        on(Put, ({ s }, k) => {
          curr = s;
          return k.continue();
        });
      },
    });
  }

  return { get, put, modify, run };
}
