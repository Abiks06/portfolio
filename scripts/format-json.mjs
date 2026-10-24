/**
 * Writes JSON the way content/resume.json is hand-formatted: two-space indent, with
 * arrays of plain values, and simple objects inside arrays, kept on one line
 * when they fit. Machine edits then produce small, readable diffs.
 */
const WIDTH = 160;
const plain = (v) => v === null || typeof v !== "object";
const inline = (v) =>
  Array.isArray(v) ? `[${v.map(inline).join(", ")}]` : plain(v) ? JSON.stringify(v) : `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(", ")} }`;

function format(value, indent, prefix, inArray) {
  if (plain(value)) return JSON.stringify(value);
  const flat = Array.isArray(value) ? value.every(plain) : inArray && Object.values(value).every((x) => plain(x) || (Array.isArray(x) && x.every(plain)));
  if (flat || (Array.isArray(value) && value.length === 0)) {
    const one = inline(value);
    if (indent.length + prefix.length + one.length <= WIDTH) return one;
  }
  const inner = indent + "  ";
  if (Array.isArray(value)) return `[\n${value.map((v) => inner + format(v, inner, "", true)).join(",\n")}\n${indent}]`;
  const lines = Object.entries(value).map(([k, v]) => {
    const key = `${JSON.stringify(k)}: `;
    return inner + key + format(v, inner, key, false);
  });
  return `{\n${lines.join(",\n")}\n${indent}}`;
}

export const formatJson = (value) => format(value, "", "", false) + "\n";
