import { Effect as Eff, Async as A } from "../src/mod.ts";
import * as D from "./defer.ts";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function* main(): Eff.Effectful<void> {
  console.log("counting");
  for (let i = 0; i < 10; i++) {
    yield* A._await(sleep(1000));
    console.log(".".repeat(i + 1));
    yield* D.defer(() => console.log(i));
  }
  console.log("done");
}

A.run(D.run(main()));
