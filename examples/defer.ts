import { Effect as Eff, Defer as D } from "../src/effect.ts";

function* main(): Eff.Effectful<D.Defer, void> {
  console.log("counting");
  for (let i = 0; i < 10; i++) {
    yield* D.defer(() => console.log(i));
  }
  console.log("done");
}

Eff.run(D.run(main()));
