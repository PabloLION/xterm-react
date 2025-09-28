import "@xterm/xterm/css/xterm.css";

import * as React from "react";

// We are using these as types.

import {
  type IBufferRange,
  type ILinkProvider,
  type ITerminalAddon,
  type ITerminalInitOnlyOptions,
  type ITerminalOptions,
  Terminal,
} from "@xterm/xterm";

// Listener of `@xterm/xterm` `IEvent`
export type IEventListener<T, U = void> = (arg1: T, arg2: U) => void;

interface XTermProps {
  /**
   * Class name to add to the terminal container.
   */
  className?: string;

  /**
   * Options to initialize the terminal with.
   */
  options?: ITerminalOptions & ITerminalInitOnlyOptions;

  /**
   * An array of XTerm addons to load along with the terminal.
   */
  addons?: ITerminalAddon[];

  /**
   * Adds an event listener for when the bell is triggered.
   */
  onBell?: IEventListener<void>;

  /**
   * Adds an event listener for when a binary event fires. This is used to
   * enable non UTF-8 conformant binary messages to be sent to the backend.
   * Currently this is only used for a certain type of mouse reports that
   * happen to be not UTF-8 compatible.
   * The event value is a JS string, pass it to the underlying pty as
   * binary data, e.g. `pty.write(Buffer.from(data, 'binary'))`.
   */
  onBinary?: IEventListener<string>;

  /**
   * Adds an event listener for the cursor moves.
   */
  onCursorMove?: IEventListener<void>;

  /**
   * Adds an event listener for when a data event fires. This happens for
   * example when the user types or pastes into the terminal. The event value
   * is whatever `string` results, in a typical setup, this should be passed
   * on to the backing pty.
   */
  onData?: IEventListener<string>;

  /**
   * Adds an event listener for when a key is pressed. The event value contains the
   * string that will be sent in the data event as well as the DOM event that
   * triggered it.
   */
  onKey?: IEventListener<{ key: string; domEvent: KeyboardEvent }>;

  /**
   * Adds an event listener for when a line feed is added.
   */
  onLineFeed?: IEventListener<void>;

  /**
   * Adds an event listener for when rows are rendered. The event value
   * contains the start row and end rows of the rendered area (ranges from `0`
   * to `Terminal.rows - 1`).
   */
  onRender?: IEventListener<{ start: number; end: number }>;

  /**
   * Adds an event listener for when data has been parsed by the terminal,
   * after {@link write} is called. This event is useful to listen for any
   * changes in the buffer.
   *
   * This fires at most once per frame, after data parsing completes. Note
   * that this can fire when there are still writes pending if there is a lot
   * of data.
   */
  onWriteParsed?: IEventListener<void>;

  /**
   * Adds an event listener for when the terminal is resized. The event value
   * contains the new size.
   */
  onResize?: IEventListener<{ cols: number; rows: number }>;

  /**
   * Adds an event listener for when a scroll occurs. The event value is the
   * new position of the viewport.
   */
  onScroll?: IEventListener<number>;

  /**
   * Adds an event listener for when a selection change occurs.
   */
  onSelectionChange?: IEventListener<void>;

  /**
   * Adds an event listener for when an OSC 0 or OSC 2 title change occurs.
   * The event value is the new title.
   */
  onTitleChange?: IEventListener<string>;

  /**
   * Attaches a custom key event handler which is run before keys are
   * processed, giving consumers of xterm.js ultimate control as to what keys
   * should be processed by the terminal and what keys should not.
   *
   * This prop defines the custom KeyboardEvent handler to attach, which is a
   * function that takes a KeyboardEvent, allowing consumers to stop
   * propagation and/or prevent the default action. The function returns
   * whether the event should be processed by xterm.js.
   *
   * @example A custom keymap that overrides the backspace key
   * ```ts
   * const keymap = [
   *   { "key": "Backspace", "shiftKey": false, "mapCode": 8 },
   *   { "key": "Backspace", "shiftKey": true, "mapCode": 127 }
   * ];
   *
   * const keyEventHandler = (ev => {
   *   if (ev.type === 'keydown') {
   *     for (let i in keymap) {
   *       if (keymap[i].key == ev.key && keymap[i].shiftKey == ev.shiftKey) {
   *         socket.send(String.fromCharCode(keymap[i].mapCode));
   *         return false;
   *       }
   *     }
   *   }
   * });
   *
   * <XTerm customKeyEventHandler={keyEventHandler} />
   * ```
   */
  customKeyEventHandler?(event: KeyboardEvent): boolean;

