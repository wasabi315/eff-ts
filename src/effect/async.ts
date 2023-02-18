import * as Eff from "../effect.ts";

/**
 * An effect that waits for a `Promise` fulfilled.
 * Enables us to write asynchronous computations without the built-in async-await construct.
 * @typeParam T The type of a value to be returned by the `Promise`.
 */
class Await<T = unknown> extends Eff.Effect<T> {
  constructor(public promise: Promise<T>) {
    super();
  }
}

export { type Await };

/** Awaits a `Promise` to be fulfilled. */
export const _await = <T>(promise: Promise<T>) =>
  Eff.perform(new Await(promise));

/**
 * Runs an asynchronous computation.
 * Note that this runner can only be outermost or an exception will be thrown.
 */
export function run<T>(comp: Eff.Effectful<T>) {
  return new Promise<T>((resolve, reject) => {
    const chainPromise = Eff.matchWith(comp, {
      retc: resolve,
      exnc: reject,
      effc(match) {
        return match.with(Await, (eff, k) => {
          eff.promise.then(
            (x) => Eff.run(k.continue(x)),
            (err) => Eff.run(k.discontinue(err)),
          );
          return Eff.pure();
        });
      },
    });

    Eff.run(chainPromise);
  });
}
