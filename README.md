## Why

1. for my own use
2. Outdated. Use new `@xterm/xterm` to support the deprecated add-ons.
   The `xterm-addon-fit` is not working properly. It's not resizing the terminal when the window is resized.
3. Code style. Naming (`XTerm` instead of `Xterm`, etc.); expose more methods like `.write()` directly, so we no longer need to say `.current.terminal.write`
4. Functionality. Add the new methods from XTerm like `onBell()` and `onWriteParsed()`.
5. Performance. Remove dynamic type checking. It's not necessary and the performance is not good.
6. Documentation. Slightly changes the documentation to align with that from `@xterm/xterm`, with new types like `IEventListener`.
7. Development. Use `vite` for e2e test, much faster than `webpack`.
