/**
 * The base class for all effects. Extend this class to create a new effect.
 * @typeParam T The type of a value to be returned with performing.
 */
export class Effect<T = unknown> {
  // For making `EffReturnType` work correctly.
  #_T!: T;

  toString() {
    return this.constructor.name;
  }
}

type EffectReturnType<E extends Effect> = E extends Effect<infer T> ? T : never;

type EffectConstructor<E extends Effect> = {
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
  discontinue(exn: unknown): Effectful<S>;
};

type EffectHandler<E extends Effect, S> = (
  eff: E,
  k: Continuation<EffectReturnType<E>, S>
) => Effectful<S>;

class EffectHandlerDispatcher<S> {
  #eff: Effect;
  #match: ((k: Continuation<unknown, S>) => Effectful<S>) | null = null;

  constructor(eff: Effect) {
    this.#eff = eff;
  }

  with<E extends Effect>(
    ctor: EffectConstructor<E>,
    handle: EffectHandler<E, S>
  ) {
    if (this.#eff instanceof ctor) {
      this.#match = handle.bind(null, this.#eff);
    }
    return this;
  }

  get match() {
    return this.#match;
  }
}

/** `Handlers<T, S>` is an object with three properties. */
export type Handlers<T, S> = {
  /** Processes the return value of a computation enclosed by this handler. */
  retc(x: T): S;
  /** Handles exceptions. */
  exnc(err: unknown): S;
  /** Handles effects performed by a computation enclosed by this handler. */
  effc(match: EffectHandlerDispatcher<S>): EffectHandlerDispatcher<S>;
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
): Effectful<EffectReturnType<E>> {
  return (yield eff) as EffectReturnType<E>;
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
  function* attachHandlers(comp: Effectful<T>): Effectful<S> {
    let next = () => comp.next();

    while (true) {
      let res;
      try {
        res = next();
      } catch (err) {
        return handlers.exnc(err);
      }

      if (res.done) {
        return handlers.retc(res.value);
      }

      const handler = handlers.effc(
        new EffectHandlerDispatcher(res.value)
      ).match;
      if (handler !== null) {
        return yield* handler(createCont(comp));
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
        return attachHandlers(_continue(comp, x));
      },
      discontinue(exn) {
        if (resumed) {
          throw new Error("Continuation already resumed");
        }
        resumed = true;
        return attachHandlers(_discontinue(comp, exn));
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
  return matchWith(comp, {
    retc(x) {
      return x;
    },
    exnc(err) {
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

function _discontinue<T>(k: Effectful<T>, exn: unknown): Effectful<T> {
  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      this.next = k.next.bind(k);
      return k.throw(exn);
    },
    return: k.return.bind(k),
    throw: k.throw.bind(k),
  };
}
