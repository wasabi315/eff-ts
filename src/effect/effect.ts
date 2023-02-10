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

type UnEffect<E extends Effect> = E extends Effect<infer T> ? T : never;

type EffectConstructor<E extends Effect> = {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): E;
};

export type Effectful<E extends Effect, T> = Generator<E, T>;

export type Continuation<E extends Effect, T, S> = {
  continue(arg: T): Effectful<E, S>;
};

type EffectHandler<E extends Effect, E1 extends Effect, S> = (
  eff: E,
  k: Continuation<E1, UnEffect<E>, S>
) => Effectful<E1, S>;

type RegisterEffectHandler<E1 extends Effect, E2 extends Effect, S> = <
  E extends E2
>(
  eff: EffectConstructor<E>,
  handle: EffectHandler<E, Exclude<E1, E2>, S>
) => void;

export type Handler<E1 extends Effect, E2 extends Effect, T, S> = {
  retc(x: T): S;
  errc(err: unknown): S;
  effc(when: RegisterEffectHandler<E1, E2, S>): void;
};

export function pure(): Effectful<never, void>;
export function pure<T>(x: T): Effectful<never, T>;
// deno-lint-ignore require-yield
export function* pure<T>(x?: T): Effectful<never, void | T> {
  return x;
}

export function* perform<E extends Effect<unknown>>(
  eff: E
): Effectful<E, UnEffect<E>> {
  return (yield eff) as UnEffect<E>;
}

export function run<T>(comp: Effectful<never, T>): T {
  const { value, done } = comp.next();
  if (!done) {
    throw new Error(`Unhandled Effect: ${value}`);
  }
  return value;
}

export function matchWith<E1 extends Effect, E2 extends Effect, T, S>(
  comp: Effectful<E1, T>,
  handlers: Handler<E1, E2, T, S>
): Effectful<Exclude<E1, E2>, S> {
  type E3 = Exclude<E1, E2>;

  const effc = (
    eff: E1
  ): ((k: Continuation<E3, unknown, S>) => Effectful<E3, S>) | null => {
    let matched = null;
    handlers.effc((ctor, handler) => {
      if (eff instanceof ctor) {
        matched = (k: Continuation<E3, unknown, S>) => handler(eff, k);
      }
    });
    return matched;
  };

  function* attachHandlers(comp: Effectful<E1, T>): Effectful<E3, S> {
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
        prev = yield res.value as unknown as E3;
        continue;
      }

      return yield* handler(createCont(comp));
    }
  }

  function createCont(comp: Effectful<E1, T>): Continuation<E3, unknown, S> {
    let resumed = false;
    return {
      continue(...x) {
        if (resumed) {
          throw new Error("Continuation already resumed");
        }
        resumed = true;
        return attachHandlers(_continue(comp, ...x));
      },
    };
  }

  return attachHandlers(comp);
}

export const tryWith = <E1 extends Effect, E2 extends Effect, T>(
  comp: Effectful<E1, T>,
  handlers: Pick<Handler<E1, E2, T, T>, "effc">
): Effectful<Exclude<E1, E2>, T> =>
  matchWith<E1, E2, T, T>(comp, {
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
  x?: unknown
): Effectful<E, T> {
  const next = k.next.bind(k);
  k.next = () => {
    k.next = next;
    return next(x);
  };
  return k;
}
