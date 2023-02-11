import * as Eff from "./effect.ts";

class Await<T> extends Eff.Effect<T> {
  constructor(public promise: Promise<T>) {
    super();
  }
}

export { type Await };

export const _await = <T>(promise: Promise<T>) =>
  Eff.perform(new Await(promise));

export function run<T>(comp: Eff.Effectful<Await<unknown>, T>) {
  return new Promise((resolve, reject) => {
    const x = Eff.matchWith<Await<unknown>, Await<unknown>, T, void>(comp, {
      retc: resolve,
      errc: reject,
      effc(when) {
        when(Await, (eff, k) => {
          eff.promise.then((x) => Eff.run(k.continue(x)));
          return Eff.pure();
        });
      },
    });
    Eff.run(x);
  });
}
