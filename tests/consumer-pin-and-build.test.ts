import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAllowedPackage,
  pickLatestForMajor,
} from "../version-compatibility-tests/scripts/consumer-pin-and-build.mjs";

test("assertAllowedPackage accepts whitelisted names", () => {
  assert.doesNotThrow(() => assertAllowedPackage("react"));
});

test("assertAllowedPackage rejects unexpected names", () => {
  assert.throws(() => assertAllowedPackage("left-pad"), {
    message: /Package name not allowed/,
  });
});

test("pickLatestForMajor returns latest matching version", () => {
  const versions = ["17.9.0", "18.0.0", "18.3.1", "19.1.1"];
  assert.equal(pickLatestForMajor(versions, "18"), "18.3.1");
});

test("pickLatestForMajor returns null when no versions match", () => {
  const versions = ["17.9.0", "18.0.0"];
  assert.equal(pickLatestForMajor(versions, "19"), null);
});
