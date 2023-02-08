import {
  Effect as E,
  State,
  Reader,
  Raise as R,
  Flip as F,
  Defer as D,
} from "../src/effect.ts";

const S1 = State<string>();
const S2 = State<number>();
const R1 = Reader<number>();

function* main(): E.Effectful<number> {
  yield* D.defer(() => console.log("defer 1"));
  console.log(yield* S1.get(), yield* S2.get());
  yield* S1.modify((str) => str + ", world!");
  console.log(yield* S1.get(), yield* S2.get());
  if (yield* F.flip()) {
    yield* R.raise("error");
  }
  yield* D.defer(() => console.log("defer 2"));
  console.log(yield* S1.get(), yield* S2.get());
  yield* S2.put(yield* R1.ask());
  console.log(yield* S1.get(), yield* S2.get());
  if (yield* F.flip()) {
    yield* R.raise("error");
  }
  console.log(yield* S1.get(), yield* S2.get());
  return yield* R1.ask();
}

console.log(
  E.run(
    D.run(F.runRandom(R.run(R1.run(10, S1.run("Hello", S2.run(0, main()))))))
  )
);
