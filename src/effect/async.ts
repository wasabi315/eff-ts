import {
  Effect,
  Effectful,
  matchWith,
  perform,
  pure,
  runEffectful,
} from "../effect.ts";

/**
 * An effect that waits for a `Promise` fulfilled.
 * Enables us to write asynchronous computations without the built-in async-await construct.
 * @typeParam T The type of a value to be returned by the `Promise`.
 */
class WaitFor<T = unknown> extends Effect<T> {
  constructor(public promise: Promise<T>) {
    super();
  }
}

/** Awaits a `Promise` to be fulfilled. */
export const waitFor = <T>(promise: Promise<T>) =>
  perform(new WaitFor(promise));

/**
 * Runs an asynchronous computation.
 * Note that this runner can only be outermost or an exception will be thrown.
 */
export function runAsync<T>(comp: Effectful<T>) {
  return new Promise<T>((resolve, reject) => {
    const chainPromise = matchWith(comp, {
      retc: resolve,
      exnc: reject,
      effc(match) {
        return match.with(WaitFor, (eff, k) => {
          eff.promise.then(
            (x) => runEffectful(k.continue(x)),
            (err) => runEffectful(k.discontinue(err)),
          );
          return pure();
        });
      },
    });

    runEffectful(chainPromise);
  });
}
