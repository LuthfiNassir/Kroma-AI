// Generate 25 records matching the exact user specification:
// Date, Order_ID, Region, Category, Product, Units, Revenue, Cost, Discount, Customer_Type
// Total records: 25
// Total Units: 198
// Total Revenue: $94,050
// Avg Revenue: $3,762
// Total Profit: $29,510 (Cost = $64,540)
// North: Rev = 26,950, Profit = 8,440 (Cost = 18,510)
// West: Rev = 25,800, Profit = 7,970 (Cost = 17,830)
// East: Rev = 23,800, Profit = 7,430 (Cost = 16,370)
// South: Rev = 17,500, Profit = 5,670 (Cost = 11,830)

export interface EcommerceRow {
  Date: string;
  Order_ID: string;
  Region: "North" | "West" | "East" | "South";
  Category: "Electronics" | "Furniture";
  Product: string;
  Units: number;
  Revenue: number;
  Cost: number;
  Discount: number;
  Customer_Type: "New" | "Returning" | "Corporate";
}

// Let's create rows for each region
const northRows: EcommerceRow[] = [
  { Date: "2026-01-05", Order_ID: "ORD-1001", Region: "North", Category: "Electronics", Product: "Laptop", Units: 3, Revenue: 4200, Cost: 2900, Discount: 0.05, Customer_Type: "Corporate" },
  { Date: "2026-01-26", Order_ID: "ORD-1004", Region: "North", Category: "Furniture", Product: "Standing Desk", Units: 6, Revenue: 5100, Cost: 3500, Discount: 0.10, Customer_Type: "Returning" },
  { Date: "2026-02-16", Order_ID: "ORD-1007", Region: "North", Category: "Electronics", Product: "Monitor", Units: 8, Revenue: 4400, Cost: 3000, Discount: 0.05, Customer_Type: "New" },
  { Date: "2026-03-16", Order_ID: "ORD-1011", Region: "North", Category: "Furniture", Product: "Ergonomic Chair", Units: 9, Revenue: 4050, Cost: 2810, Discount: 0.00, Customer_Type: "Returning" },
  { Date: "2026-04-20", Order_ID: "ORD-1016", Region: "North", Category: "Electronics", Product: "Laptop", Units: 5, Revenue: 6200, Cost: 4300, Discount: 0.10, Customer_Type: "Corporate" },
  { Date: "2026-05-18", Order_ID: "ORD-1021", Region: "North", Category: "Electronics", Product: "Smartphone", Units: 4, Revenue: 3000, Cost: 2000, Discount: 0.05, Customer_Type: "Returning" },
];
// North Rev = 4200+5100+4400+4050+6200+3000 = 26,950
// North Cost = 2900+3500+3000+2810+4300+2000 = 18,510
// North Profit = 26950 - 18510 = 8,440!
// North Units = 3+6+8+9+5+4 = 35

const westRows: EcommerceRow[] = [
  { Date: "2026-01-12", Order_ID: "ORD-1002", Region: "West", Category: "Electronics", Product: "Laptop", Units: 4, Revenue: 5600, Cost: 3900, Discount: 0.05, Customer_Type: "Corporate" },
  { Date: "2026-02-02", Order_ID: "ORD-1005", Region: "West", Category: "Furniture", Product: "Conference Table", Units: 5, Revenue: 4750, Cost: 3300, Discount: 0.10, Customer_Type: "Corporate" },
  { Date: "2026-02-23", Order_ID: "ORD-1008", Region: "West", Category: "Electronics", Product: "Tablet", Units: 10, Revenue: 3800, Cost: 2600, Discount: 0.05, Customer_Type: "New" },
  { Date: "2026-03-23", Order_ID: "ORD-1012", Region: "West", Category: "Furniture", Product: "Ergonomic Chair", Units: 7, Revenue: 3150, Cost: 2180, Discount: 0.00, Customer_Type: "Returning" },
  { Date: "2026-04-27", Order_ID: "ORD-1017", Region: "West", Category: "Electronics", Product: "Monitor", Units: 8, Revenue: 4400, Cost: 3050, Discount: 0.05, Customer_Type: "New" },
  { Date: "2026-05-22", Order_ID: "ORD-1023", Region: "West", Category: "Furniture", Product: "Bookshelf", Units: 9, Revenue: 4100, Cost: 2800, Discount: 0.10, Customer_Type: "Returning" },
];
// West Rev = 5600+4750+3800+3150+4400+4100 = 25,800
// West Cost = 3900+3300+2600+2180+3050+2800 = 17,830
// West Profit = 25800 - 17830 = 7,970!
// West Units = 4+5+10+7+8+9 = 43

const eastRows: EcommerceRow[] = [
  { Date: "2026-01-19", Order_ID: "ORD-1003", Region: "East", Category: "Furniture", Product: "Standing Desk", Units: 5, Revenue: 4250, Cost: 2950, Discount: 0.05, Customer_Type: "Corporate" },
  { Date: "2026-02-09", Order_ID: "ORD-1006", Region: "East", Category: "Electronics", Product: "Laptop", Units: 3, Revenue: 4200, Cost: 2900, Discount: 0.00, Customer_Type: "New" },
  { Date: "2026-03-02", Order_ID: "ORD-1009", Region: "East", Category: "Electronics", Product: "Smartphone", Units: 8, Revenue: 4800, Cost: 3300, Discount: 0.10, Customer_Type: "Returning" },
  { Date: "2026-03-30", Order_ID: "ORD-1013", Region: "East", Category: "Furniture", Product: "Ergonomic Chair", Units: 11, Revenue: 4950, Cost: 3420, Discount: 0.05, Customer_Type: "Corporate" },
  { Date: "2026-05-04", Order_ID: "ORD-1018", Region: "East", Category: "Electronics", Product: "Tablet", Units: 6, Revenue: 2700, Cost: 1850, Discount: 0.00, Customer_Type: "New" },
  { Date: "2026-05-26", Order_ID: "ORD-1024", Region: "East", Category: "Furniture", Product: "Filing Cabinet", Units: 7, Revenue: 2900, Cost: 1950, Discount: 0.05, Customer_Type: "Returning" },
];
// East Rev = 4250+4200+4800+4950+2700+2900 = 23,800
// East Cost = 2950+2900+3300+3420+1850+1950 = 16,370
// East Profit = 23800 - 16370 = 7,430!
// East Units = 5+3+8+11+6+7 = 40

