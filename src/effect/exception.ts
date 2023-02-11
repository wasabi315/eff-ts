import * as Eff from "./effect.ts";

/**
 * An effect that raises an exception.
 * Execution of the remaining computation will stop and control will be passed to the closest `run`.
 */
// deno-lint-ignore no-explicit-any
class Raise extends Eff.Effect<any> {
  constructor(public error: unknown) {
    super();
  }
}

export { type Raise };

/** Raises an error. */
export const raise = (error: unknown) => Eff.perform(new Raise(error));

export type Result<T, S> = { ok: true; value: T } | { ok: false; error: S };

/** Turns a computation that raises an exception into one that returns a `Result` value. */
export function run<E extends Eff.Effect, T>(comp: Eff.Effectful<E, T>) {
  return Eff.matchWith<E, Raise, T, Result<T, unknown>>(comp, {
    retc(value) {
      return { ok: true, value };
    },
    errc(error) {
      return { ok: false, error };
    },
    effc(when) {
      when(Raise, (eff, _k) => Eff.pure({ ok: false, error: eff.error }));
    },
  });
}
