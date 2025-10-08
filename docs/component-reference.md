# XTerm React Component Reference

## Props

### `XTerm` Props

**`Prop` with '?' is optional.**

| Prop                                                              | Description                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| className?: string                                                | Class name to add to the terminal container.                                                                                                                                                                                                                                                                                                                                        |
| options?: ITerminalOptions & ITerminalInitOnlyOptions             | Options to initialize the terminal with.                                                                                                                                                                                                                                                                                                                                            |
| addons?: ITerminalAddon[]                                         | An array of XTerm addons to load along with the terminal.                                                                                                                                                                                                                                                                                                                           |
| onBell?: IEventListener\<void>                                    | Adds an event listener for when the bell is triggered.                                                                                                                                                                                                                                                                                                                              |
| onBinary?: IEventListener\<string>                                | Adds an event listener for when a binary event fires. This is used to enable non UTF-8 conformant binary messages to be sent to the backend. Currently, this is only used for a certain type of mouse reports that happen to be not UTF-8 compatible. The event value is a JS string, pass it to the underlying pty as binary data, e.g., `pty.write(Buffer.from(data, 'binary'))`. |
| onCursorMove?: IEventListener\<void>                              | Adds an event listener for the cursor moves.                                                                                                                                                                                                                                                                                                                                        |
| onData?: IEventListener\<string>                                  | Adds an event listener for when a data event fires. This happens, for example, when the user types or pastes into the terminal. The event value is whatever `string` results. In a typical setup, this should be passed on to the backing pty.                                                                                                                                      |
| onKey?: IEventListener\<{ key: string; domEvent: KeyboardEvent }> | Adds an event listener for when a key is pressed. The event value contains the string that will be sent in the data event as well as the DOM event that triggered it.                                                                                                                                                                                                               |
| onLineFeed?: IEventListener\<void>                                | Adds an event listener for when a line feed is added.                                                                                                                                                                                                                                                                                                                               |
| onRender?: IEventListener\<{ start: number; end: number }>        | Adds an event listener for when rows are rendered. The event value contains the start row and end rows of the rendered area (ranges from `0` to `Terminal.rows - 1`).                                                                                                                                                                                                               |
| onWriteParsed?: IEventListener\<void>                             | Adds an event listener for when data has been parsed by the terminal, after `write` is called. This event is useful to listen for any changes in the buffer. This fires at most once per frame, after data parsing completes. Note that this can fire when there are still writes pending if there is a lot of data.                                                                |
| onResize?: IEventListener\<{ cols: number; rows: number }>        | Adds an event listener for when the terminal is resized. The event value contains the new size.                                                                                                                                                                                                                                                                                     |
| onScroll?: IEventListener\<number>                                | Adds an event listener for when a scroll occurs. The event value is the new position of the viewport.                                                                                                                                                                                                                                                                               |
| onSelectionChange?: IEventListener\<void>                         | Adds an event listener for when a selection change occurs.                                                                                                                                                                                                                                                                                                                          |
| onTitleChange?: IEventListener\<string>                           | Adds an event listener for when an OSC 0 or OSC 2 title change occurs. The event value is the new title.                                                                                                                                                                                                                                                                            |
| customKeyEventHandler?: (event: KeyboardEvent) => boolean         | Attaches a custom key event handler which is run before keys are processed, giving consumers of xterm.js ultimate control as to what keys should be processed by the terminal and what keys should not.                                                                                                                                                                             |
| customWheelEventHandler?: (event: WheelEvent) => boolean          | Attaches a custom wheel event handler which is run before wheel events are processed, giving consumers of xterm.js control over whether to proceed or cancel terminal wheel events.                                                                                                                                                                                                 |
| linkProvider?: ILinkProvider                                      | Registers a link provider, allowing a custom parser to be used to match and handle links. Multiple link providers can be used; they will be asked in the order in which they are registered. This prop is the link provider to use to detect links in the terminal.                                                                                                                 |
| characterJoiner?: (text: string) => \[number, number][]           | (EXPERIMENTAL) Registers a character joiner, allowing custom sequences of characters to be rendered as a single unit. This is useful in particular for rendering ligatures and graphemes, among other things. Each registered character joiner is called with a string of text representing a portion of a line in the terminal that can be rendered as a single unit.              |

P.S. These 3 props are new (not in xterm-for-react)

- customWheelEventHandler
- linkProvider
- characterJoiner

## Calling XTerm Functions

If we don't have a wrapper for a specific method in XTerm.js you can call any function in XTerm.js using a ref. [You can look here for the functions provided by XTerm.js](https://xtermjs.org/docs/)

(There will soon wrapper functions for XTerm.js functions but right now you will need to use a ref.)

