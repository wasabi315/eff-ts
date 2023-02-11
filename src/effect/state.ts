import * as Eff from "./effect.ts";

/**
 * The State effect.
 * The type parameter `L` is a label for distinguishing multiple State effects.
 * @typeParam L A label as a string literal type.
 * @typeParam S The type of the state.
 */
export function State<L extends string extends L ? never : string, S>() {
  class Get extends Eff.LabeledEffect<L, S> {}
  class Put extends Eff.LabeledEffect<L, void> {
    constructor(public state: S) {
      super();
    }
  }

  /** Reads the current state. */
  const get = () => Eff.perform(new Get());
  /** Sets the state to a new value. */
  const put = (state: S) => Eff.perform(new Put(state));
  /** Modifies the state with a given function. */
  function* modify(f: (s: S) => S): Eff.Effectful<Get | Put, void> {
    yield* put(f(yield* get()));
  }

  /** Runs a stateful computation with a given initial state. */
  function run<E extends Eff.Effect, T>(init: S, comp: Eff.Effectful<E, T>) {
    let state: S = init;
    return Eff.tryWith<E, Get | Put, T>(comp, {
      effc(when) {
        when(Get, (_eff, k) => k.continue(state));
        when(Put, (eff, k) => {
          state = eff.state;
          return k.continue();
        });
      },
    });
  }

  return { get, put, modify, run };
}
