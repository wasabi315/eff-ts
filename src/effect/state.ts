import * as E from "./effect.ts";

export function State<L extends string, S>() {
  class Get extends E.LabeledEffect<L, S> {}
  class Put extends E.LabeledEffect<L, void> {
    constructor(public state: S) {
      super();
    }
  }

  const get = () => E.perform(new Get());
  const put = (state: S) => E.perform(new Put(state));

  function* modify(f: (s: S) => S): E.Effectful<Get | Put, void> {
    yield* put(f(yield* get()));
  }

  function run<E1 extends E.Effect, T>(
    init: S,
    comp: E.Effectful<E1, T>
  ): E.Effectful<Exclude<E1, Get | Put>, T> {
    let state: S = init;
    return E.tryWith<E1, Exclude<E1, Get | Put>, T>(comp, {
      effc(eff) {
        if (eff instanceof Get) {
          return (k) => k.continue(state);
        }
        if (eff instanceof Put) {
          return (k) => {
            // TODO: Why eff.state: any here?
            state = eff.state;
            return k.continue();
          };
        }
        return null;
      },
    });
  }

  return { get, put, modify, run };
}
