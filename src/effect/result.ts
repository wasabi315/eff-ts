import * as E from "./effect.ts";

// deno-lint-ignore no-explicit-any
class Err extends E.Effect<any> {
  constructor(public error: unknown) {
    super();
  }
}

export { type Err };

export const err = (error: unknown) => E.perform(new Err(error));

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function run<E1 extends E.Effect, T>(comp: E.Effectful<E1, T>) {
  return E.matchWith<E1, Err, T, Result<T, unknown>>(comp, {
    retc(value) {
      return { ok: true, value };
    },
    errc(error) {
      return { ok: false, error };
    },
    effc(when) {
      when(Err, (eff, _k) => E.pure({ ok: false, error: eff.error }));
    },
  });
}
