import { Effect, Effectful, matchWith, perform } from "../effect.ts";

/**
 * An effect that raises an exception.
 * Execution of the remaining computation will stop and control will be passed to the closest handler of this effect.
 */
// deno-lint-ignore no-explicit-any
class Raise extends Effect<any> {
  constructor(public exn: unknown) {
    super();
  }
}

/** Raises an error. */
export const raise = (error: unknown) => perform(new Raise(error));

export type Result<T, S> = { ok: true; value: T } | { ok: false; error: S };

/** Turns a computation that raises an exception into one that returns a `Result` value. */
export function runAsResult<Row extends Effect, T>(comp: Effectful<Row, T>) {
  return matchWith<Row, Raise, T, Result<T, unknown>>(comp, {
    retc(value) {
      return { ok: true, value };
    },
    exnc(exn) {
      return { ok: false, error: exn };
    },
    effc(on) {
      on(Raise, ({ exn }, k) => k.discontinue(exn));
    },
  });
}
