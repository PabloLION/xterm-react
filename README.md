## Why

1. for my own use
2. Outdated. Use new `@xterm/xterm` to support the deprecated add-ons.
   The `xterm-addon-fit` is not working properly. It's not resizing the terminal when the window is resized.
3. Code style.
   - Naming (`XTerm` instead of `Xterm`, etc.)
   - expose more methods like `.write()` directly, with docstrings! so we no longer need to say `.current.terminal.write()` any more, as they become `use .current.write()`
     This (exposing many methods) generally has minimal impact on performance but can affect memory usage slightly if many instances are created. Although it's not recommended to have dead code in the production (the exposed methods are all dead code), having them here is beneficial for development.
   - Use `@typescript-eslint` instead of `tslint`.
4. Functionality.

   - Hook new event listeners from XTerm like `onBell()` and `onWriteParsed()`.
   - Expose terminal methods like `blur()`, `focus()`, etc.
   - New custom event handler for `attachCustomWheelEventHandler()`.
   - New link provider for `registerLinkProvider()`.

5. Performance. Remove dynamic type checking. It's not necessary and the performance is not good.
6. Documentation. Slightly changes the documentation to align with that from `@xterm/xterm`, with new types like `IEventListener`.
7. Development. Use `vite` for e2e test, much faster than `webpack`.
