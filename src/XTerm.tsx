import "@xterm/xterm/css/xterm.css";

import * as React from "react";

// We are using these as types.
// eslint-disable-next-line no-unused-vars
import {
  type ITerminalAddon,
  type ITerminalOptions,
  type ITerminalInitOnlyOptions,
  type IEvent,
  Terminal,
} from "@xterm/xterm";

export type IEventListener<T, U = void> = (arg1: T, arg2: U) => any;

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
  addons?: Array<ITerminalAddon>;

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
  onData: IEventListener<string>;

  /**
   * Adds an event listener for when a key is pressed. The event value contains the
   * string that will be sent in the data event as well as the DOM event that
   * triggered it.
   */
  onKey: IEventListener<{ key: string; domEvent: KeyboardEvent }>;

  /**
   * Adds an event listener for when a line feed is added.
   */
  onLineFeed: IEventListener<void>;

  /**
   * Adds an event listener for when rows are rendered. The event value
   * contains the start row and end rows of the rendered area (ranges from `0`
   * to `Terminal.rows - 1`).
   */
  onRender: IEventListener<{ start: number; end: number }>;

  /**
   * Adds an event listener for when data has been parsed by the terminal,
   * after {@link write} is called. This event is useful to listen for any
   * changes in the buffer.
   *
   * This fires at most once per frame, after data parsing completes. Note
   * that this can fire when there are still writes pending if there is a lot
   * of data.
   */
  onWriteParsed: IEventListener<void>;

  /**
   * Adds an event listener for when the terminal is resized. The event value
   * contains the new size.
   */
  onResize: IEventListener<{ cols: number; rows: number }>;

  /**
   * Adds an event listener for when a scroll occurs. The event value is the
   * new position of the viewport.
   */
  onScroll: IEventListener<number>;

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
   * @param event The custom KeyboardEvent handler to attach.
   * This is a function that takes a KeyboardEvent, allowing consumers to stop
   * propagation and/or prevent the default action. The function returns
   * whether the event should be processed by xterm.js.
   */
  customKeyEventHandler?(event: KeyboardEvent): boolean;
}

interface XTermInstance {
  terminal: Terminal;
  elementRef: React.RefObject<HTMLDivElement>;
  columnCount: number;
  rowCount: number;
  blur: () => void;
  focus: () => void;
}
export class XTerm extends React.Component<XTermProps> {
  /**
   * The ref to the element containing the terminal.
   * This replaces the `element` property in the `@xterm/xterm` class `Terminal`.
   */
  readonly elementRef!: React.RefObject<HTMLDivElement>; // Assigned in constructor

  /**
   * XTerm.js Terminal object.
   */
  public terminal!: Terminal; // Assigned in constructor

  /**
   * Creates a new `XTerm` component which contains an instance of `@xterm/xterm` class `Terminal`.
   *
   * @param options An object containing a set of options.
   */
  constructor(props: XTermProps) {
    super(props);
    this.elementRef = React.createRef();

    // Setup the XTerm terminal.
    this.terminal = new Terminal(this.props.options);

    // Load addons if the prop exists.
    this.props.addons?.forEach((addon) => {
      this.terminal.loadAddon(addon);
    });

    // Bind Methods. The class methods are not bound by default.
    this.onData = this.onData.bind(this);
    this.onCursorMove = this.onCursorMove.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onBinary = this.onBinary.bind(this);
    this.onLineFeed = this.onLineFeed.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.onRender = this.onRender.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onTitleChange = this.onTitleChange.bind(this);

    // Create Listeners
    this.terminal.onBinary(this.onBinary);
    this.terminal.onCursorMove(this.onCursorMove);
    this.terminal.onData(this.onData);
    this.terminal.onKey(this.onKey);
    this.terminal.onLineFeed(this.onLineFeed);
    this.terminal.onScroll(this.onScroll);
    this.terminal.onSelectionChange(this.onSelectionChange);
    this.terminal.onRender(this.onRender);
    this.terminal.onResize(this.onResize);
    this.terminal.onTitleChange(this.onTitleChange);

    // Add Custom Key Event Handler
    if (this.props.customKeyEventHandler) {
      this.terminal.attachCustomKeyEventHandler(
        this.props.customKeyEventHandler,
      );
    }
  }

  componentDidMount() {
    if (this.elementRef.current) {
      // Creates the terminal within the container element.
      this.terminal.open(this.elementRef.current);
    }
  }

  componentWillUnmount() {
    // When the component unmounts dispose of the terminal and all of its listeners.
    this.terminal.dispose();
  }

  /**
   * Adds an event listener for when the bell is triggered.
   * @returns an `IDisposable` to stop listening.
   */
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

  private onScroll(newPosition: number) {
    if (this.props.onScroll) this.props.onScroll(newPosition);
  }

  private onSelectionChange() {
    if (this.props.onSelectionChange) this.props.onSelectionChange();
  }

  private onRender(event: { start: number; end: number }) {
    if (this.props.onRender) this.props.onRender(event);
  }

  private onResize(event: { cols: number; rows: number }) {
    if (this.props.onResize) this.props.onResize(event);
  }

  private onTitleChange(newTitle: string) {
    if (this.props.onTitleChange) this.props.onTitleChange(newTitle);
  }

  render() {
    return <div className={this.props.className} ref={this.elementRef} />;
  }
}
