import * as Eff from "../effect.ts";

/**
 * The State effect.
 * Each call of this function returns operations on distinct State effects so you can mix multiple States.
 * @typeParam S The type of the state.
 */
export function State<S>() {
  class Get extends Eff.Effect<S> {}
  class Put extends Eff.Effect<void> {
    constructor(public state: S) {
      super();
    }
  }

  /** Reads the current state. */
  const get = () => Eff.perform(new Get());
  /** Sets the state to a new value. */
  const put = (state: S) => Eff.perform(new Put(state));
  /** Modifies the state with a given function. */
  function* modify(f: (s: S) => S): Eff.Effectful<void> {
    yield* put(f(yield* get()));
  }

  /** Runs a stateful computation with a given initial state. */
  function run<T>(init: S, comp: Eff.Effectful<T>) {
    let state: S = init;
    return Eff.tryWith(comp, {
      effc(match) {
        return match
          .with(Get, (_eff, k) => k.continue(state))
          .with(Put, (eff, k) => {
            state = eff.state;
            return k.continue();
          });
      },
    });
  }

  return { get, put, modify, run };
}
