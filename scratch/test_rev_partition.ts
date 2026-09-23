const revs = [1200, 1800, 1750, 2900, 2300, 4100, 3500, 2950, 4700, 4650, 3600, 5900, 8100, 4200, 5300, 7600, 4800, 5900, 3700, 6400, 9100, 4300, 5400, 4900, 7800];

console.log("Total rev:", revs.reduce((a, b) => a + b, 0));
// Can revs sum to 17500?
const southMatches: number[][] = [];

function findSubsets(target: number, idx: number, cur: number, chosen: number[]) {
  if (cur === target) {
    southMatches.push([...chosen]);
    return;
  }
  if (idx >= revs.length || cur > target) return;
  findSubsets(target, idx + 1, cur, chosen);
  chosen.push(idx);
  findSubsets(target, idx + 1, cur + revs[idx], chosen);
  chosen.pop();
}

findSubsets(17500, 0, 0, []);
console.log("South matches (rev=17500):", southMatches.length);
if (southMatches.length > 0) {
  console.log("Sample South match:", southMatches[0]);
}
