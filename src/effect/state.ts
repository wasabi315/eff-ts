import * as E from "./effect.ts";

export function State<S>() {
  class Get extends E.Effect {}
  class Put extends E.Effect {
    constructor(public state: S) {
      super();
    }
  }

  const get = () => E.perform<S>(new Get());
  const put = (state: S) => E.perform<void>(new Put(state));

  function* modify(f: (s: S) => S): E.Effectful<void> {
    yield* put(f(yield* get()));
  }

  function run<T>(init: S, comp: E.Effectful<T>): E.Effectful<T> {
    let state: S = init;
    return E.tryWith<T>(comp, {
      effc(eff) {
        if (eff instanceof Get) {
          return function* (k) {
            return yield* k.continue(state);
          };
        }
        if (eff instanceof Put) {
          return function* (k) {
            state = eff.state;
            return yield* k.continue();
          };
        }
        return null;
      },
    });
  }

  return { get, put, modify, run };
}
