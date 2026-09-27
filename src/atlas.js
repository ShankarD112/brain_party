// Hosts may serve .gz as a file or an HTTP content encoding. Fetch already
// decodes the latter, so inspect the body before decompressing it again.
let cached;
export async function decodeGeometry(blob) {
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (header[0] !== 0x1f || header[1] !== 0x8b) return blob.arrayBuffer();
  return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}
export async function loadAtlas(mode, onProgress = () => {}) {
  if (!["easy", "medium", "hard"].includes(mode))
    throw new Error("Unknown difficulty");
  if (cached?.mode === mode) return cached;
  const base = new URL("data/", document.baseURI);
  const [metadata, geometry] = await Promise.all([
    fetch(new URL(mode + ".json", base)),
    fetch(new URL(mode + ".bin.gz", base)),
  ]);
  if (!metadata.ok || !geometry.ok)
    throw new Error("Atlas download failed. Check your connection and retry.");
  const data = await metadata.json();
  const reader = geometry.body.getReader(),
    parts = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.byteLength;
    onProgress(received);
  }
  const buffer = await decodeGeometry(new Blob(parts));
  const expected = Math.max(
    ...data.pieces.map((p) => p.offset + p.vertices * 12 + p.triangles * 12),
  );
  if (buffer.byteLength !== expected)
    throw new Error("Atlas geometry is incomplete. Please retry.");
  cached = { mode, data, buffer };
  return cached;
}