  /**
   * Attaches a custom wheel event handler which is run before wheel events are
   * processed, giving consumers of xterm.js control over whether to proceed
   * or cancel terminal wheel events.
   *
   * This prop defines the custom WheelEvent handler to attach, which is a
   * function that takes a WheelEvent, allowing consumers to stop propagation
   * and/or prevent the default action. The function returns whether the event
   * should be processed by xterm.js.
   */
  customWheelEventHandler?(event: WheelEvent): boolean;

  /**
   * Registers a link provider, allowing a custom parser to be used to match
   * and handle links. Multiple link providers can be used, they will be asked
   * in the order in which they are registered.
   * This props is the link provider to use to detect links in the terminal.
   */
  linkProvider?: ILinkProvider;

  /**
   * (EXPERIMENTAL) Registers a character joiner, allowing custom sequences of
   * characters to be rendered as a single unit. This is useful in particular
   * for rendering ligatures and graphemes, among other things.
   *
   * Each registered character joiner is called with a string of text
   * representing a portion of a line in the terminal that can be rendered as
   * a single unit. The joiner must return a sorted array, where each entry is
   * itself an array of length two, containing the start (inclusive) and end
   * (exclusive) index of a substring of the input that should be rendered as
   * a single unit. When multiple joiners are provided, the results of each
   * are collected. If there are any overlapping substrings between them, they
   * are combined into one larger unit that is drawn together.
   *
   * All character joiners that are registered get called every time a line is
   * rendered in the terminal, so it is essential for the handler function to
   * run as quickly as possible to avoid slowdowns when rendering. Similarly,
   * joiners should strive to return the smallest possible substrings to
   * render together, since they aren't drawn as optimally as individual
   * characters.
   *
   * NOTE: character joiners are only used by the canvas renderer.
   *
   * This props is the function that determines character joins. It is called
   * with a string of text that is eligible for joining and returns an array
   * where each entry is an array containing the start (inclusive) and end
   * (exclusive) indexes of ranges that should be rendered as a single unit.
   * @returns The ID of the new joiner, this can be used to deregister
   *
   * NOTE xterm-react: To use a dynamic character joiner, register it via the
   * `.terminal` property with the `.terminal.registeredCharacterJoiner()` and
   * `.terminal.deregisterCharacterJoiner()` methods.
   */
  characterJoiner?: (text: string) => [number, number][];

  /**
   * (EXPERIMENTAL) Deregisters the character joiner if one was registered.
   * NOTE: character joiners are only used by the canvas renderer.
   */
  // Just not implemented. For dynamic characterJoiner, user should register it
  // Via `.terminal` property with the `.registeredCharacterJoiner()` method.
  // * deregisterCharacterJoiner?: (joinerId: number) => void;

  /**
   * Adds a marker to the normal buffer and returns it.
   * @param cursorYOffset The y position offset of the marker from the cursor.
   * @returns The new marker or undefined.
   */
  // Not implemented. It requires to manipulate the dom element directly, which
  // Is not recommended in React.
  // * registerMarker?: (cursorYOffset?: number) => IMarker;

  /**
   * (EXPERIMENTAL) Adds a decoration to the terminal using
   * @param decorationOptions, which takes a marker and an optional anchor,
   * width, height, and x offset from the anchor. Returns the decoration or
   * undefined if the alt buffer is active or the marker has already been
   * disposed of.
   * @throws when options include a negative x offset.
   */
  // Not implemented. It requires to manipulate the dom element directly, which
  // Is not recommended in React.
  // * registerDecoration?: (decorationOptions: IDecorationOptions) =>
  // IDecoration | undefined;
}

export class XTerm extends React.Component<XTermProps> {
  /**
   * The ref to the element containing the terminal.
   * This replaces the `element` property in the `@xterm/xterm` class `Terminal`.
   * Assigned in constructor.
   */
  readonly elementRef!: React.RefObject<HTMLDivElement | null>;

  /**
   * XTerm.js Terminal object. Assigned in lifecycle componentDidMount.
   */
  public terminal!: Terminal;

  /**
   * Creates a new `XTerm` component which contains an instance of `@xterm/xterm` class `Terminal`.
   *
   * @param options An object containing a set of options.
   */
  constructor(props: XTermProps) {
    super(props);
    this.elementRef = React.createRef();
  }

