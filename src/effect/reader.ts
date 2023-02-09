import * as E from "./effect.ts";

export function Reader<L extends string, E>() {
  class Ask extends E.LabeledEffect<L, E> {}

  const ask = () => E.perform(new Ask());

  function run<E1 extends E.Effect, T>(
    env: E,
    comp: E.Effectful<E1, T>
  ): E.Effectful<Exclude<E1, Ask>, T> {
    return E.tryWith(comp, {
      effc(when) {
        when(Ask, (_, k) => k.continue(env));
      },
    });
  }

  return { ask, run };
}
