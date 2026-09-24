// Only the requested level is fetched; gzip is decoded explicitly so static hosts
// need no special Content-Encoding configuration. Cache only one level in memory.
let cached;
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
  const stream = new Blob(parts)
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const expected = Math.max(
    ...data.pieces.map((p) => p.offset + p.vertices * 12 + p.triangles * 12),
  );
  if (buffer.byteLength !== expected)
    throw new Error("Atlas geometry is incomplete. Please retry.");
  cached = { mode, data, buffer };
  return cached;
}
