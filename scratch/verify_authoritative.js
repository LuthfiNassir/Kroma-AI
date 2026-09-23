const northRows = [
  { Date: '2026-01-05', Order_ID: 'ORD-1001', Region: 'North', Category: 'Electronics', Product: 'Server & Laptops', Units: 10, Revenue: 14350, Cost: 10320, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-01-26', Order_ID: 'ORD-1004', Region: 'North', Category: 'Office', Product: 'Laser Printer', Units: 4, Revenue: 2400, Cost: 1560, Discount: 0.00, Customer_Type: 'New' },
  { Date: '2026-02-16', Order_ID: 'ORD-1007', Region: 'North', Category: 'Office', Product: 'Scanner', Units: 5, Revenue: 2100, Cost: 1365, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-03-16', Order_ID: 'ORD-1011', Region: 'North', Category: 'Office', Product: 'Paper Shredder', Units: 6, Revenue: 1800, Cost: 1170, Discount: 0.00, Customer_Type: 'New' },
  { Date: '2026-04-20', Order_ID: 'ORD-1016', Region: 'North', Category: 'Office', Product: 'Workstation Supplies', Units: 8, Revenue: 3800, Cost: 2470, Discount: 0.10, Customer_Type: 'Returning' },
  { Date: '2026-05-18', Order_ID: 'ORD-1021', Region: 'North', Category: 'Office', Product: 'Laminator & Accessories', Units: 5, Revenue: 2500, Cost: 1625, Discount: 0.05, Customer_Type: 'New' },
];

const westRows = [
  { Date: '2026-01-12', Order_ID: 'ORD-1002', Region: 'West', Category: 'Furniture', Product: 'Executive Desk', Units: 4, Revenue: 3600, Cost: 2400, Discount: 0.05, Customer_Type: 'New' },
  { Date: '2026-02-02', Order_ID: 'ORD-1005', Region: 'West', Category: 'Electronics', Product: 'Laptop Pro', Units: 5, Revenue: 6200, Cost: 4340, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-02-23', Order_ID: 'ORD-1008', Region: 'West', Category: 'Electronics', Product: 'Monitor 4K', Units: 8, Revenue: 4400, Cost: 3080, Discount: 0.05, Customer_Type: 'New' },
  { Date: '2026-03-23', Order_ID: 'ORD-1012', Region: 'West', Category: 'Electronics', Product: 'Tablet', Units: 7, Revenue: 3800, Cost: 2650, Discount: 0.00, Customer_Type: 'Returning' },
  { Date: '2026-04-27', Order_ID: 'ORD-1017', Region: 'West', Category: 'Electronics', Product: 'Smart Device', Units: 6, Revenue: 5100, Cost: 3560, Discount: 0.10, Customer_Type: 'New' },
  { Date: '2026-05-22', Order_ID: 'ORD-1023', Region: 'West', Category: 'Furniture', Product: 'Conference Table', Units: 3, Revenue: 2700, Cost: 1800, Discount: 0.05, Customer_Type: 'Returning' },
];

const eastRows = [
  { Date: '2026-01-19', Order_ID: 'ORD-1003', Region: 'East', Category: 'Electronics', Product: 'Ultrabook', Units: 5, Revenue: 5800, Cost: 4040, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-02-09', Order_ID: 'ORD-1006', Region: 'East', Category: 'Furniture', Product: 'Ergonomic Chair', Units: 6, Revenue: 2400, Cost: 1600, Discount: 0.00, Customer_Type: 'New' },
  { Date: '2026-03-02', Order_ID: 'ORD-1009', Region: 'East', Category: 'Furniture', Product: 'Standing Desk', Units: 4, Revenue: 2850, Cost: 1900, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-03-30', Order_ID: 'ORD-1013', Region: 'East', Category: 'Electronics', Product: 'Dual Monitor', Units: 7, Revenue: 5450, Cost: 3800, Discount: 0.05, Customer_Type: 'New' },
  { Date: '2026-05-04', Order_ID: 'ORD-1018', Region: 'East', Category: 'Furniture', Product: 'Bookshelf', Units: 5, Revenue: 1800, Cost: 1200, Discount: 0.00, Customer_Type: 'New' },
  { Date: '2026-05-26', Order_ID: 'ORD-1024', Region: 'East', Category: 'Electronics', Product: 'Tablet Pro', Units: 6, Revenue: 5500, Cost: 3830, Discount: 0.10, Customer_Type: 'Returning' },
];

const southRows = [
  { Date: '2026-03-09', Order_ID: 'ORD-1010', Region: 'South', Category: 'Electronics', Product: 'Smartphone', Units: 5, Revenue: 3200, Cost: 2160, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-04-06', Order_ID: 'ORD-1014', Region: 'South', Category: 'Furniture', Product: 'Filing Cabinet', Units: 4, Revenue: 1500, Cost: 1000, Discount: 0.05, Customer_Type: 'New' },
  { Date: '2026-04-13', Order_ID: 'ORD-1015', Region: 'South', Category: 'Electronics', Product: 'Tablet', Units: 6, Revenue: 2800, Cost: 1900, Discount: 0.00, Customer_Type: 'New' },
  { Date: '2026-05-11', Order_ID: 'ORD-1019', Region: 'South', Category: 'Electronics', Product: 'Wireless Earbuds', Units: 8, Revenue: 1900, Cost: 1280, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-05-15', Order_ID: 'ORD-1020', Region: 'South', Category: 'Electronics', Product: 'Smart Watch', Units: 6, Revenue: 2400, Cost: 1620, Discount: 0.00, Customer_Type: 'New' },
  { Date: '2026-05-20', Order_ID: 'ORD-1022', Region: 'South', Category: 'Electronics', Product: 'Bluetooth Speaker', Units: 7, Revenue: 2100, Cost: 1420, Discount: 0.05, Customer_Type: 'Returning' },
  { Date: '2026-05-29', Order_ID: 'ORD-1025', Region: 'South', Category: 'Electronics', Product: 'USB-C Accessories', Units: 58, Revenue: 3600, Cost: 2450, Discount: 0.10, Customer_Type: 'Returning' },
];

const allRows = [...northRows, ...westRows, ...eastRows, ...southRows].sort(
  (a, b) => parseInt(a.Order_ID.replace('ORD-', '')) - parseInt(b.Order_ID.replace('ORD-', ''))
);

console.log('Total Rows:', allRows.length);
console.log('Total Units:', allRows.reduce((s, r) => s + r.Units, 0));
console.log('Total Revenue:', allRows.reduce((s, r) => s + r.Revenue, 0));
console.log('Total Cost:', allRows.reduce((s, r) => s + r.Cost, 0));
console.log('Total Profit:', allRows.reduce((s, r) => s + (r.Revenue - r.Cost), 0));

const categories = ['Electronics', 'Furniture', 'Office'];
for (const cat of categories) {
  const catRows = allRows.filter(r => r.Category === cat);
  const rev = catRows.reduce((s, r) => s + r.Revenue, 0);
  const cost = catRows.reduce((s, r) => s + r.Cost, 0);
  const profit = rev - cost;
  const margin = (profit / rev) * 100;
  console.log('Cat: ' + cat + ', N=' + catRows.length + ', Rev=' + rev + ', Cost=' + cost + ', Profit=' + profit + ', Margin=' + margin.toFixed(4) + '%');
}

const regions = ['North', 'West', 'East', 'South'];
for (const reg of regions) {
  const regRows = allRows.filter(r => r.Region === reg);
  const rev = regRows.reduce((s, r) => s + r.Revenue, 0);
  const cost = regRows.reduce((s, r) => s + r.Cost, 0);
  const profit = rev - cost;
  console.log('Reg: ' + reg + ', N=' + regRows.length + ', Rev=' + rev + ', Cost=' + cost + ', Profit=' + profit);
}

const custTypes = Array.from(new Set(allRows.map(r => r.Customer_Type)));
console.log('Customer Types:', custTypes);

console.log('=== CSV START ===');
console.log(Object.keys(allRows[0]).join(','));
allRows.forEach(r => console.log(Object.values(r).join(',')));
console.log('=== CSV END ===');
