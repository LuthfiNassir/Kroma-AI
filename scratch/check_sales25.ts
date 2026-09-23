import { SAMPLE_DATASETS } from "../lib/dataEngine";
import Papa from "papaparse";

const parsed = Papa.parse(SAMPLE_DATASETS.sales25.trim(), { header: true, dynamicTyping: true }).data as any[];
console.log("RowCount:", parsed.length);
const totalRev = parsed.reduce((s, r) => s + (Number(r.Revenue) || 0), 0);
const totalCost = parsed.reduce((s, r) => s + (Number(r.Cost) || 0), 0);
const totalUnits = parsed.reduce((s, r) => s + (Number(r.Units) || 0), 0);
console.log("Total Rev:", totalRev);
console.log("Total Cost:", totalCost);
console.log("Total Units:", totalUnits);
console.log("Total Profit:", totalRev - totalCost);
console.log("Avg Rev:", totalRev / parsed.length);
