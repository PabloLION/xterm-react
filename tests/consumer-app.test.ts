import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import reactDomPackage from "react-dom/package.json" with { type: "json" };
import { renderToString } from "react-dom/server";

import App from "../version-compatibility-tests/consumer-app/src/App";

test("react and react-dom versions match", () => {
  const reactVersion = React.version;
  const reactDomVersion = (reactDomPackage as { version: string }).version;
  assert.equal(
    reactVersion,
    reactDomVersion,
    `react (${reactVersion}) and react-dom (${reactDomVersion}) must stay in sync`,
  );
});

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
