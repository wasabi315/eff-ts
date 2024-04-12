import { Effect, Effectful, perform, tryWith } from "../effect.ts";

/**
 * The Reader effect.
 * Each call to this function returns operations on a separate environment, allowing you to mix multiple Readers.
 * @typeParam R The type of a value read by computations as a shared environment.
 */
export function Reader<R>() {
  class Ask extends Effect<R> {}

  /** Reads a value from a shared environment. */
  const ask = () => perform(new Ask());

  /** Runs a computation under a given environment of value. */
  function run<T>(env: R, comp: Effectful<T>) {
    return tryWith(comp, {
      effc(on) {
        on(Ask, (_, k) => k.continue(env));
      },
    });
  }

  return { ask, run };
}
