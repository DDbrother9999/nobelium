const ENTITIES = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

const BLOCK_TAG = /<\/?(p|div|br|hr|li|ul|ol|h[1-6]|blockquote|table|tr|td|th|figure|figcaption)\b[^>]*>/gi;

function decodeEntity(match, entity) {
  if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] ?? "";
  const point = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
  return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
}

export function htmlToText(html) {
  return (html || "")
    .replace(/<[^>]*$/, "")
    .replace(BLOCK_TAG, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .replace(/&[#a-z0-9]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(html, length) {
  const text = htmlToText(html);
  if (text.length <= length) return text;
  const cut = text.lastIndexOf(" ", length);
  return `${text.slice(0, cut > 0 ? cut : length)}…`;
}
