import { Effect, Effectful, perform, tryWith } from "../effect.ts";

/**
 * The State effect.
 * Each call of this function returns operations on a distinct State so you can mix multiple States.
 * @typeParam S The type of the state.
 */
export function State<S>() {
  class Get extends Effect<S> {}
  class Put extends Effect<void> {
    constructor(public state: S) {
      super();
    }
  }

  /** Reads the current state. */
  const get = () => perform(new Get());
  /** Sets the state to a new value. */
  const put = (state: S) => perform(new Put(state));
  /** Modifies the state with a given function. */
  function* modify(f: (s: S) => S): Effectful<void> {
    yield* put(f(yield* get()));
  }

  /** Runs a stateful computation under a provided initial state. */
  function run<T>(init: S, comp: Effectful<T>) {
    let state: S = init;
    return tryWith(comp, {
      effc(match) {
        return match
          .with(Get, (_, k) => k.continue(state))
          .with(Put, (eff, k) => {
            state = eff.state;
            return k.continue();
          });
      },
    });
  }

  return { get, put, modify, run };
}
