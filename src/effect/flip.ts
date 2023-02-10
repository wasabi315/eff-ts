import * as Eff from "./effect.ts";

class Flip extends Eff.Effect<boolean> {}

export { type Flip };

export const flip = () => Eff.perform(new Flip());

function createRunner(f: () => boolean) {
  return <E extends Eff.Effect, T>(comp: Eff.Effectful<E, T>) => {
    return Eff.tryWith<E, Flip, T>(comp, {
      effc(when) {
        when(Flip, (_eff, k) => k.continue(f()));
      },
    });
  };
}

export const runRandom = createRunner(() => Math.random() < 0.5);
export const runTrue = createRunner(() => true);
export const runFalse = createRunner(() => false);
