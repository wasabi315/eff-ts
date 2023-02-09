import * as E from "./effect.ts";

class Flip extends E.Effect<boolean> {}

export { type Flip };

export const flip = () => E.perform(new Flip());

function createRunner(f: () => boolean) {
  return <E1 extends E.Effect, T>(
    comp: E.Effectful<E1, T>
  ): E.Effectful<Exclude<E1, Flip>, T> => {
    return E.tryWith(comp, {
      effc(when) {
        when(Flip, (_eff, k) => k.continue(f()));
      },
    });
  };
}

export const runRandom = createRunner(() => Math.random() < 0.5);
export const runTrue = createRunner(() => true);
export const runFalse = createRunner(() => false);
