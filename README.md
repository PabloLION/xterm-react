## XTerm for React

This project provides a React component that integrates the [xterm.js](https://xtermjs.org/) terminal emulator library. It aims to offer a more up-to-date and flexible alternative to existing [solutions](https://github.com/robert-harbison/xterm-for-react), with a focus on performance, code style, and additional functionality.

## Installation

To install the component, use package manager like npm, yarn or pnpm:

```bash
npm install xterm-react
# or
yarn add xterm-react
# or
pnpm add xterm-react
```

## Usage

Import the `XTerm` component and use it within your React application:

```jsx
import React from "react";
import { XTerm } from "xterm-react";

export default function App() {
  return <XTerm />;
}
```

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

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues to discuss potential improvements or features.

- For dev, `pnpm` is recommended.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
