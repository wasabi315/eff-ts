import { Effect as Eff } from "../src/mod.ts";

class Flip extends Eff.Effect<boolean> {}

const flip = () => Eff.perform(new Flip());

function run<T>(prob: number, comp: Eff.Effectful<T>) {
  return Eff.tryWith(comp, {
    effc(match) {
      return match.with(Flip, (_eff, k) => k.continue(Math.random() < prob));
    },
  });
}

function* main() {
  for (let i = 0; i < 5; i++) {
    if (yield* flip()) {
      console.log(i);
    }
  }
}

console.log("------------");
Eff.run(run(0, main()));
console.log("------------");
Eff.run(run(0.5, main()));
console.log("------------");
Eff.run(run(1, main()));
console.log("------------");