  componentDidMount() {
    // Setup the XTerm terminal.
    this.terminal = new Terminal(this.props.options);

    // Bind Methods. The class methods are not bound by default.
    this.onBell = this.onBell.bind(this);
    this.onBinary = this.onBinary.bind(this);
    this.onCursorMove = this.onCursorMove.bind(this);
    this.onData = this.onData.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onLineFeed = this.onLineFeed.bind(this);
    this.onRender = this.onRender.bind(this);
    this.onWriteParsed = this.onWriteParsed.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.onTitleChange = this.onTitleChange.bind(this);

    // Create Listeners
    this.terminal.onBell(this.onBell);
    this.terminal.onBinary(this.onBinary);
    this.terminal.onCursorMove(this.onCursorMove);
    this.terminal.onData(this.onData);
    this.terminal.onKey(this.onKey);
    this.terminal.onLineFeed(this.onLineFeed);
    this.terminal.onScroll(this.onScroll);
    this.terminal.onWriteParsed(this.onWriteParsed);
    this.terminal.onSelectionChange(this.onSelectionChange);
    this.terminal.onRender(this.onRender);
    this.terminal.onResize(this.onResize);
    this.terminal.onTitleChange(this.onTitleChange);

    // Load addons if the prop exists.
    this.props.addons?.forEach((addon) => {
      this.terminal.loadAddon(addon);
    });

    // Add Custom Key Event Handler
    if (this.props.customKeyEventHandler) {
      this.terminal.attachCustomKeyEventHandler(
        this.props.customKeyEventHandler
      );
    }

    // Add Custom Wheel Event Handler
    if (this.props.customWheelEventHandler) {
      this.terminal.attachCustomWheelEventHandler(
        this.props.customWheelEventHandler
      );
    }

    // Add Link Provider
    if (this.props.linkProvider) {
      this.terminal.registerLinkProvider(this.props.linkProvider);
    }

    // Add Character Joiner
    if (this.props.characterJoiner) {
      this.terminal.registerCharacterJoiner(this.props.characterJoiner);
    }

    // Creates the terminal in the container element.
    if (
      this.elementRef.current === null ||
      this.elementRef.current === undefined
    ) {
      throw new Error("XTerm-React: The container element is not defined.");
    }
    this.terminal.open(this.elementRef.current);
  }

  componentWillUnmount() {
    // When the component unmounts dispose of the terminal and all of its listeners.
    this.terminal.dispose();
  }

  render() {
    return <div className={this.props.className} ref={this.elementRef} />;
  }

  /**
   * Unfocus the terminal.
   */
  public blur(): void {
    this.terminal.blur();
  }

  /**
   * Focus the terminal.
   */
  public focus(): void {
    this.terminal.focus();
  }

  /**
   * Input data to application side. The data is treated the same way input
   * typed into the terminal would (ie. the {@link onData} event will fire).
   * @param data The data to forward to the application.
   * @param wasUserInput Whether the input is genuine user input. This is true
   * by default and triggers additional behavior like focus or selection
   * clearing. Set this to false if the data sent should not be treated like
   * user input would, for example passing an escape sequence to the
   * application.
   */
  public input(data: string, wasUserInput?: boolean): void {
    this.terminal.input(data, wasUserInput);
  }

  /**
   * Resizes the terminal. It's best practice to debounce calls to resize,
   * this will help ensure that the pty can respond to the resize event
   * before another one occurs.
   * @param x The number of columns to resize to.
   * @param y The number of rows to resize to.
   */
  public resize(columns: number, rows: number): void {
    this.terminal.resize(columns, rows);
  }

  /**
   * Opens the terminal within an element. This should also be called if the
   * xterm.js element ever changes browser window.
   * @param parent The element to create the terminal within. This element
   * must be visible (have dimensions) when `open` is called as several DOM-
   * based measurements need to be performed when this function is called.
   */
  // This is not implemented in the XTerm class, only in `@xterm/xterm` class `Terminal`.
  // #open(parent: HTMLElement): void;

  /**
   * Gets whether the terminal has an active selection.
   */
  public hasSelection(): boolean {
    return this.terminal.hasSelection();
  }

  /**
   * Gets the terminal's current selection, this is useful for implementing
   * copy behavior outside of xterm.js.
   */
  public getSelection(): string {
    return this.terminal.getSelection();
  }

  /**
   * Gets the selection position or undefined if there is no selection.
   */
  public getSelectionPosition(): IBufferRange | undefined {
    return this.terminal.getSelectionPosition();
  }

  /**
   * Clears the current terminal selection.
   */
  public clearSelection(): void {
    this.terminal.clearSelection();
  }

  /**
   * Selects text within the terminal.
   * @param column The column the selection starts at.
   * @param row The row the selection starts at.
   * @param length The length of the selection.
   */
  public select(column: number, row: number, length: number): void {
    this.terminal.select(column, row, length);
  }

  /**
   * Selects all text within the terminal.
   */
  public selectAll(): void {
    this.terminal.selectAll();
  }

  /**
   * Selects text in the buffer between 2 lines.
   * @param start The 0-based line index to select from (inclusive).
   * @param end The 0-based line index to select to (inclusive).
   */
  public selectLines(start: number, end: number): void {
    this.terminal.selectLines(start, end);
  }

