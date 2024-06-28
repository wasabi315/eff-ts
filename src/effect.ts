/**
 * `Effectful<T>` is an computation that returns a `T` value performing effects.
 */
export type Effectful<T> = Generator<Effect, T>;

/**
 * The base class of effects. Extend this class to create a new effect.
 * @typeParam T The return type of the effect.
 */
export class Effect<T = unknown> {
  // In order to make `EffectReturnType` work.
  #_T!: T;
}

type EffectReturnType<E> = E extends Effect<infer T> ? T : never;

/**
 * `Continuation<T, S>` is a continuation that expects a value of type `T` and returns a value of type `S` after performing effects.
 */
export type Continuation<T, S> = {
  continue(arg: T): Effectful<S>;
  discontinue(exn: unknown): Effectful<S>;
};

// deno-lint-ignore no-explicit-any
type Constructor<T> = new (..._: any) => T;

export type EffectHandlerSetter<S> = <E extends Effect>(
  eff: Constructor<E>,
  handler: (eff: E, cont: Continuation<EffectReturnType<E>, S>) => Effectful<S>,
) => void;

export type Handler<T, S> = {
  /** Processes the return value of a computation enclosed by this handler. */
  retc(x: T): S;
  /** Handles exceptions. */
  exnc(err: unknown): S;
  /** Handles effects performed by a computation enclosed by this handler. */
  effc(on: EffectHandlerSetter<S>): void;
};

export type SimpleHandler<T> = Pick<Handler<T, T>, "effc">;

/** Lift a value to an `Effectful` computation.  */
export function pure(): Effectful<void>;
/** Lift a value to an `Effectful` computation.  */
export function pure<T>(x: T): Effectful<T>;
// deno-lint-ignore require-yield
export function* pure<T>(x?: T): Effectful<void | T> {
  return x;
}

/** Performs an effect. */
export function* perform<E extends Effect>(
  eff: E,
): Effectful<EffectReturnType<E>> {
  return (yield eff) as EffectReturnType<E>;
}

/** Runs an effectful computation. */
export function runEffectful<T>(comp: Effectful<T>): T {
  const { value, done } = comp.next();
  if (!done) {
    throw new Error(`Unhandled Effect: ${value.constructor.name}`);
  }
  return value;
}

/**
 * Runs an `Effectful` computation under a `Handlers`.
 * @param comp A computation to run.
 * @param handler A `Handlers` that handle effects performed by `comp`.
 */
export function matchWith<T, S>(
  comp: Effectful<T>,
  handler: Handler<T, S>,
): Effectful<S> {
  let next = () => comp.next();

  function* loop(): Effectful<S> {
    while (true) {
      let res: IteratorResult<Effect, T>;
      try {
        res = next();
      } catch (err) {
        return handler.exnc(err);
      }

      if (res.done) {
        return handler.retc(res.value);
      }

      const eff = res.value;
      let resumed = false;
      const cont = {
        continue(x: unknown) {
          if (resumed) {
            throw new Error("Continuation already resumed");
          }
          resumed = true;
          next = () => comp.next(x);
          return loop();
        },
        discontinue(err: unknown) {
          if (resumed) {
            throw new Error("Continuation already resumed");
          }
          resumed = true;
          next = () => comp.throw(err);
          return loop();
        },
      };

      const handled: Array<Effectful<S>> = [];
      handler.effc((ctor, handler) => {
        if (eff instanceof ctor) {
          handled.push(handler(eff, cont));
        }
      });
      if (handled[0]) {
        return yield* handled[0];
      }

      try {
        const x = yield eff;
        next = () => comp.next(x);
      } catch (err) {
        next = () => comp.throw(err);
      }
    }
  }

  return loop();
}

/**
 * Runs an `Effectful` computation under an `EffectHandlers`.
 * @param comp A computation to run.
 * @param handler An `EffectHandlers` that handle effects performed by `comp`.
 */
export function tryWith<T>(
  comp: Effectful<T>,
  handler: SimpleHandler<T>,
): Effectful<T> {
  return matchWith(comp, {
    retc(x) {
      return x;
    },
    exnc(err) {
      throw err;
    },
    effc: handler.effc,
  });
}
