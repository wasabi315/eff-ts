import * as Eff from "../effect.ts";

/**
 * An effect that raises an exception.
 * Execution of the remaining computation will stop and control will be passed to the closest handler of this effect.
 */
// deno-lint-ignore no-explicit-any
class Raise extends Eff.Effect<any> {
  constructor(public exn: unknown) {
    super();
  }
}

export { type Raise };

/** Raises an error. */
export const raise = (error: unknown) => Eff.perform(new Raise(error));

export type Result<T, S> = { ok: true; value: T } | { ok: false; error: S };

/** Turns a computation that raises an exception into one that returns a `Result` value. */
export function run<T>(comp: Eff.Effectful<T>) {
  return Eff.matchWith<T, Result<T, unknown>>(comp, {
    retc(value) {
      return { ok: true, value };
    },
    exnc(exn) {
      return { ok: false, error: exn };
    },
    effc(match) {
      return match.with(Raise, function* (eff, k) {
        yield* k.discontinue(eff.exn);
        return { ok: false, error: eff.exn };
      });
    },
  });
}
