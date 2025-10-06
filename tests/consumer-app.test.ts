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
