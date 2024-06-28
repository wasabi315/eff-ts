import {
  Effect,
  Effectful,
  perform,
  runEffectful,
  tryWith,
} from "../src/mod.ts";

class Flip extends Effect<boolean> {}

const flip = () => perform(new Flip());

function runFlip<Row extends Effect, T>(prob: number, comp: Effectful<Row, T>) {
  return tryWith<Row, Flip, T>(comp, {
    effc(on) {
      on(Flip, (_, k) => k.continue(Math.random() < prob));
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
runEffectful(runFlip(0, main()));
console.log("------------");
runEffectful(runFlip(0.5, main()));
console.log("------------");
runEffectful(runFlip(1, main()));
console.log("------------");
