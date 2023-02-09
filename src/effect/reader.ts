import * as E from "./effect.ts";

export function Reader<E>() {
  class Ask extends E.Effect<E> {}

  const ask = () => E.perform(new Ask());

  function run<E1 extends E.Effect, T>(
    env: E,
    comp: E.Effectful<E1, T>
  ): E.Effectful<Exclude<E1, Ask>, T> {
    return E.tryWith(comp, {
      effc(eff) {
        if (eff instanceof Ask) {
          return (k) => k.continue(env);
        }
        return null;
      },
    });
  }
  return { ask, run };
}
