import * as XLSX from "xlsx";
import type { Row, CellValue } from "../session.js";

export function readWorkbook(filePath: string): XLSX.WorkBook {
  return XLSX.readFile(filePath);
}

export function sheetToRows(sheet: XLSX.WorkSheet): Row[] {
  // header:1 gives array-of-arrays; header:"A" gives col-letter keys
  // We use defval:null so missing cells are null, not undefined
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
  });

  return raw.map((obj) => {
    const row: Row = {};
    for (const [key, val] of Object.entries(obj)) {
      // xlsx serial dates arrive as numbers; keep them as-is until infer_types
      row[key] = val as CellValue;
    }
    return row;
  });
}
