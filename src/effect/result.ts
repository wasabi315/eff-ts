import * as E from "./effect.ts";

class Err extends E.Effect {
  constructor(public error: unknown) {
    super();
  }
}

// deno-lint-ignore no-explicit-any
export const err = (error: unknown) => E.perform<any>(new Err(error));

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function run<T>(comp: E.Effectful<T>): E.Effectful<Result<T, unknown>> {
  return E.matchWith(comp, {
    retc(value) {
      return { ok: true, value };
    },
    errc(error) {
      return { ok: false, error };
    },
    effc(eff) {
      if (eff instanceof Err) {
        return (_) => E.pure({ ok: false, error: eff.error });
      }
      return null;
    },
  });
}
