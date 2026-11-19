export const PRODUCT_CSV_COLUMNS = [
  "name", "category_path", "brand", "price", "quantity", "description", "image_files",
  "default_color_name", "sizes_json", "colors_json", "specifications_json",
  "custom_print_options_json", "custom_product_options_json", "custom_design_guidelines",
  "requires_customer_design", "allow_design_instructions", "discount_enabled", "offer",
  "deal_enabled", "deal_label", "reviews_enabled", "warranty",
];

export function parseCsv(text) {
  const input = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (!rows.length) throw new Error("The CSV file is empty.");
  const headers = rows.shift().map((value) => value.trim().toLowerCase());
  if (!headers.includes("name") || !headers.includes("category_path")) throw new Error("CSV must include name and category_path columns.");
  return rows.map((values, index) => Object.fromEntries(headers.map((header, column) => [header, values[column] || ""]).concat([["__row", String(index + 2)]])));
}

export function stringifyCsv(headers, rows) {
  const quote = (value) => {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `\uFEFF${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n")}`;
}

export function parseJsonCell(row, name, fallback = []) {
  if (!row[name]?.trim()) return fallback;
  try { return JSON.parse(row[name]); }
  catch { throw new Error(`Row ${row.__row}: ${name} must contain valid JSON.`); }
}