const southRows: EcommerceRow[] = [
  { Date: "2026-03-09", Order_ID: "ORD-1010", Region: "South", Category: "Electronics", Product: "Monitor", Units: 6, Revenue: 3300, Cost: 2200, Discount: 0.05, Customer_Type: "New" },
  { Date: "2026-04-06", Order_ID: "ORD-1014", Region: "South", Category: "Furniture", Product: "Standing Desk", Units: 4, Revenue: 3400, Cost: 2300, Discount: 0.00, Customer_Type: "Returning" },
  { Date: "2026-04-13", Order_ID: "ORD-1015", Region: "South", Category: "Electronics", Product: "Tablet", Units: 9, Revenue: 3150, Cost: 2150, Discount: 0.10, Customer_Type: "Corporate" },
  { Date: "2026-05-11", Order_ID: "ORD-1019", Region: "South", Category: "Furniture", Product: "Ergonomic Chair", Units: 5, Revenue: 2250, Cost: 1520, Discount: 0.05, Customer_Type: "Returning" },
  { Date: "2026-05-15", Order_ID: "ORD-1020", Region: "South", Category: "Electronics", Product: "Smartphone", Units: 3, Revenue: 2100, Cost: 1400, Discount: 0.00, Customer_Type: "New" },
  { Date: "2026-05-20", Order_ID: "ORD-1022", Region: "South", Category: "Furniture", Product: "Bookshelf", Units: 4, Revenue: 1800, Cost: 1200, Discount: 0.05, Customer_Type: "Corporate" },
  { Date: "2026-05-29", Order_ID: "ORD-1025", Region: "South", Category: "Electronics", Product: "Accessories", Units: 49, Revenue: 1500, Cost: 1060, Discount: 0.10, Customer_Type: "Returning" },
];
// South Rev = 3300+3400+3150+2250+2100+1800+1500 = 17,500
// South Cost = 2200+2300+2150+1520+1400+1200+1060 = 11,830
// South Profit = 17500 - 11830 = 5,670!
// South Units = 6+4+9+5+3+4+49 = 80
// Total rows = 6 + 6 + 6 + 7 = 25 rows!
// Total Units = 35 + 43 + 40 + 80 = 198!
// Total Rev = 26950 + 25800 + 23800 + 17500 = 94,050!
// Total Cost = 18510 + 17830 + 16370 + 11830 = 64,540!
// Total Profit = 94050 - 64540 = 29,510!
// Avg Rev = 94050 / 25 = 3,762!

const allRows = [...northRows, ...westRows, ...eastRows, ...southRows].sort(
  (a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()
);

console.log("Total rows:", allRows.length);
console.log("Total Units:", allRows.reduce((s, r) => s + r.Units, 0));
console.log("Total Revenue:", allRows.reduce((s, r) => s + r.Revenue, 0));
console.log("Avg Revenue:", allRows.reduce((s, r) => s + r.Revenue, 0) / allRows.length);
console.log("Total Cost:", allRows.reduce((s, r) => s + r.Cost, 0));
console.log("Total Profit:", allRows.reduce((s, r) => s + (r.Revenue - r.Cost), 0));

const regions = ["North", "West", "East", "South"] as const;
for (const reg of regions) {
  const regRows = allRows.filter(r => r.Region === reg);
  const rRev = regRows.reduce((s, r) => s + r.Revenue, 0);
  const rCost = regRows.reduce((s, r) => s + r.Cost, 0);
  console.log(`${reg} -> Rev: $${rRev.toLocaleString()}, Cost: $${rCost.toLocaleString()}, Profit: $${(rRev - rCost).toLocaleString()}`);
}

const cats = Array.from(new Set(allRows.map(r => r.Category)));
console.log("Categories:", cats);
for (const cat of cats) {
  const cRows = allRows.filter(r => r.Category === cat);
  const cRev = cRows.reduce((s, r) => s + r.Revenue, 0);
  const cCost = cRows.reduce((s, r) => s + r.Cost, 0);
  const cProfit = cRev - cCost;
  const cMargin = (cProfit / cRev) * 100;
  console.log(`Category ${cat} (N=${cRows.length}): Rev=$${cRev.toLocaleString()}, Cost=$${cCost.toLocaleString()}, Profit=$${cProfit.toLocaleString()}, Margin=${cMargin.toFixed(1)}%`);
}

// Convert to CSV
const headers = ["Date", "Order_ID", "Region", "Category", "Product", "Units", "Revenue", "Cost", "Discount", "Customer_Type"];
const csvLines = [headers.join(",")];
for (const r of allRows) {
  csvLines.push(`${r.Date},${r.Order_ID},${r.Region},${r.Category},${r.Product},${r.Units},${r.Revenue},${r.Cost},${r.Discount},${r.Customer_Type}`);
}
export const ECOMMERCE_25_CSV = csvLines.join("\n");
