/**
 * `Effectful<T>` is an computation that returns a `T` value performing effects.
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
 * A subclass of `Effect` annotated with a label `L`.
 * Use this in order to distinguish multiple effects of the same type.
 * @typeParam L The label of the effect.
 * @typeParam T The return type of the effect.
 */
export class LabeledEffect<L extends string extends L ? never : string, T>
  extends Effect<T> {
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

export type EffectHandlerSetter<ER extends Effect, EH extends Effect, S> = <
  E extends EH,
>(
  eff: Constructor<E>,
  handler: (
    eff: E,
    cont: Continuation<EffectReturnType<E>, Exclude<ER, EH>, S>,
  ) => Effectful<Exclude<ER, EH>, S>,
) => void;

export type Handler<ER extends Effect, EH extends Effect, T, S> = {
  /** Processes the return value of a computation enclosed by this handler. */
  retc(x: T): S;
  /** Handles exceptions. */
  exnc(err: unknown): S;
  /** Handles effects performed by a computation enclosed by this handler. */
  effc(on: EffectHandlerSetter<ER, EH, S>): void;
};

export type SimpleHandler<ER extends Effect, EH extends Effect, T> = Pick<
  Handler<ER, EH, T, T>,
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
export function matchWith<ER extends Effect, EH extends Effect, T, S>(
  comp: Effectful<ER, T>,
  handler: Handler<ER, EH, T, S>,
): Effectful<Exclude<ER, EH>, S> {
  function* attachHandler(
    comp: Effectful<ER, T>,
  ): Effectful<Exclude<ER, EH>, S> {
    while (true) {
      let res: IteratorResult<Effect<unknown>, T>;
      try {
        res = comp.next();
      } catch (err) {
        return handler.exnc(err);
      }

      if (res.done) {
        return handler.retc(res.value);
      }

      const cont = createCont(comp);

      const handled: Array<() => Effectful<Exclude<ER, EH>, S>> = [];
      handler.effc((ctor, handler) => {
        if (res.value instanceof ctor) {
          handled[0] = handler.bind(null, res.value, cont);
        }
      });
      if (handled[0]) {
        return yield* handled[0]();
      }

      try {
        const x = yield res.value as Exclude<ER, EH>;
        comp = _continue(comp, x);
      } catch (err) {
        comp = discontinue(comp, err);
      }
    }
  }

  function createCont(
    comp: Effectful<ER, T>,
  ): Continuation<unknown, Exclude<ER, EH>, S> {
    return {
      continue(x) {
        this.continue = this.discontinue = () => {
          throw new Error("Continuation already resumed");
        };
        return attachHandler(_continue(comp, x));
      },
      discontinue(exn) {
        this.continue = this.discontinue = () => {
          throw new Error("Continuation already resumed");
        };
        return attachHandler(discontinue(comp, exn));
      },
    };
  }

  return attachHandler(comp);
}

/**
 * Runs an `Effectful` computation under an `EffectHandlers`.
 * @param comp A computation to run.
 * @param handler An `EffectHandlers` that handle effects performed by `comp`.
 */
export function tryWith<ER extends Effect, EH extends Effect, T>(
  comp: Effectful<ER, T>,
  handler: SimpleHandler<ER, EH, T>,
): Effectful<Exclude<ER, EH>, T> {
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

function _continue<T, S>(
  gen: Generator<T, S>,
  x: unknown,
): Generator<T, S> {
  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      this.next = gen.next.bind(gen);
      return gen.next(x);
    },
    return: gen.return.bind(gen),
    throw: gen.throw.bind(gen),
  };
}

function discontinue<T, S>(
  gen: Generator<T, S>,
  exn: unknown,
): Generator<T, S> {
  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      this.next = gen.next.bind(gen);
      return gen.throw(exn);
    },
    return: gen.return.bind(gen),
    throw: gen.throw.bind(gen),
  };
}
