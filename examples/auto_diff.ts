import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

import { matchWith } from "../src/effect.ts";
import { Effect as Eff } from "../src/mod.ts";

type Ad = {
  readonly value: number;
  deriv: number;
};

const mk = (value: number): Ad => ({
  value,
  deriv: 0,
});

class Add extends Eff.Effect<Ad> {
  constructor(public lhs: Ad, public rhs: Ad) {
    super();
  }
}

class Sub extends Eff.Effect<Ad> {
  constructor(public lhs: Ad, public rhs: Ad) {
    super();
  }
}

class Mul extends Eff.Effect<Ad> {
  constructor(public lhs: Ad, public rhs: Ad) {
    super();
  }
}

class Div extends Eff.Effect<Ad> {
  constructor(public lhs: Ad, public rhs: Ad) {
    super();
  }
}

function run(f: Eff.Effectful<Ad>): void {
  Eff.run(matchWith(f, {
    retc(r) {
      r.deriv = 1;
      return r;
    },
    exnc(err) {
      throw err;
    },
    effc(match) {
      return match
        .with(Add, function* (eff, k) {
          const x = mk(eff.lhs.value + eff.rhs.value);
          yield* k.continue(x);
          eff.lhs.deriv += x.deriv;
          eff.rhs.deriv += x.deriv;
          return x;
        })
        .with(Sub, function* (eff, k) {
          const x = mk(eff.lhs.value - eff.rhs.value);
          yield* k.continue(x);
          eff.lhs.deriv += x.deriv;
          eff.rhs.deriv -= x.deriv;
          return x;
        })
        .with(Mul, function* (eff, k) {
          const x = mk(eff.lhs.value * eff.rhs.value);
          yield* k.continue(x);
          eff.lhs.deriv += eff.rhs.value * x.deriv;
          eff.rhs.deriv += eff.lhs.value * x.deriv;
          return x;
        })
        .with(Div, function* (eff, k) {
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
  constructor(public expr: () => Eff.Effectful<Ad>) {}

  static mk(x: Ad) {
    return new Expr(() => Eff.pure(x));
  }

  #mkBinOp = (eff: (x: Ad, y: Ad) => Eff.Effect<Ad>) => {
    return (rhs: this) => {
      return new Expr((function* (this: Expr) {
        const x = yield* this.expr();
        const y = yield* rhs.expr();
        return yield* Eff.perform(eff(x, y));
      }).bind(this));
    };
  };

  add = this.#mkBinOp((x, y) => new Add(x, y));
  sub = this.#mkBinOp((x, y) => new Sub(x, y));
  mul = this.#mkBinOp((x, y) => new Mul(x, y));
  div = this.#mkBinOp((x, y) => new Div(x, y));
}

type SetTupleElem<T extends unknown[], S> = {
  [K in keyof T]: S;
};

function grad<Exprs extends Expr[]>(
  f: (...args: Exprs) => Expr,
  ...args: SetTupleElem<Exprs, number>
): SetTupleElem<Exprs, number> {
  const ads = args.map(mk);
  const exprs = ads.map(Expr.mk) as Exprs;
  run(f(...exprs).expr());
  return ads.map(({ deriv }) => deriv) as SetTupleElem<Exprs, number>;
}

// f(x) = x^2 + x^3
// df/dx = 2*x + 3*x^2
function f(x: Expr) {
  return x.mul(x).add(x.mul(x).mul(x));
}
for (let x = 0; x < 10; x++) {
  assertEquals(grad(f, x), [(2 * x) + (3 * x * x)]);
}

// g(x, y) = x^2 * y^4
// dg/dx = 2 * x * y^4
// dg/dy = 4 * x^2 * y^3
function g(x: Expr, y: Expr) {
  return x.mul(x).mul(y).mul(y).mul(y).mul(y);
}
for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    assertEquals(grad(g, x, y), [
      2 * x * y * y * y * y,
      4 * x * x * y * y * y,
    ]);
  }
}
