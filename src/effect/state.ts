import * as Eff from "./effect.ts";

export function State<L extends string extends L ? never : string, S>() {
  class Get extends Eff.LabeledEffect<L, S> {}
  class Put extends Eff.LabeledEffect<L, void> {
    constructor(public state: S) {
      super();
    }
  }

  const get = () => Eff.perform(new Get());
  const put = (state: S) => Eff.perform(new Put(state));

  function* modify(f: (s: S) => S): Eff.Effectful<Get | Put, void> {
    yield* put(f(yield* get()));
  }

  function run<E extends Eff.Effect, T>(init: S, comp: Eff.Effectful<E, T>) {
    let state: S = init;
    return Eff.tryWith<E, Get | Put, T>(comp, {
      effc(when) {
        when(Get, (_eff, k) => k.continue(state));
        when(Put, (eff, k) => {
          state = eff.state;
          return k.continue();
        });
      },
    });
  }

  return { get, put, modify, run };
}
