/**
 * `Effectful<T>` is an computation that returns a `T` value performing `E` effects.
 */
export type Effectful<E extends Effect, T> = Generator<E, T>;

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
 * A subclass of `Effect` branded with a label `L`.
 * Use this in order to distinguish multiple effects of the same type.
 * @typeParam L The label of the effect.
 * @typeParam T The return type of the effect.
 */
export class LabeledEffect<L extends string, T> extends Effect<T> {
  // In order to make `Exclude` work.
  #_L!: L;
}

/**
 * `Continuation<T, S>` is a continuation that expects a value of type `T` and returns a value of type `S` after performing effects of type `E`.
 */
export type Continuation<T, E extends Effect, S> = {
  continue(arg: T): Effectful<E, S>;
  discontinue(exn: unknown): Effectful<E, S>;
};

// deno-lint-ignore no-explicit-any
type Constructor<T> = new (..._: any) => T;

export type EffectHandlerSetter<Row extends Effect, EH extends Effect, S> = <
  E extends EH,
>(
  eff: Constructor<E>,
  handler: (
    eff: E,
    cont: Continuation<EffectReturnType<E>, Exclude<Row, EH>, S>,
  ) => Effectful<Exclude<Row, EH>, S>,
) => void;

export type Handler<Row extends Effect, EH extends Effect, T, S> = {
  /** Processes the return value of a computation delimited by this handler. */
  retc(x: T): S;
  /** Handles exceptions. */
  exnc(err: unknown): S;
  /** Handles effects performed by a computation delimited by this handler. */
  effc(on: EffectHandlerSetter<Row, EH, S>): void;
};

export type SimpleHandler<Row extends Effect, EH extends Effect, T> = Pick<
  Handler<Row, EH, T, T>,
  "effc"
>;

/** Lift a value to an `Effectful` computation.  */
export function pure(): Effectful<never, void>;
/** Lift a value to an `Effectful` computation.  */
export function pure<T>(x: T): Effectful<never, T>;
// deno-lint-ignore require-yield
export function* pure<T>(x?: T): Effectful<never, void | T> {
  return x;
}

/** Performs an effect. */
export function* perform<E extends Effect>(
  eff: E,
): Effectful<E, EffectReturnType<E>> {
  return (yield eff) as EffectReturnType<E>;
}

/** Runs an effectful computation. */
export function runEffectful<T>(comp: Effectful<never, T>): T {
  const { value, done } = comp.next();
  if (!done) {
    throw new Error(`Unhandled Effect: ${(value as Effect).constructor.name}`);
  }
  return value;
}

/**
 * Runs an `Effectful` computation under a `Handlers`.
 * @param comp A computation to run.
 * @param handler A `Handlers` that handle effects performed by `comp`.
 */
export function matchWith<Row extends Effect, EH extends Effect, T, S>(
  comp: Effectful<Row, T>,
  handler: Handler<Row, EH, T, S>,
): Effectful<Exclude<Row, EH>, S> {
  let next = () => comp.next();

  function* loop(): Effectful<Exclude<Row, EH>, S> {
    while (true) {
      let res: IteratorResult<Effect<unknown>, T>;
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

      const handled: Array<Effectful<Exclude<Row, EH>, S>> = [];
      handler.effc((ctor, handler) => {
        if (eff instanceof ctor) {
          handled.push(handler(eff, cont));
        }
      });
      if (handled[0]) {
        return yield* handled[0];
      }

      try {
        const x = yield eff as Exclude<Row, EH>;
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
export function tryWith<Row extends Effect, EH extends Effect, T>(
  comp: Effectful<Row, T>,
  handler: SimpleHandler<Row, EH, T>,
): Effectful<Exclude<Row, EH>, T> {
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
