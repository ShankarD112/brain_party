import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { decodeGeometry } from "../src/atlas.js";

const geometry = new Float32Array([0, 1, 2, 3, 4, 5]);
test("atlas accepts a gzip file and bytes already decoded by HTTP fetch", async () => {
  for (const bytes of [geometry, gzipSync(new Uint8Array(geometry.buffer))]) {
    const result = await decodeGeometry(new Blob([bytes]));
    assert.deepEqual(new Float32Array(result), geometry);
  }
});
test("atlas rejects a truncated gzip body", async () => {
  const packed = gzipSync(new Uint8Array(geometry.buffer));
  await assert.rejects(decodeGeometry(new Blob([packed.subarray(0, packed.length - 8)])));
});
