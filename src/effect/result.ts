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

export function run<E1 extends E.Effect, T>(
  comp: E.Effectful<E1, T>
): E.Effectful<Exclude<E1, Err>, Result<T, unknown>> {
  return E.matchWith(comp, {
    retc(value) {
      return { ok: true, value };
    },
    errc(error) {
      return { ok: false, error };
    },
    effc(eff) {
      if (eff instanceof Err) {
        return (_k) => E.pure({ ok: false, error: eff.error });
      }
      return null;
    },
  });
}
