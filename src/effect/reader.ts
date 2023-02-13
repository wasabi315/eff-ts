import * as Eff from "../effect.ts";

/**
 * The Reader effect.
 * Each call of this function returns operations on distinct Reader effects so you can mix multiple Readers.
 * @typeParam R The type of a value read by computations as a shared environment.
 */
export function Reader<R>() {
  class Ask extends Eff.Effect<R> {}

  /** Reads a value from a shared environment. */
  const ask = () => Eff.perform(new Ask());

  /** Runs a computation under a given environment of value. */
  function run<T>(env: R, comp: Eff.Effectful<T>) {
    return Eff.tryWith(comp, {
      effc(when) {
        when(Ask, (_, k) => k.continue(env));
      },
    });
  }

  // TODO: Add the `local` functionality.

  return { ask, run };
}
