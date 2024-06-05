## Why

1. for my own use
2. Outdated. Use new `@xterm/xterm` to support the deprecated add-ons.
   The `xterm-addon-fit` is not working properly. It's not resizing the terminal when the window is resized.
3. Code style.
   - Naming (`XTerm` instead of `Xterm`, etc.)
   - expose more methods like `.write()`, `blur()`, etc. from the XTerm class with docstrings. So we no longer need to say `.current.terminal.write()` any more, as they become `.current.write()`
     This (exposing many methods) generally has minimal impact on performance but can affect memory usage slightly if many instances are created.
   - Use `@typescript-eslint` instead of `tslint`.
4. Functionality.
   - Hook new event listeners from XTerm like `onBell()` and `onWriteParsed()`.
   - Expose terminal methods like `blur()`, `focus()`, etc.
   - New props for event handlers like `attachCustomWheelEventHandler()`, `registerLinkProvider()`, etc.
   - New link provider for `registerLinkProvider()`.
5. Performance. Remove dynamic type checking. It's not necessary and the performance is not good.
6. Documentation.
   - Slightly changes the documentation to align with that from `@xterm/xterm`, with new types like `IEventListener`.
   - Add comments for these methods:
     - `attachCustomWheelEventHandler` (new)
     - `registerLinkProvider` (new)
     - `registerCharacterJoiner` (new)
     - `deregisterCharacterJoiner` (not implemented)
     - `registerMarker` (not implemented)
     - `registerDecoration` (not implemented)
7. Development. Use `vite` for e2e test, much faster than `webpack`.
