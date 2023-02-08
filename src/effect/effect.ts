export class Effect {
  toString() {
    return this.constructor.name;
  }
}

export type Effectful<T> = Generator<Effect, T>;

export type Continuation<T, S> = {
  continue(...arg: [] | [T]): Effectful<S>;
};

export type Handler<T, S> = {
  retc(x: T): S;
  errc(err: Error): S;
  effc(eff: Effect): ((k: Continuation<unknown, S>) => Effectful<S>) | null;
};

export function* perform<T>(eff: Effect): Effectful<T> {
  return (yield eff) as T;
}

export function run<T>(comp: Effectful<T>): T {
  const { value, done } = comp.next();
  if (!done) {
    throw new Error(`Unhandled Effect: ${value}`);
  }
  return value;
}

export function matchWith<T, S>(
  comp: Effectful<T>,
  handlers: Handler<T, S>
): Effectful<S> {
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

      const handler = handlers.effc(res.value);
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

export const tryWith = <T>(
  comp: Effectful<T>,
  handlers: Pick<Handler<T, T>, "effc">
): Effectful<T> =>
  matchWith<T, T>(comp, {
    retc(x) {
      return x;
    },
    errc(err) {
      throw err;
    },
    effc: handlers.effc,
  });

function* _continue<T>(k: Effectful<T>, ...x: [] | [unknown]): Effectful<T> {
  let prev = x[0];
  while (true) {
    const { value, done } = k.next(prev);
    if (done) {
      return value;
    }
    prev = yield value;
  }
}
