import {
  Effect,
  Effectful,
  LabeledEffect,
  perform,
  tryWith,
} from "../effect.ts";

/**
 * The Reader effect.
 * Each call to this function returns operations on a separate environment, allowing you to mix multiple Readers.
 * @typeParam R The type of a value read by computations as a shared environment.
 */
export function Reader<L extends string, R>() {
  class Ask extends LabeledEffect<L, R> {}

  /** Reads a value from a shared environment. */
  const ask = () => perform(new Ask());

  /** Runs a computation under a given environment of value. */
  function run<Row extends Effect, T>(env: R, comp: Effectful<Row, T>) {
    return tryWith<Row, Ask, T>(comp, {
      effc(on) {
        on(Ask, (_, k) => k.continue(env));
      },
    });
  }

  return { ask, run };
}
