/**
 * `Effectful<T>` is an computation that returns a `T` value performing effects.
 */
export type Effectful<T> = Generator<Effect<unknown>, T>;

/**
 * The base class for all effects. Extend this class to create a new effect.
 * @typeParam T The return type of the effect.
 */
export class Effect<T> {
  // To make `EffectReturnType` to work.
  #_T!: T;
}

type ReturnType<E> = E extends Effect<infer T> ? T : never;

/**
 * `Continuation<T, S>` is a continuation that expects a `T` value and returns an `S` value performing effects.
 */
export type Continuation<T, S> = {
  continue(arg: T): Effectful<S>;
  discontinue(exn: unknown): Effectful<S>;
};

// deno-lint-ignore no-explicit-any
type Constructor<T> = new (..._: any) => T;

export type HandlerRegistry<S> = {
  register<E extends Effect<unknown>>(
    eff: Constructor<E>,
    handler: (eff: E, k: Continuation<ReturnType<E>, S>) => Effectful<S>,
  ): void;
};

export type Handler<T, S> = {
  /** Processes the return value of a computation enclosed by this handler. */
  retc(x: T): S;
  /** Handles exceptions. */
  exnc(err: unknown): S;
  /** Handles effects performed by a computation enclosed by this handler. */
  effc(registry: HandlerRegistry<S>): void;
};

export type SimpleHandler<T> = Pick<Handler<T, T>, "effc">;

/** A do-nothing `Effectful` computation. */
export function pure(): Effectful<void>;
/** Lift a value to an `Effectful` computation.  */
export function pure<T>(x: T): Effectful<T>;
// deno-lint-ignore require-yield
export function* pure<T>(x?: T): Effectful<void | T> {
  return x;
}

/** Performs an effect. */
export function* perform<E extends Effect<unknown>>(
  eff: E,
): Effectful<ReturnType<E>> {
  return (yield eff) as ReturnType<E>;
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
  function* attachHandler(comp: Effectful<T>): Effectful<S> {
    let next = () => comp.next();

    while (true) {
      let res!: IteratorResult<Effect<unknown>, T>;
      try {
        res = next();
      } catch (err) {
        return handler.exnc(err);
      }

      if (res.done) {
        return handler.retc(res.value);
      }

      const handleds: Effectful<S>[] = [];
      const cont = createCont(comp);
      handler.effc({
        register(ctor, handler) {
          if (res.value instanceof ctor) {
            handleds.push(handler(res.value, cont));
          }
        },
      });
      const handled = handleds.shift();
      if (typeof handled !== "undefined") {
        return yield* handled;
      }

      try {
        const x = yield res.value;
        next = () => comp.next(x);
      } catch (err) {
        next = () => comp.throw(err);
      }
    }
  }

  function createCont(comp: Effectful<T>): Continuation<unknown, S> {
    let resumed = false;
    return {
      continue(x) {
        if (resumed) {
          throw new Error("Continuation already resumed");
        }
        resumed = true;
        return attachHandler(setFirstNextCall(comp, () => comp.next(x)));
      },
      discontinue(exn) {
        if (resumed) {
          throw new Error("Continuation already resumed");
        }
        resumed = true;
        return attachHandler(setFirstNextCall(comp, () => comp.throw(exn)));
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

function setFirstNextCall<T, S>(
  gen: Generator<T, S>,
  next: () => IteratorResult<T, S>,
): Generator<T, S> {
  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      this.next = gen.next.bind(gen);
      return next();
    },
    return: gen.return.bind(gen),
    throw: gen.throw.bind(gen),
  };
}
