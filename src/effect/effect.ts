export class Effect<T = unknown> {
  #_T!: T;

  toString() {
    return this.constructor.name;
  }
}

export class LabeledEffect<
  L extends string extends L ? never : string,
  T = unknown
> extends Effect<T> {
  #_L!: L;
}

type EffReturnType<E extends Effect> = E extends Effect<infer T> ? T : never;

type EffConstructor<E extends Effect> = {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): E;
};

export type Effectful<E extends Effect, T> = Generator<E, T>;

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

export type Handlers<E extends Effect, EHandle extends Effect, T, S> = {
  retc(x: T): S;
  errc(err: unknown): S;
  effc(when: SetEffHandler<E, EHandle, S>): void;
};

export function pure(): Effectful<never, void>;
export function pure<T>(x: T): Effectful<never, T>;
// deno-lint-ignore require-yield
export function* pure<T>(x?: T): Effectful<never, void | T> {
  return x;
}

export function* perform<E extends Effect<unknown>>(
  eff: E
): Effectful<E, EffReturnType<E>> {
  return (yield eff) as EffReturnType<E>;
}

export function run<T>(comp: Effectful<never, T>): T {
  const { value, done } = comp.next();
  if (!done) {
    throw new Error(`Unhandled Effect: ${value}`);
  }
  return value;
}

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
        matched = (k: Continuation<unknown, EHandled, S>) => handler(eff, k);
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

export const tryWith = <E extends Effect, EHandle extends Effect, T>(
  comp: Effectful<E, T>,
  handlers: Pick<Handlers<E, EHandle, T, T>, "effc">
): Effectful<Exclude<E, EHandle>, T> =>
  matchWith<E, EHandle, T, T>(comp, {
    retc(x) {
      return x;
    },
    errc(err) {
      throw err;
    },
    effc: handlers.effc,
  });

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
