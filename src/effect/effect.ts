export class Effect<T = unknown> {
  #_!: T;
  toString() {
    return this.constructor.name;
  }
}

export type UnEffect<E> = E extends Effect<infer T> ? T : never;

export type Effectful<E extends Effect, T> = Generator<E, T>;

export type Continuation<E extends Effect, T, S> = {
  continue(...arg: [] | [T]): Effectful<E, S>;
};

export type Handler<E1 extends Effect, E2 extends Effect, T, S> = {
  retc(x: T): S;
  errc(err: unknown): S;
  effc(eff: E1): ((k: Continuation<E2, unknown, S>) => Effectful<E2, S>) | null;
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
): Effectful<E2, S> {
  function* attachHandlers(comp: Effectful<E1, T>): Effectful<E2, S> {
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

      const handler = handlers.effc(res.value);
      if (handler === null) {
        prev = yield res.value as unknown as E2;
        continue;
      }

      return yield* handler(createCont(comp));
    }
  }

  function createCont(comp: Effectful<E1, T>): Continuation<E2, unknown, S> {
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
): Effectful<E2, T> =>
  matchWith<E1, E2, T, T>(comp, {
    retc(x) {
      return x;
    },
    errc(err) {
      throw err;
    },
    effc: handlers.effc,
  });

function* _continue<E extends Effect, T>(
  k: Effectful<E, T>,
  ...x: [] | [unknown]
): Effectful<E, T> {
  let prev = x[0];
  while (true) {
    const { value, done } = k.next(prev);
    if (done) {
      return value;
    }
    prev = yield value;
  }
}
