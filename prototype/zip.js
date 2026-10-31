// zip.js — a small ZIP writer (files stored, not compressed: PNGs are compressed already and SVGs are small).
// zip([{ name, data }]) → Blob, where data is a string, a Blob or a Uint8Array. File names are UTF-8.
const TABLE = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = TABLE[(c ^ u8[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };

export async function zip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  const now = new Date(), time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let offset = 0;
  for (const file of files) {
    const data = typeof file.data === 'string' ? enc.encode(file.data) : file.data instanceof Blob ? new Uint8Array(await file.data.arrayBuffer()) : file.data;
    const name = enc.encode(file.name), crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(10, time, true); local.setUint16(12, date, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, name.length, true);
    parts.push(local, name, data);
    const head = new DataView(new ArrayBuffer(46));
    head.setUint32(0, 0x02014b50, true); head.setUint16(4, 20, true); head.setUint16(6, 20, true); head.setUint16(8, 0x0800, true); head.setUint16(12, time, true); head.setUint16(14, date, true);
    head.setUint32(16, crc, true); head.setUint32(20, data.length, true); head.setUint32(24, data.length, true); head.setUint16(28, name.length, true); head.setUint32(42, offset, true);
    central.push(head, name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
