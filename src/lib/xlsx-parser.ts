export async function parseXlsxFile(file: File): Promise<string[][]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const decoder = new TextDecoder();
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error("Struktur file Excel tidak valid.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Daftar isi Excel tidak valid.");
    const method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const compressed = bytes.slice(dataStart, dataStart + size);
    let data: Uint8Array;
    if (method === 0) data = compressed;
    else if (method === 8) data = new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    else throw new Error("Metode kompresi Excel tidak didukung.");
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  const readXml = (name: string) => {
    const value = entries.get(name);
    return value ? new DOMParser().parseFromString(decoder.decode(value), "application/xml") : null;
  };
  const sharedDoc = readXml("xl/sharedStrings.xml");
  const shared = sharedDoc ? Array.from(sharedDoc.getElementsByTagNameNS("*", "si")).map((si) => Array.from(si.getElementsByTagNameNS("*", "t")).map((t) => t.textContent || "").join("")) : [];
  const sheet = readXml("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("Sheet pertama tidak ditemukan.");
  const rows: string[][] = [];
  for (const rowNode of Array.from(sheet.getElementsByTagNameNS("*", "row"))) {
    const row: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagNameNS("*", "c"))) {
      const letters = (cell.getAttribute("r") || "").match(/[A-Z]+/i)?.[0] || "";
      let col = 0;
      for (const char of letters.toUpperCase()) col = col * 26 + char.charCodeAt(0) - 64;
      const valueNode = cell.getElementsByTagNameNS("*", "v")[0];
      const inline = cell.getElementsByTagNameNS("*", "is")[0];
      let value = valueNode?.textContent || "";
      if (cell.getAttribute("t") === "s") value = shared[Number(value)] || "";
      if (cell.getAttribute("t") === "inlineStr" && inline) value = Array.from(inline.getElementsByTagNameNS("*", "t")).map((t) => t.textContent || "").join("");
      row[col - 1] = value;
    }
    rows.push(row.map((value) => value || ""));
  }
  return rows.filter((row) => row.some((value) => value.trim()));
}