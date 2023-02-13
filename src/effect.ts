/**
 * The base class for all effects. Extend this class to create a new effect.
 * @typeParam T The type of a value to be returned when performing.
 */
export class Effect<T = unknown> {
  // For making `EffReturnType` work correctly.
  #_T!: T;

  toString() {
    return this.constructor.name;
  }
}

type EffReturnType<E extends Effect> = E extends Effect<infer T> ? T : never;

type EffConstructor<E extends Effect> = {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): E;
};

/**
 * `Effectful<T>` is an effectful computation that eventually returns a `T` value performing effects along the way.
 */
export type Effectful<T> = Generator<Effect, T>;

/**
 * `Continuation<T, S>` is a continuation that expects a `T` value and eventually returns an `S` value performing effects along the way.
 */
export type Continuation<T, S> = {
  continue(arg: T): Effectful<S>;
};

type EffHandler<E extends Effect, S> = (
  eff: E,
  k: Continuation<EffReturnType<E>, S>
) => Effectful<S>;

type SetEffHandler<S> = <E extends Effect>(
  eff: EffConstructor<E>,
  handle: EffHandler<E, S>
) => void;

/** `Handlers<T, S>` is an object with three properties. */
export type Handlers<T, S> = {
  /** Processes the return value of a computation enclosed by this handler. */
  retc(x: T): S;
  /** Handles exceptions. */
  errc(err: unknown): S;
  /** Handles effects performed by a computation enclosed by this handler. */
  effc(when: SetEffHandler<S>): void;
};

export type EffectHandlers<T> = Pick<Handlers<T, T>, "effc">;

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
  eff: E
): Effectful<EffReturnType<E>> {
  return (yield eff) as EffReturnType<E>;
}

/** Runs an effectful computation. */
export function run<T>(comp: Effectful<T>): T {
  const { value, done } = comp.next();
  if (!done) {
    throw new Error(`Unhandled Effect: ${value}`);
  }
  return value;
}

/**
 * Runs an `Effectful` computation under a `Handlers`.
 * @param comp A computation to run.
 * @param handlers A `Handlers` that handle effects performed by `comp`.
 */
export function matchWith<T, S>(
  comp: Effectful<T>,
  handlers: Handlers<T, S>
): Effectful<S> {
  const effc = (
    eff: Effect
  ): ((k: Continuation<unknown, S>) => Effectful<S>) | null => {
    let matched = null;
    handlers.effc((ctor, handler) => {
      if (eff instanceof ctor) {
        matched = handler.bind(null, eff);
      }
    });
    return matched;
  };

  function* attachHandlers(comp: Effectful<T>): Effectful<S> {
    let prev = null;

    while (true) {
      let res;
      try {
        res = comp.next(prev);
      } catch (err) {
        return handlers.errc(err);
      }

      if (res.done) {
        return handlers.retc(res.value);
      }

      const handler = effc(res.value);
      if (handler === null) {
        prev = yield res.value;
        continue;
      }

      return yield* handler(createCont(comp));
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
        return attachHandlers(_continue(comp, x));
      },
    };
  }

  return attachHandlers(comp);
}

/**
 * Runs an `Effectful` computation under an `EffectHandlers`.
 * @param comp A computation to run.
 * @param handlers An `EffectHandlers` that handle effects performed by `comp`.
 */
export function tryWith<T>(
  comp: Effectful<T>,
  handlers: EffectHandlers<T>
): Effectful<T> {
  return matchWith<T, T>(comp, {
    retc(x) {
      return x;
    },
    errc(err) {
      throw err;
    },
    effc: handlers.effc,
  });
}

function _continue<T>(k: Effectful<T>, x: unknown): Effectful<T> {
  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      this.next = k.next.bind(k);
      return k.next(x);
    },
    return: k.return.bind(k),
    throw: k.throw.bind(k),
  };
}
