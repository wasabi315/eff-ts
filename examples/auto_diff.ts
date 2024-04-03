import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

import {
  Effect,
  Effectful,
  matchWith,
  perform,
  pure,
  runEffectful,
} from "../src/mod.ts";

type Ad = {
  readonly value: number;
  deriv: number;
};

const mk = (value: number): Ad => ({
  value,
  deriv: 0,
});

class BinOp extends Effect<Ad> {
  constructor(public lhs: Ad, public rhs: Ad) {
    super();
  }
}
class Add extends BinOp {}
class Sub extends BinOp {}
class Mul extends BinOp {}
class Div extends BinOp {}

function run(f: Effectful<Ad>): void {
  runEffectful(matchWith(f, {
    retc(r) {
      r.deriv = 1;
      return r;
    },
    exnc(err) {
      throw err;
    },
    effc(on) {
      on(Add, function* (eff, k) {
        const x = mk(eff.lhs.value + eff.rhs.value);
        yield* k.continue(x);
        eff.lhs.deriv += x.deriv;
        eff.rhs.deriv += x.deriv;
        return x;
      });
      on(Sub, function* (eff, k) {
        const x = mk(eff.lhs.value - eff.rhs.value);
        yield* k.continue(x);
        eff.lhs.deriv += x.deriv;
        eff.rhs.deriv -= x.deriv;
        return x;
      });
      on(Mul, function* (eff, k) {
        const x = mk(eff.lhs.value * eff.rhs.value);
        yield* k.continue(x);
        eff.lhs.deriv += eff.rhs.value * x.deriv;
        eff.rhs.deriv += eff.lhs.value * x.deriv;
        return x;
      });
      on(Div, function* (eff, k) {
        const x = mk(eff.lhs.value / eff.rhs.value);
        yield* k.continue(x);
        eff.lhs.deriv += x.deriv / eff.rhs.value;
        eff.rhs.deriv -= (x.value * eff.lhs.value) /
          (eff.rhs.value * eff.rhs.value);
        return x;
      });
    },
  }));
}

class Expr {
  private constructor(private expr: () => Effectful<Ad>) {}

  static mk(x: Ad) {
    return new Expr(() => pure(x));
  }

  #mkBinOp = (eff: (x: Ad, y: Ad) => Effect<Ad>) => {
    return (rhs: this) => {
      return new Expr((function* (this: Expr) {
        const x = yield* this.expr();
        const y = yield* rhs.expr();
        return yield* perform(eff(x, y));
      }).bind(this));
    };
  };

  add = this.#mkBinOp((x, y) => new Add(x, y));
  sub = this.#mkBinOp((x, y) => new Sub(x, y));
  mul = this.#mkBinOp((x, y) => new Mul(x, y));
  div = this.#mkBinOp((x, y) => new Div(x, y));

  diff() {
    return run(this.expr());
  }
}

function grad<T extends Expr[]>(
  f: (...args: T) => Expr,
  ...args: { [i in keyof T]: number }
): { [i in keyof T]: number } {
  const ads = args.map(mk);
  const exprs = ads.map(Expr.mk) as T;
  f(...exprs).diff();
  return ads.map(({ deriv }) => deriv) as ReturnType<typeof grad<T>>;
}

// f(x) = x^2 + x^3
// df/dx = 2*x + 3*x^2
const f = (x: Expr) => x.mul(x).add(x.mul(x).mul(x));

for (let x = 0; x < 10; x++) {
  assertEquals(grad(f, x), [(2 * x) + (3 * x * x)]);
}

// g(x, y) = x^2 * y^4
// dg/dx = 2 * x * y^4
// dg/dy = 4 * x^2 * y^3
const g = (x: Expr, y: Expr) => x.mul(x).mul(y).mul(y).mul(y).mul(y);

for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    assertEquals(grad(g, x, y), [
      2 * x * y * y * y * y,
      4 * x * x * y * y * y,
    ]);
  }
}
