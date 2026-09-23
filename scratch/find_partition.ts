const rows = [
  { idx: 0, date: '2026-01-05', rev: 1200, cost: 700, units: 2 },
  { idx: 1, date: '2026-01-12', rev: 1800, cost: 1050, units: 3 },
  { idx: 2, date: '2026-01-19', rev: 1750, cost: 1000, units: 3 },
  { idx: 3, date: '2026-01-26', rev: 2900, cost: 1650, units: 5 },
  { idx: 4, date: '2026-02-02', rev: 2300, cost: 1350, units: 4 },
  { idx: 5, date: '2026-02-09', rev: 4100, cost: 2400, units: 7 },
  { idx: 6, date: '2026-02-16', rev: 3500, cost: 2050, units: 6 },
  { idx: 7, date: '2026-02-23', rev: 2950, cost: 1700, units: 5 },
  { idx: 8, date: '2026-03-02', rev: 4700, cost: 2700, units: 8 },
  { idx: 9, date: '2026-03-09', rev: 4650, cost: 2680, units: 8 },
  { idx: 10, date: '2026-03-16', rev: 3600, cost: 2100, units: 6 },
  { idx: 11, date: '2026-03-23', rev: 5900, cost: 3400, units: 10 },
  { idx: 12, date: '2026-03-30', rev: 8100, cost: 4700, units: 14 },
  { idx: 13, date: '2026-04-06', rev: 4200, cost: 2450, units: 7 },
  { idx: 14, date: '2026-04-13', rev: 5300, cost: 3100, units: 9 },
  { idx: 15, date: '2026-04-20', rev: 7600, cost: 4400, units: 13 },
  { idx: 16, date: '2026-04-27', rev: 4800, cost: 2800, units: 8 },
  { idx: 17, date: '2026-05-04', rev: 5900, cost: 3450, units: 10 },
  { idx: 18, date: '2026-05-11', rev: 3700, cost: 2150, units: 6 },
  { idx: 19, date: '2026-05-15', rev: 6400, cost: 3700, units: 11 },
  { idx: 20, date: '2026-05-18', rev: 9100, cost: 5200, units: 16 },
  { idx: 21, date: '2026-05-20', rev: 4300, cost: 2500, units: 7 },
  { idx: 22, date: '2026-05-22', rev: 5400, cost: 3150, units: 9 },
  { idx: 23, date: '2026-05-26', rev: 4900, cost: 2850, units: 8 },
  { idx: 24, date: '2026-05-29', rev: 7800, cost: 4500, units: 13 },
];

// Target:
// North: rev = 26950, profit = 8440 => cost = 18510
// West: rev = 25800, profit = 7970 => cost = 17830
// East: rev = 23800, profit = 7430 => cost = 16370
// South: rev = 17500, profit = 5670 => cost = 11830

console.log("Finding partition for 4 regions...");

function solve() {
  const n = rows.length;
  // We can find subset for South first (rev=17500, cost=11830)
  const southSubsets: number[][] = [];
  function findSouth(idx: number, curRev: number, curCost: number, chosen: number[]) {
    if (curRev === 17500 && curCost === 11830) {
      southSubsets.push([...chosen]);
      return;
    }
    if (idx >= n || curRev > 17500 || curCost > 11830) return;
    // branch without
    findSouth(idx + 1, curRev, curCost, chosen);
    // branch with
    chosen.push(idx);
    findSouth(idx + 1, curRev + rows[idx].rev, curCost + rows[idx].cost, chosen);
    chosen.pop();
  }

  findSouth(0, 0, 0, []);
  console.log(`Found ${southSubsets.length} South subsets`);

  for (const sSet of southSubsets) {
    const sMask = new Set(sSet);
    const rem1 = rows.filter(r => !sMask.has(r.idx));

    // Find East in rem1 (rev=23800, cost=16370)
    function findEast(idx: number, curRev: number, curCost: number, chosen: number[]): number[] | null {
      if (curRev === 23800 && curCost === 16370) return [...chosen];
      if (idx >= rem1.length || curRev > 23800 || curCost > 16370) return null;
      const res1 = findEast(idx + 1, curRev, curCost, chosen);
      if (res1) return res1;
      chosen.push(rem1[idx].idx);
      const res2 = findEast(idx + 1, curRev + rem1[idx].rev, curCost + rem1[idx].cost, chosen);
      chosen.pop();
      return res2;
    }

    const eSet = findEast(0, 0, 0, []);
    if (!eSet) continue;

    const eMask = new Set(eSet);
    const rem2 = rem1.filter(r => !eMask.has(r.idx));

    // Find West in rem2 (rev=25800, cost=17830)
    function findWest(idx: number, curRev: number, curCost: number, chosen: number[]): number[] | null {
      if (curRev === 25800 && curCost === 17830) return [...chosen];
      if (idx >= rem2.length || curRev > 25800 || curCost > 17830) return null;
      const res1 = findWest(idx + 1, curRev, curCost, chosen);
      if (res1) return res1;
      chosen.push(rem2[idx].idx);
      const res2 = findWest(idx + 1, curRev + rem2[idx].rev, curCost + rem2[idx].cost, chosen);
      chosen.pop();
      return res2;
    }

    const wSet = findWest(0, 0, 0, []);
    if (!wSet) continue;

    const wMask = new Set(wSet);
    const nSet = rem2.filter(r => !wMask.has(r.idx)).map(r => r.idx);

    const nRev = nSet.reduce((s, i) => s + rows[i].rev, 0);
    const nCost = nSet.reduce((s, i) => s + rows[i].cost, 0);

    if (nRev === 26950 && nCost === 18510) {
      console.log("MATCH FOUND!");
      console.log("South indices:", sSet);
      console.log("East indices:", eSet);
      console.log("West indices:", wSet);
      console.log("North indices:", nSet);
      return { sSet, eSet, wSet, nSet };
    }
  }
  return null;
}

solve();
