import { Effect as Eff } from "../src/mod.ts";

class Flip extends Eff.Effect<boolean> {}

export { type Flip };

export const flip = () => Eff.perform(new Flip());

export function createRunner(p: number) {
  return function run<E extends Eff.Effect, T>(comp: Eff.Effectful<E, T>) {
    return Eff.tryWith<E, Flip, T>(comp, {
      effc(when) {
        when(Flip, (_eff, k) => k.continue(Math.random() < p));
      },
    });
  };
}

export const _50_50 = createRunner(0.5);
export const alwaysTrue = createRunner(1);
export const alwaysFalse = createRunner(0);

function* main() {
  for (let i = 0; i < 5; i++) {
    if (yield* flip()) {
      console.log(i);
    }
  }
}

if (import.meta.main) {
  console.log("------------");
  Eff.run(alwaysFalse(main()));
  console.log("------------");
  Eff.run(_50_50(main()));
  console.log("------------");
  Eff.run(alwaysTrue(main()));
  console.log("------------");
}
