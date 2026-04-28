/**
 * CSV loader robusto, tolerante a:
 * - Headers en cualquier orden
 * - Filas con campos faltantes
 * - Comillas escapadas
 * - Valores numéricos como string
 * - Booleanos como "true"/"false"/"1"/"0"/"yes"/"no"
 */

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
};

/**
 * Parsea CSV a array de objetos, manejando comillas y comas dentro de strings.
 */
export function parseCsv(content: string): ParsedCsv {
  const warnings: string[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], warnings: ["Empty CSV"] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length !== headers.length) {
      warnings.push(
        `Row ${i + 1}: expected ${headers.length} cells, got ${cells.length}`,
      );
    }
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cells[j] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows, warnings };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

// =============== Type coercers ===============

export function toNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === null || value === "") return fallback;
  const cleaned = value.toString().replace(/[€$£,\s]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export function toInt(value: string | undefined, fallback = 0): number {
  return Math.round(toNumber(value, fallback));
}

export function toBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  const v = value.toString().trim().toLowerCase();
  if (["true", "1", "yes", "y", "sí", "si"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  return fallback;
}

export function toString(value: string | undefined, fallback = ""): string {
  return value === undefined || value === null ? fallback : value.toString().trim();
}

export function toDateOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Helper: obtiene el valor de la primera key disponible (case insensitive).
 * Útil cuando los CSVs vienen con headers ligeramente distintos.
 */
export function pick(
  row: Record<string, string>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = row[k.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

export function hoursAgo(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}
