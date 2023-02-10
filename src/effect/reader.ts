import * as E from "./effect.ts";

export function Reader<L extends string extends L ? never : string, E>() {
  class Ask extends E.LabeledEffect<L, E> {}

  const ask = () => E.perform(new Ask());

  function run<E1 extends E.Effect, T>(env: E, comp: E.Effectful<E1, T>) {
    return E.tryWith<E1, Ask, T>(comp, {
      effc(when) {
        when(Ask, (_, k) => k.continue(env));
      },
    });
  }

  return { ask, run };
}
