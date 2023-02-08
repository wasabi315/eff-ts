import * as E from "./effect.ts";

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

class Raise extends E.Effect {
  constructor(public error: unknown) {
    super();
  }
}

// deno-lint-ignore no-explicit-any
export const raise = (error: unknown) => E.perform<any>(new Raise(error));

export function run<T>(comp: E.Effectful<T>): E.Effectful<Result<T, unknown>> {
  return E.matchWith(comp, {
    retc(value) {
      return { ok: true, value };
    },
    errc(error): Result<T, unknown> {
      return { ok: false, error };
    },
    effc(eff) {
      if (eff instanceof Raise) {
        // deno-lint-ignore require-yield
        return function* (_) {
          return { ok: false, error: eff.error };
        };
      }
      return null;
    },
  });
}