```jsx
import * as React from "react";

export const Terminal = () => {
  const xterm = React.useRef(null);

  React.useEffect(() => {
    // You can call most method in XTerm.js by using 'xterm.current.[METHOD_NAME]`
    // For not exposed methods below, we have to use 'xterm.current.terminal.[METHOD_NAME]`
    xterm.current.writeln("Hello, World!");
  }, []);

  return (
    // Create a new terminal and set it's ref.
    <XTerm ref={xterm} />
  );
};
```

### Not exposed functions

- registeredCharacterJoiner
- deregisterCharacterJoiner
- registerMarker
- registerDecoration

### Exposed functions

| Method                                                             | Description                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blur(): void`                                                     | Unfocus the terminal.                                                                                                                                                                                                                                                                                                               |
| `focus(): void`                                                    | Focus the terminal.                                                                                                                                                                                                                                                                                                                 |
| `input(data: string, wasUserInput?: boolean): void`                | Input data to the application side. The data is treated the same way input typed into the terminal would (i.e., the `onData` event will fire). `wasUserInput` is true by default and triggers additional behavior like focus or selection clearing. Set this to false if the data sent should not be treated like user input would. |
| `resize(columns: number, rows: number): void`                      | Resizes the terminal. It's best practice to debounce calls to resize, this will help ensure that the pty can respond to the resize event before another one occurs.                                                                                                                                                                 |
| `hasSelection(): boolean`                                          | Gets whether the terminal has an active selection.                                                                                                                                                                                                                                                                                  |
| `getSelection(): string`                                           | Gets the terminal's current selection, useful for implementing copy behavior outside of xterm.js.                                                                                                                                                                                                                                   |
| `getSelectionPosition(): IBufferRange \| undefined`                | Gets the selection position or undefined if there is no selection.                                                                                                                                                                                                                                                                  |
| `clearSelection(): void`                                           | Clears the current terminal selection.                                                                                                                                                                                                                                                                                              |
| `select(column: number, row: number, length: number): void`        | Selects text within the terminal.                                                                                                                                                                                                                                                                                                   |
| `selectAll(): void`                                                | Selects all text within the terminal.                                                                                                                                                                                                                                                                                               |
| `selectLines(start: number, end: number): void`                    | Selects text in the buffer between 2 lines.                                                                                                                                                                                                                                                                                         |
| `scrollLines(amount: number): void`                                | Scrolls the display of the terminal by a number of lines.                                                                                                                                                                                                                                                                           |
| `scrollPages(pageCount: number): void`                             | Scrolls the display of the terminal by a number of pages.                                                                                                                                                                                                                                                                           |
| `scrollToTop(): void`                                              | Scrolls the display of the terminal to the top.                                                                                                                                                                                                                                                                                     |
| `scrollToBottom(): void`                                           | Scrolls the display of the terminal to the bottom.                                                                                                                                                                                                                                                                                  |
| `scrollToLine(line: number): void`                                 | Scrolls to a line within the buffer.                                                                                                                                                                                                                                                                                                |
| `clear(): void`                                                    | Clears the entire buffer, making the prompt line the new first line.                                                                                                                                                                                                                                                                |
| `write(data: string \| Uint8Array, callback?: () => void): void`   | Writes data to the terminal. The data can be raw bytes as `Uint8Array` from the pty or a string. Raw bytes will be treated as UTF-8 encoded, string data as UTF-16. An optional callback fires when the data is processed by the parser.                                                                                            |
| `writeln(data: string \| Uint8Array, callback?: () => void): void` | Writes data to the terminal, followed by a newline character (`\n`). The data can be raw bytes as `Uint8Array` from the pty or a string. Raw bytes will be treated as UTF-8 encoded, string data as UTF-16. An optional callback fires when the data is processed by the parser.                                                    |
| `paste(data: string): void`                                        | Writes text to the terminal, performing the necessary transformations for pasted text.                                                                                                                                                                                                                                              |
| `refresh(start: number, end: number): void`                        | Tells the renderer to refresh terminal content between two rows (inclusive) at the next opportunity.                                                                                                                                                                                                                                |
| `clearTextureAtlas(): void`                                        | Clears the texture atlas of the canvas renderer if it's active, forcing a redraw of all glyphs to workaround issues like texture corruption in some environments (e.g., Chromium/Nvidia after resuming from sleep).                                                                                                                 |
| `reset(): void`                                                    | Performs a full reset (RIS, aka `\x1bc`).                                                                                                                                                                                                                                                                                           |
| `loadAddon(addon: ITerminalAddon): void`                           | Loads an addon into this instance of xterm.js.                                                                                                                                                                                                                                                                                      |

## Terminal Options

You can pass XTerm.js `@xterm/xterm` [ITerminalOptions](https://xtermjs.org/docs/api/terminal/interfaces/iterminaloptions/) option that you want to use to instantiate the XTerm.js 'Terminal' as props to this XTerm component.

```tsx
// Import XTerm
import { XTerm } from "@pablo-lion/xterm-react";

// Render the component
export const Terminal = () => {
  return <XTerm options={{ lineHeight: 3 }} />;
};
```

## Addons

You can use XTerm.js addons by using the `addons` prop. This prop is an array of addons you want to load.

The add-ons are:

- <https://www.npmjs.com/package/@xterm/addon-image>
- <https://www.npmjs.com/package/@xterm/addon-fit>
- <https://www.npmjs.com/package/@xterm/addon-webgl>
- <https://www.npmjs.com/package/@xterm/addon-canvas>
- <https://www.npmjs.com/package/@xterm/addon-web-links>
- <https://www.npmjs.com/package/@xterm/addon-unicode11>
- <https://www.npmjs.com/package/@xterm/addon-search>

You can see an example of using addons please see [this](https://github.com/robert-harbison/xterm-for-react/blob/master/example/src/examples/Addons.js) file in the example folder from the foreign repo `xterm-for-react`.

```jsx
// Import the addon
// import { SearchAddon } from "xterm-addon-search" // old out-of-support add-on
import { SearchAddon } from "@xterm/addon-search"

// Instantiate the addon
const searchAddon = new SearchAddon()

// Load the addons as a prop
export default function Terminal(): JSX.Element {
  return <XTerm options={{ lineHeight: 3 }} addons={[searchAddon]} />;
}
```
