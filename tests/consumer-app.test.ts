import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import App from "../version-compatibility-tests/consumer-app/src/App";

test("consumer app renders without throwing", () => {
  assert.doesNotThrow(() => {
    renderToString(React.createElement(App));
  });
});

test("consumer app renders XTerm component", () => {
  const html = renderToString(React.createElement(App));
  assert.ok(html.length > 0, "App should render HTML");
  assert.ok(
    html.includes("xterm") || html.includes("terminal"),
    "Should contain XTerm-related content",
  );
});
