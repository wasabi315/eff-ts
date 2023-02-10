import {
  Effect as Eff,
  State,
  Reader,
  Exception as Exn,
  Flip as F,
  Defer as D,
} from "../src/effect.ts";

const S1 = State<"S1", string>();
const S2 = State<"S2", number>();
const R1 = Reader<"R1", number>();

function* main() {
  yield* D.defer(() => console.log("defer 1"));
  console.log(yield* S1.get(), yield* S2.get());
  yield* S1.modify((str) => str + ", world!");
  console.log(yield* S1.get(), yield* S2.get());
  if (yield* F.flip()) {
    yield* Exn.raise("error");
  }
  yield* D.defer(() => console.log("defer 2"));
  console.log(yield* S1.get(), yield* S2.get());
  yield* S2.put(yield* R1.ask());
  console.log(yield* S1.get(), yield* S2.get());
  if (yield* F.flip()) {
    yield* Exn.raise("error");
  }
  console.log(yield* S1.get(), yield* S2.get());
  return yield* R1.ask();
}

console.log(
  Eff.run(
    D.run(F.runRandom(Exn.run(R1.run(10, S1.run("Hello", S2.run(0, main()))))))
  )
);
