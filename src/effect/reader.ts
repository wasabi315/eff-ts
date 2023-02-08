import * as E from "./effect.ts";

export function Reader<E>() {
  class Ask extends E.Effect {}

  const ask = () => E.perform<E>(new Ask());

  function run<T>(env: E, comp: E.Effectful<T>): E.Effectful<T> {
    return E.tryWith(comp, {
      effc(eff) {
        if (eff instanceof Ask) {
          return function* (k) {
            return yield* k.continue(env);
          };
        }
        return null;
      },
    });
  }
  return { ask, run };
}
