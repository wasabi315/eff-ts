import * as Eff from "./effect.ts";

export function Reader<L extends string extends L ? never : string, R>() {
  class Ask extends Eff.LabeledEffect<L, R> {}

  const ask = () => Eff.perform(new Ask());

  function run<E extends Eff.Effect, T>(env: R, comp: Eff.Effectful<E, T>) {
    return Eff.tryWith<E, Ask, T>(comp, {
      effc(when) {
        when(Ask, (_, k) => k.continue(env));
      },
    });
  }

  return { ask, run };
}
