import * as E from "./effect.ts";

class Flip extends E.Effect {}

export const flip = () => E.perform<boolean>(new Flip());

function createRunner(f: () => boolean) {
  return <T>(comp: E.Effectful<T>): E.Effectful<T> => {
    return E.tryWith(comp, {
      effc(eff) {
        if (eff instanceof Flip) {
          return (k) => k.continue(f());
        }
        return null;
      },
    });
  };
}

export const runRandom = createRunner(() => Math.random() < 0.5);
export const runTrue = createRunner(() => true);
export const runFalse = createRunner(() => false);
