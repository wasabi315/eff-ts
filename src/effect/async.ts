import {
  Effect,
  Effectful,
  matchWith,
  perform,
  pure,
  runEffectful,
} from "../effect.ts";

/**
 * An effect that waits for a `Promise` to be fulfilled.
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
export function runAsync<T>(comp: Effectful<WaitFor, T>) {
  return runEffectful(matchWith(comp, {
    retc: (x) => Promise.resolve(x),
    exnc: Promise.reject,
    effc(on) {
      on(WaitFor, ({ promise }, k) => {
        return pure(promise.then(
          (x) => runEffectful(k.continue(x)),
          (err) => runEffectful(k.discontinue(err)),
        ));
      });
    },
  }));
}
