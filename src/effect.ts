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

/**
 * A subclass of `Effect` that has a label.
 * The label is for distinguishing the same kinds of effects such as multiple `State` effects with the same type of state.
 * @typeParam L A label as a string literal type.
 * @typeParam T The type of a value to be returned when performing.
 */
export class LabeledEffect<
  L extends string extends L ? never : string,
  T = unknown
> extends Effect<T> {
  // For making `Exclude` work correctly.
  #_L!: L;
}

type EffReturnType<E extends Effect> = E extends Effect<infer T> ? T : never;

type EffConstructor<E extends Effect> = {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): E;
};

/**
 * `Effectful<E, T>` is an effectful computation that eventually returns a `T` value performing `E` effects along the way.
 */
export type Effectful<E extends Effect, T> = Generator<E, T>;

/**
 * `Continuation<T, E, S>` is a continuation that expects a `T` value and eventually returns an `S` value performing `E` effects along the way.
 */
export type Continuation<T, E extends Effect, S> = {
  continue(arg: T): Effectful<E, S>;
};

type EffHandler<E extends Effect, EHandled extends Effect, S> = (
  eff: E,
  k: Continuation<EffReturnType<E>, EHandled, S>
) => Effectful<EHandled, S>;

type SetEffHandler<E extends Effect, EHandle extends Effect, S> = <
  E1 extends EHandle
>(
  eff: EffConstructor<E1>,
  handle: EffHandler<E1, Exclude<E, EHandle>, S>
) => void;

/** `Handlers<E, EHandle, T, S>` is an object with three properties. */
export type Handlers<E extends Effect, EHandle extends Effect, T, S> = {
  /** Processes the return value of a computation enclosed by this handler. */
  retc(x: T): S;
  /** Handles exceptions. */
  errc(err: unknown): S;
  /** Handles effects performed by a computation enclosed by this handler. */
  effc(when: SetEffHandler<E, EHandle, S>): void;
};

export type EffectHandlers<E extends Effect, EHandle extends Effect, T> = Pick<
  Handlers<E, EHandle, T, T>,
  "effc"
>;

/** A do-nothing `Effectful` computation. */
export function pure(): Effectful<never, void>;
/** Lift a value to an `Effectful` computation.  */
export function pure<T>(x: T): Effectful<never, T>;
// deno-lint-ignore require-yield
export function* pure<T>(x?: T): Effectful<never, void | T> {
  return x;
}

/** Performs an effect. */
export function* perform<E extends Effect<unknown>>(
  eff: E
): Effectful<E, EffReturnType<E>> {
  return (yield eff) as EffReturnType<E>;
}

/** Runs a pure `Effectful` computation. */
export function run<T>(comp: Effectful<never, T>): T {
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
export function matchWith<E extends Effect, EHandle extends Effect, T, S>(
  comp: Effectful<E, T>,
  handlers: Handlers<E, EHandle, T, S>
): Effectful<Exclude<E, EHandle>, S> {
  type EHandled = Exclude<E, EHandle>;

  const effc = (
    eff: E
  ):
    | ((k: Continuation<unknown, EHandled, S>) => Effectful<EHandled, S>)
    | null => {
    let matched = null;
    handlers.effc((ctor, handler) => {
      if (eff instanceof ctor) {
        matched = handler.bind(null, eff);
      }
    });
    return matched;
  };

  function* attachHandlers(comp: Effectful<E, T>): Effectful<EHandled, S> {
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
        prev = yield res.value as unknown as EHandled;
        continue;
      }

      return yield* handler(createCont(comp));
    }
  }

  function createCont(
    comp: Effectful<E, T>
  ): Continuation<unknown, EHandled, S> {
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
export function tryWith<E extends Effect, EHandle extends Effect, T>(
  comp: Effectful<E, T>,
  handlers: EffectHandlers<E, EHandle, T>
): Effectful<Exclude<E, EHandle>, T> {
  return matchWith<E, EHandle, T, T>(comp, {
    retc(x) {
      return x;
    },
    errc(err) {
      throw err;
    },
    effc: handlers.effc,
  });
}

function _continue<E extends Effect, T>(
  k: Effectful<E, T>,
  x: unknown
): Effectful<E, T> {
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
