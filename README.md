# eff-ts

An effect handler implementation with JavaScript/TypeScript Generators.
This is for my educational purpose.

## Features

- Provides mostly the same API as OCaml's [deep handlers](https://v2.ocaml.org/api/Effect.Deep.html).
- Fully typed.
- Aims to be effect-safe. See the [effect-safe](https://github.com/wasabi315/eff-ts/tree/effect-safe) branch for in-progress implementation.

## Try it!

```sh
deno run examples/defer.ts
```

See the [examples](https://github.com/wasabi315/eff-ts/tree/main/examples) directory for more examples.

## How to define and use effects

The following code defines an effect that behaves like Golang's defer construct.

```typescript
// 1. Define `Defer` effect by extending `Effect`.
class Defer extends Effect<void> {
  // Defer carries a nullary function which will be invoked later.
  constructor(public thunk: () => void) {
    super();
  }
}

// 2. Define a helper function that simply perform `Defer`.
const defer = (thunk: () => void) => perform(new Defer(thunk));

// 3. Define a function that handle `Defer` with the `matchWith` function.
function runDefer<T>(comp: Effectful<E, T>) {
  const thunks: (() => void)[] = [];

  return matchWith(comp, {
    // Value handler: what you want to do when `comp` returns a value `x`.
    retc(x) {
      // Execute thunks then return `x` as is.
      thunks.forEach((thunk) => thunk());
      return x;
    },

    // Exception handler: what you want to do when `comp` throws an exception `exn`.
    exnc(exn) {
      // Execute thunks then rethrow `err`.
      thunks.forEach((thunk) => thunk());
      throw exn;
    },

    // Effect handler: what you want to do when `comp` performs effects.
    effc(match) {
      // When Defer is performed, save the thunk carried by the effect then resume the continuation `k` with a void value.
      return match.with(Defer, (eff, k) => {
        thunks.unshift(eff.thunk);
        return k.continue();
      });
    },
  });
}
```

Now you are ready to use the `Defer` effect.

```typescript
// Effectful computations are defined using generators.
function* main(): Effectful<void> {
  console.log("counting");

  for (let i = 0; i < 10; i++) {
    // Use `yield*` when performing effectful computations.
    // It is like the `await` keyword in `async` functions.
    yield* defer(() => console.log(i));
  }

  console.log("done");
}

// Wrap `main()` with `runDefer` to handle the `Defer` effect.
// Then actually execute the wrapped computation with `run`.
runEffectful(runDefer(main()));
```

## How does it work?

> An effectful computation can be represented as a generator that yields effects.

:construction: TODO

## Future works

- [ ] Be effect-safe.

## Related works and references

- [OCaml's manual for effect handlers](https://v2.ocaml.org/releases/5.0/manual/effects.html)
- [Effect.Deep](https://v2.ocaml.org/api/Effect.Deep.html)
- [co](https://www.npmjs.com/package/co)
- [susisu/effects](https://github.com/susisu/effects)

## License

[MIT License](https://opensource.org/licenses/mit-license.php)
