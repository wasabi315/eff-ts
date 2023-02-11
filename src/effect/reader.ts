import * as Eff from "./effect.ts";

/**
 * The Reader effect.
 * The type parameter `L` is a label for distinguishing multiple Reader effects.
 * @typeParam L A label as a string literal type.
 * @typeParam R The type of a value read by computations as a shared environment.
 */
export function Reader<L extends string extends L ? never : string, R>() {
  class Ask extends Eff.LabeledEffect<L, R> {}

  /** Reads a value from a shared environment. */
  const ask = () => Eff.perform(new Ask());

  /** Runs a computation under a given environment of value. */
  function run<E extends Eff.Effect, T>(env: R, comp: Eff.Effectful<E, T>) {
    return Eff.tryWith<E, Ask, T>(comp, {
      effc(when) {
        when(Ask, (_, k) => k.continue(env));
      },
    });
  }

  // TODO: Add the `local` functionality.

  return { ask, run };
}
