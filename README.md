# eff-ts

An effect handler implementation using JavaScript/TypeScript Generators that mimics OCaml's deep effect handlers.

## A basic example

Here is explained how to define and use effects using `Defer` as an example. The full code is available in [examples/defer.ts](https://github.com/wasabi315/eff-ts/tree/main/examples/defer.ts).

1. Define an effect by extending the `Effect` class. `Effect` takes a type parameter that represents the return type of the effectful computation, `void` in this case.

    ```typescript
    class Defer extends Effect<void> {
      // Defer carries a nullary function that will be invoked later.
      thunk: () => void;
      constructor(thunk: () => void) {
        super();
        this.thunk = thunk;
      }
    }
    ```

2. Define a helper function that simply performs the `Defer` effect defined above.

    ```typescript
    const defer = (thunk: () => void) => perform(new Defer(thunk));
    ```

3. Define a handler for the `Defer` effect using `matchWith`. `matchWith` is like `try`-`catch` in JavaScript, but for effects.

    ```typescript
    function runDefer<T>(comp: Effectful<E, T>) {
      // Save thunks to be executed later.
      const thunks: (() => void)[] = [];
    ```

    The `matchWith` function takes two arguments. The first argument is the effectful computation to be handled.

    ```typescript
      return matchWith(comp, {
    ```

    The second argument is an object that contains three handlers: `retc`, `exnc`, and `effc`.
    `retc` is the *value handler*, which is called when the computation returns a value. In this `Defer` example, execute the saved thunks then return the value as is.

    ```typescript
        retc(x) {
          thunks.forEach((thunk) => thunk());
          return x;
        },
    ```

    `exnc` is the *exception handler*, which is called when the computation throws an exception. Here, like `retc`, execute the saved thunks then rethrow the exception.

    ```typescript
        exnc(exn) {
          thunks.forEach((thunk) => thunk());
          throw exn;
        },
    ```

    `effc` is the *effect handler*, which gets called when the computation performs effects. `on`, the argument of `effc`, is for registering handlers for each effect. The first argument of `on` is the constructor of an effect (say `E`) and the second argument is a handler function that takes an effect value of type `E` and its continuation. In this example, save the thunk carried before resuming the computation. Note that you do not need to handle all of the effects in one handler. Effects not handled are passed to the surrounding handler like `try`-`catch`.

    ```typescript
        effc(on) {
          on(Defer, (eff: Defer, cont: Continuation<void, T>) => {
            thunks.unshift(eff.thunk);
            return cont.continue();
          });
        },
      });
    }
    ```

    Here is the full code for the `runDefer` function.

    ```typescript
    function runDefer<T>(comp: Effectful<E, T>) {
      // Save thunks to be executed later.
      const thunks: (() => void)[] = [];
      return matchWith(comp, {
        retc(x) {
          thunks.forEach((thunk) => thunk());
          return x;
        },
        exnc(exn) {
          thunks.forEach((thunk) => thunk());
          throw exn;
        },
        effc(on) {
          // The type annotaion for the handler function is optional as it can be inferred.
          on(Defer, (eff, cont) => {
            thunks.unshift(eff.thunk);
            return cont.continue();
          });
        },
      });
    }
    ```

4. Now you are ready to use the `Defer` effect. Define an effectful computation using generator functions. Use the `yield*` keword to perform effects like the `await` keyword in `async` functions.

    ```typescript
    function* main(): Effectful<void> {
      console.log("counting");

      for (let i = 0; i < 10; i++) {
        yield* defer(() => console.log(i));
      }

      console.log("done");
    }
    ```

5. Finally, run the effectful computation using the `runEffectful` function after wrapping it with the handler.

    ```typescript
    runEffectful(runDefer(main()));
    ```

For more examples, including the `state` effects, see the [examples](https://github.com/wasabi315/eff-ts/tree/main/examples) directory.

## How does it work?

> An effectful computation can be represented as a generator that yields effects.

:construction: TODO

## Related works and references

- [OCaml's manual for effect handlers](https://v2.ocaml.org/releases/5.0/manual/effects.html)
- [Effect.Deep](https://v2.ocaml.org/api/Effect.Deep.html)
- [co](https://www.npmjs.com/package/co)
- [susisu/effects](https://github.com/susisu/effects)

## License

[MIT License](https://opensource.org/licenses/mit-license.php)
