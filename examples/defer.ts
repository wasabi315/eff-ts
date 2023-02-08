import { Effect as E, Defer as D } from "../src/effect.ts";

function* main(): E.Effectful<void> {
  console.log("counting");
  for (let i = 0; i < 10; i++) {
    yield* D.defer(() => console.log(i));
  }
  console.log("done");
}

E.run(D.run(main()));
