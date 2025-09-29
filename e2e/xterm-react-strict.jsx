import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { XTerm } from "../src/XTerm";

const App = () => {
  const xTermRef = useRef(null);
  useEffect(() => {
    xTermRef.current?.terminal.writeln(
      "Hello from \x1B[1;3;31mxterm-react\x1B[0m in React.StrictMode"
    );
    xTermRef.current?.terminal.write("$ ");
  }, []);
  return (
    <div>
      <h1 style={{ fontFamily: "monospace" }}>
        XTerm React Component under React.StrictMode
      </h1>
      <XTerm
        id={"xterm-strict"}
        ref={xTermRef}
        onData={(data) => {
          xTermRef.current?.terminal.write(data);
        }}
        options={{
          cursorBlink: true,
          cursorStyle: "underline",
          fontSize: 14,
          fontFamily: "monospace",
          theme: {
            background: "#000000",
            foreground: "#FFFFFF",
            cursor: "#FFFFFF",
            // selection: "#FFFFFF", this doesn't exist in ITheme
            // black: "#000000",
            // red: "#FF0000",
            // green: "#00FF00",
            // yellow: "#FFFF00",
            // blue: "#0000FF",
            // magenta: "#FF00FF",
            // cyan: "#00FFFF",
            // white: "#FFFFFF",
            // brightBlack: "#808080",
            // brightRed: "#FF0000",
            // brightGreen: "#00FF00",
            // brightYellow: "#FFFF00",
            // brightBlue: "#0000FF",
            // brightMagenta: "#FF00FF",
            // brightCyan: "#00FFFF",
            // brightWhite: "#FFFFFF",
          },
        }}
      />
    </div>
  );
};

const rootElement = document.getElementById("root-xterm-react-strict");

if (rootElement) {
  const root = createRoot(rootElement); // createRoot(container!) if you use TypeScript
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Root element not found");
}