  /*
   * Disposes of the terminal, detaching it from the DOM and removing any
   * active listeners. Once the terminal is disposed it should not be used
   * again.
   */
  // Implemented in the lifecycle method `componentWillUnmount`.
  // Dispose(): void;

  /**
   * Scroll the display of the terminal
   * @param amount The number of lines to scroll down (negative scroll up).
   */
  public scrollLines(amount: number): void {
    this.terminal.scrollLines(amount);
  }

  /**
   * Scroll the display of the terminal by a number of pages.
   * @param pageCount The number of pages to scroll (negative scrolls up).
   */
  public scrollPages(pageCount: number): void {
    this.terminal.scrollPages(pageCount);
  }

  /**
   * Scrolls the display of the terminal to the top.
   */
  public scrollToTop(): void {
    this.terminal.scrollToTop();
  }

  /**
   * Scrolls the display of the terminal to the bottom.
   */
  public scrollToBottom(): void {
    this.terminal.scrollToBottom();
  }

  /**
   * Scrolls to a line within the buffer.
   * @param line The 0-based line index to scroll to.
   */
  public scrollToLine(line: number): void {
    this.terminal.scrollToLine(line);
  }

  /**
   * Clear the entire buffer, making the prompt line the new first line.
   */
  public clear(): void {
    this.terminal.clear();
  }

  /**
   * Write data to the terminal.
   * @param data The data to write to the terminal. This can either be raw
   * bytes given as Uint8Array from the pty or a string. Raw bytes will always
   * be treated as UTF-8 encoded, string data as UTF-16.
   * @param callback Optional callback that fires when the data was processed
   * by the parser.
   */
  public write(data: string | Uint8Array, callback?: () => void): void {
    this.terminal.write(data, callback);
  }

  /**
   * Writes data to the terminal, followed by a break line character (\n).
   * @param data The data to write to the terminal. This can either be raw
   * bytes given as Uint8Array from the pty or a string. Raw bytes will always
   * be treated as UTF-8 encoded, string data as UTF-16.
   * @param callback Optional callback that fires when the data was processed
   * by the parser.
   */
  public writeln(data: string | Uint8Array, callback?: () => void): void {
    this.terminal.writeln(data, callback);
  }

  /**
   * Writes text to the terminal, performing the necessary transformations for
   * pasted text.
   * @param data The text to write to the terminal.
   */
  public paste(data: string): void {
    this.terminal.paste(data);
  }

  /**
   * Tells the renderer to refresh terminal content between two rows
   * (inclusive) at the next opportunity.
   * @param start The row to start from (between 0 and this.rows - 1).
   * @param end The row to end at (between start and this.rows - 1).
   */
  public refresh(start: number, end: number): void {
    this.terminal.refresh(start, end);
  }

  /**
   * Clears the texture atlas of the canvas renderer if it's active. Doing
   * this will force a redraw of all glyphs which can workaround issues
   * causing the texture to become corrupt, for example Chromium/Nvidia has an
   * issue where the texture gets messed up when resuming the OS from sleep.
   */
  public clearTextureAtlas(): void {
    this.terminal.clearTextureAtlas();
  }

  /**
   * Perform a full reset (RIS, aka '\x1bc').
   */
  public reset(): void {
    this.terminal.reset();
  }

  /**
   * Loads an addon into this instance of xterm.js.
   * @param addon The addon to load.
   */
  // Implemented by `props.addons` in the constructor.
  // LoadAddon(addon: ITerminalAddon): void;

  private onBell() {
    if (this.props.onBell) this.props.onBell();
  }
  private onBinary(data: string): void {
    if (this.props.onBinary) this.props.onBinary(data);
  }
  private onCursorMove() {
    if (this.props.onCursorMove) this.props.onCursorMove();
  }
  private onData(data: string) {
    if (this.props.onData) this.props.onData(data);
  }
  private onKey(event: { key: string; domEvent: KeyboardEvent }) {
    if (this.props.onKey) this.props.onKey(event);
  }
  private onLineFeed() {
    if (this.props.onLineFeed) this.props.onLineFeed();
  }
  private onRender(event: { start: number; end: number }) {
    if (this.props.onRender) this.props.onRender(event);
  }
  private onWriteParsed() {
    if (this.props.onWriteParsed) this.props.onWriteParsed();
  }
  private onResize(event: { cols: number; rows: number }) {
    if (this.props.onResize) this.props.onResize(event);
  }
  private onScroll(newPosition: number) {
    if (this.props.onScroll) this.props.onScroll(newPosition);
  }
  private onSelectionChange() {
    if (this.props.onSelectionChange) this.props.onSelectionChange();
  }
  private onTitleChange(newTitle: string) {
    if (this.props.onTitleChange) this.props.onTitleChange(newTitle);
  }
}
