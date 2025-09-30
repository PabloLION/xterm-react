## XTerm React

This project provides a React component that integrates the [xterm.js](https://xtermjs.org/) terminal emulator library. It aims to offer a more up-to-date and flexible alternative to [existing solutions](https://github.com/robert-harbison/xterm-for-react)(last commit Jul 8, 2022), with a focus on performance, code style, and additional functionality.

### Live Example

- On Replit: <https://replit.com/@PabloLION/XTerm-React?v=1>
- A example page with mb github pages. #TODO

## Usage

## Installation

To install the component, use `npm`, `yarn`, or `pnpm`:

```sh
npm install @pablo-lion/xterm-react
# or
yarn add @pablo-lion/xterm-react
# or
pnpm add @pablo-lion/xterm-react
```

### Code Example

Import the `XTerm` component and use it within your React application:

```jsx
import React from "react";
import { XTerm } from "@pablo-lion/xterm-react";

export default function App() {
  return <XTerm />;
}
```

### Docs

For the documentation of the `XTerm` component, check [XTerm-React Docs](./docs.md).

- See also [official xterm.js documentation](https://xtermjs.org/docs/api/terminal/).

### Props

The `XTerm` component accepts several props to customize its behavior, including `options` for terminal options, `addons` for loading XTerm addons, and various event handlers like `onData`, `onResize`, and more.
I'll add a full docs later.

## Motivations

- **Personal Use**: Tailored for my own personal requirements and projects.
- **Updated Dependencies**:
  - Utilizes the latest `@xterm/xterm` version than `xterm` to address issues with deprecated add-ons, such as the non-functional `xterm-addon-fit` in resizing terminals.
  - Newer `react` and `typescript` for peer dependencies.
- **Code Style Improvements**:
  - Adopting `XTerm` over `Xterm` for naming consistency.
  - Exposing terminal methods like `.write()`, `.blur()`, etc., directly from the XTerm class, enhancing developer experience and code readability.
  - Transitioning to `@typescript-eslint` for linting over `tslint`.
- **Enhanced Functionality**:
  - Integration of new event listeners from XTerm like `onBell()` and `onWriteParsed()`.
  - Exposure of terminal methods such as `.blur()`, `.focus()`, and more for direct interaction.
  - Introduction of props for custom event handlers like `attachCustomWheelEventHandler()`, `registerLinkProvider()`, etc.
  - Implementation of a new link provider for `registerLinkProvider()`.
- **Performance Optimization**: Removal of dynamic type checking to improve performance.
- **Documentation Enhancements**:
  - Updated documentation to align with `@xterm/xterm`, including new types like `IEventListener`.
  - Detailed comments for methods such as `attachCustomWheelEventHandler`, `registerLinkProvider`, `registerCharacterJoiner`, and others.
- **Development and Testing**: Adoption of `vite` for faster end-to-end testing, with plans to test add-ons thoroughly.

## Development

For development purposes, this project uses `vite` for a streamlined and efficient workflow.

## Release

The release workflow is automated by the [`scripts/prepare-publish.sh`](scripts/prepare-publish.sh) helper. Run the script with
either a semantic version bump (`--bump major|minor|patch`) or an explicit `--version` value to prepare and publish a release.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues to discuss potential improvements or features.

- For dev, `pnpm` is recommended.

### Credits

- [XTerm.js:](https://xtermjs.org/)
- [React](https://reactjs.org/)
- [robert-harbison/xterm-for-react](https://github.com/robert-harbison/xterm-for-react)

#### Honorable mentions

I found many many packages after finishing this project... I felt like I wasted 2 days but it seems to me that mine has the most up-to-date xterm.js version and the most features added to `xterm-for-react`.

- [xterm-react](https://www.npmjs.com/package/xterm-react)
- [react-xterm](https://www.npmjs.com/package/react-xterm)
- [react-xtermjs](https://www.npmjs.com/package/react-xtermjs)
- [oas-xterm-for-react18](https://www.npmjs.com/package/oas-xterm-for-react18)
- [@devt8/xterm-for-react](https://www.npmjs.com/package/@devt8/xterm-for-react)
- [xterm-for-react-fixed](https://www.npmjs.com/package/xterm-for-react-fixed)

### Decisions

#### Do we need a `useXterm` hook?

I can wrap up this to a `useXterm` hook like the example below, but I think it's better to just keep it as a component. If you want to use it as a hook, make an issue or shoot me a message.
Definition of `useXterm` hook can be like this:

```tsx
import { useRef, useEffect } from "react";
import XTerm from "./XTerm";

const useXTerm = () => {
  const xtermRef = useRef();

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.write = xtermRef.current.write.bind(xtermRef.current);
      xtermRef.current.focus = xtermRef.current.focus.bind(xtermRef.current);
      xtermRef.current.blur = xtermRef.current.blur.bind(xtermRef.current);
    }
  }, []);

  return {
    setRef: xtermRef,
    write: (data) => xtermRef.current.write(data),
    focus: () => xtermRef.current.focus(),
    blur: () => xtermRef.current.blur(),
  };
};

export default useXTerm;
```

Then, in use it is like this

```tsx
import React, { useEffect } from "react";
import XTerm from "./XTerm";
import useXTerm from "./useXTerm";

const App = () => {
  const { setRef, write, focus, blur } = useXTerm<XTerm>(null);

  useEffect(() => {
    write("Hello, XTerm!\n");
    focus();
  }, []);

  return (
    <div>
      <h1>Using XTerm with Custom Hook</h1>
      <XTerm ref={setRef} />
      <button onClick={() => write("Button clicked!\n")}>
        Write to Terminal
      </button>
      <button onClick={focus}>Focus Terminal</button>
      <button onClick={blur}>Blur Terminal</button>
    </div>
  );
};

export default App;
```

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
