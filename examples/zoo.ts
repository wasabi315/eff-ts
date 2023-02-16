import { Async as A, Exception as E, State, Reader } from "../src/mod.ts";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const S1 = State<number>();
const S2 = State<string>();
const R = Reader<number>();

function* main() {
  // You can have multiple different states.
  console.log(yield* S1.get(), yield* S2.get());

  const m = yield* R.ask();
  yield* S1.put(m);
  console.log(yield* S1.get(), yield* S2.get());

  // Note that the built-in async-await construct is not used here!
  yield* A._await(sleep(1000));

  yield* S2.modify((str) => str + ", world!");
  console.log(yield* S1.get(), yield* S2.get());

  try {
    if ((yield* S1.get()) === 100) {
      yield* E.raise("S1's state is 100");
    }
  } finally {
    console.log("Actual S1's state is", yield* S1.get());
  }

  // Will not be executed.
  console.log(yield* S1.get(), yield* S2.get());
}

A.run(E.run(R.run(100, S1.run(0, S2.run("Hello", main()))))).then((res) =>
  console.log(res)
);
