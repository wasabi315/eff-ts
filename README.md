# eff-ts

An effect handler implementation with JavaScript/TypeScript Generators.
This is for my educational purpose.

## What is this?

- Provides mostly the same API as OCaml's [deep handlers](https://v2.ocaml.org/api/Effect.Deep.html).
- Fully typed.
- Aims to be effect-safe. See the [effect-safe](https://github.com/wasabi315/eff-ts/tree/effect-safe) branch for in-progress implementation.

## How to define custom effects

The following code defines a custom effect that behaves like Golang's defer construct.

```typescript
// 1. Define `Defer` effect by extending `Effect`.
class Defer extends Eff.Effect<void> {
  // Defer carries a nullary function which will be invoked later.
  constructor(public thunk: () => void) {
    super();
  }
}

// 2. Define a helper function that simply perform `Defer`.
const defer = (thunk: () => void) => Eff.perform(new Defer(thunk));

// 3. Define a function that handle `Defer` with the `matchWith` function.
function runDefer<T>(comp: Eff.Effectful<E, T>) {
  const thunks: (() => void)[] = [];

  return Eff.matchWith(comp, {
    // Value handler: what you want to do when `comp` returns a value `x`.
    retc(x) {
      // Execute thunks then return `x` as is.
      thunks.forEach((thunk) => thunk());
      return x;
    },

    // Error handler: what you want to do when `comp` throws an exception `err`.
    errc(err) {
      // Execute thunks then rethrow `err`.
      thunks.forEach((thunk) => thunk());
      throw err;
    },

    // Effect handler: what you want to do when `comp` performs effects.
    effc(when) {
      // When Defer is performed, save the thunk carried by the effect then resume the continuation `k` with a void value.
      when(Defer, (eff, k) => {
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
function* main(): Eff.Effectful<void> {
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
Eff.run(runDefer(main()));
```

## How does it work?

> An effectful computation can be represented as a generator that yields effects.

:construction: TODO

## Future works

- [ ] Provide the [discontinue](https://v2.ocaml.org/api/Effect.Deep.html#VALdiscontinue) functionality.
- [ ] Be effect-safe.

## Related works and references

- [OCaml's manual for effect handlers](https://v2.ocaml.org/releases/5.0/manual/effects.html)
- [Effect.Deep](https://v2.ocaml.org/api/Effect.Deep.html)
- [co](https://www.npmjs.com/package/co)
- [susisu/effects](https://github.com/susisu/effects)

## License

[MIT License](https://opensource.org/licenses/mit-license.php)
