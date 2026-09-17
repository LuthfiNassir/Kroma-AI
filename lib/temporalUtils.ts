export interface NormalizedPeriod {
  raw: string;
  year: number;
  month?: number; // 1-12
  day?: number;
  quarter?: number; // 1-4
  displayLabel: string;
  monthName?: string;
  sortKey: number; // e.g. 202501 for Jan 2025
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function parseDatePeriod(raw: any): NormalizedPeriod | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (typeof raw === "number") {
    // Only 4-digit years like 2025 can be dates; ages/salaries like 24, 35, 52000 are numbers!
    if (raw >= 1970 && raw <= 2100 && Number.isInteger(raw)) {
      return {
        raw: String(raw),
        year: raw,
        displayLabel: `${raw}`,
        sortKey: raw * 10000 + 101,
      };
    }
    return null;
  }

  const str = String(raw).trim();

  // If pure digits, must be a 4-digit year between 1970 and 2100
  if (/^\d+$/.test(str)) {
    if (str.length === 4) {
      const yr = parseInt(str, 10);
      if (yr >= 1970 && yr <= 2100) {
        return {
          raw: str,
          year: yr,
          displayLabel: `${yr}`,
          sortKey: yr * 10000 + 101,
        };
      }
    }
    return null;
  }

  // 1. Month-Year formatted like "Jan-2025", "Jan 2025", "January 2025", "Jan/2025"
  const m1 = str.match(/^([a-zA-Z]{3,9})[\s\-\/\.]+(\d{4})$/);
  if (m1) {
    const mStr = m1[1].slice(0, 3).toLowerCase();
    const yr = parseInt(m1[2], 10);
    const mIdx = MONTH_ABBR.findIndex((a) => a.toLowerCase() === mStr);
    if (mIdx !== -1) {
      const month = mIdx + 1;
      return {
        raw: str,
        year: yr,
        month,
        displayLabel: `${MONTH_ABBR[mIdx]} ${yr}`,
        monthName: MONTH_NAMES[mIdx],
        sortKey: yr * 10000 + month * 100 + 1,
      };
    }
  }

  // 2. Year-Month formatted like "2025-Jan", "2025 Jan", "2025-01", "2025/01"
  const m2 = str.match(/^(\d{4})[\s\-\/\.]+([a-zA-Z]{3,9})$/);
  if (m2) {
    const yr = parseInt(m2[1], 10);
    const mStr = m2[2].slice(0, 3).toLowerCase();
    const mIdx = MONTH_ABBR.findIndex((a) => a.toLowerCase() === mStr);
    if (mIdx !== -1) {
      const month = mIdx + 1;
      return {
        raw: str,
        year: yr,
        month,
        displayLabel: `${MONTH_ABBR[mIdx]} ${yr}`,
        monthName: MONTH_NAMES[mIdx],
        sortKey: yr * 10000 + month * 100 + 1,
      };
    }
  }

  // 3. Numeric Year-Month formatted like "2025-01", "2025/01"
  const m3 = str.match(/^(\d{4})[\-\/](0?[1-9]|1[0-2])$/);
  if (m3) {
    const yr = parseInt(m3[1], 10);
    const month = parseInt(m3[2], 10);
    const mIdx = month - 1;
    return {
      raw: str,
      year: yr,
      month,
      displayLabel: `${MONTH_ABBR[mIdx]} ${yr}`,
      monthName: MONTH_NAMES[mIdx],
      sortKey: yr * 10000 + month * 100 + 1,
    };
  }

  // 4. Numeric Month-Year formatted like "01-2025", "01/2025"
  const m4 = str.match(/^(0?[1-9]|1[0-2])[\-\/](\d{4})$/);
  if (m4) {
    const month = parseInt(m4[1], 10);
    const yr = parseInt(m4[2], 10);
    const mIdx = month - 1;
    return {
      raw: str,
      year: yr,
      month,
      displayLabel: `${MONTH_ABBR[mIdx]} ${yr}`,
      monthName: MONTH_NAMES[mIdx],
      sortKey: yr * 10000 + month * 100 + 1,
    };
  }

  // 5. Full Date: YYYY-MM-DD or YYYY/MM/DD
  const m5 = str.match(/^(\d{4})[\-\/](0?[1-9]|1[0-2])[\-\/](0?[1-9]|[12]\d|3[01])$/);
  if (m5) {
    const yr = parseInt(m5[1], 10);
    const month = parseInt(m5[2], 10);
    const day = parseInt(m5[3], 10);
    const mIdx = month - 1;
    return {
      raw: str,
      year: yr,
      month,
      day,
      displayLabel: `${MONTH_ABBR[mIdx]} ${day}, ${yr}`,
      monthName: MONTH_NAMES[mIdx],
      sortKey: yr * 10000 + month * 100 + day,
    };
  }

  // 6. Full Date: DD-MM-YYYY or MM/DD/YYYY
  const m6 = str.match(/^(0?[1-9]|[12]\d|3[01])[\-\/](0?[1-9]|1[0-2])[\-\/](\d{4})$/);
  if (m6) {
    const p1 = parseInt(m6[1], 10);
    const p2 = parseInt(m6[2], 10);
    const yr = parseInt(m6[3], 10);
    const month = p2;
    const day = p1;
    const mIdx = Math.max(0, Math.min(11, month - 1));
    return {
      raw: str,
      year: yr,
      month,
      day,
      displayLabel: `${MONTH_ABBR[mIdx]} ${day}, ${yr}`,
      monthName: MONTH_NAMES[mIdx],
      sortKey: yr * 10000 + month * 100 + day,
    };
  }

  // 7. Quarter: Q1 2025, Q1-2025, 2025-Q1
  const m7 = str.match(/^[qQ]([1-4])[\s\-_]+(\d{4})$/);
  if (m7) {
    const q = parseInt(m7[1], 10);
    const yr = parseInt(m7[2], 10);
    return {
      raw: str,
      year: yr,
      quarter: q,
      displayLabel: `Q${q} ${yr}`,
      sortKey: yr * 10000 + q * 300,
    };
  }

  const m8 = str.match(/^(\d{4})[\s\-_]+[qQ]([1-4])$/);
  if (m8) {
    const yr = parseInt(m8[1], 10);
    const q = parseInt(m8[2], 10);
    return {
      raw: str,
      year: yr,
      quarter: q,
      displayLabel: `Q${q} ${yr}`,
      sortKey: yr * 10000 + q * 300,
    };
  }

  // Fallback: Only try Date.parse if the string contains a date separator (- or / or space) and at least 4 digits
  if (/[\-\/\s]/.test(str) && /\d{4}/.test(str)) {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const yr = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      if (yr >= 1970 && yr <= 2100) {
        const mIdx = month - 1;
        return {
          raw: str,
          year: yr,
          month,
          day,
          displayLabel: `${MONTH_ABBR[mIdx]} ${yr}`,
          monthName: MONTH_NAMES[mIdx],
          sortKey: yr * 10000 + month * 100 + day,
        };
      }
    }
  }

  return null;
}

export function generateFuturePeriods(
  lastPeriod: NormalizedPeriod,
  count: number = 6,
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "irregular" = "monthly"
): { raw: string; displayLabel: string; sortKey: number }[] {
  const future: { raw: string; displayLabel: string; sortKey: number }[] = [];
  let currYear = lastPeriod.year;
  let currMonth = lastPeriod.month || 1;
  let currQuarter = lastPeriod.quarter || Math.ceil(currMonth / 3);

  const rawSample = lastPeriod.raw;
  const isHyphenAbbr = /^[a-zA-Z]{3}-\d{4}$/.test(rawSample);
  const isSlashYear = /^\d{4}[\/-]\d{2}$/.test(rawSample);

  for (let i = 1; i <= count; i++) {
    if (frequency === "quarterly" || lastPeriod.quarter) {
      currQuarter += 1;
      if (currQuarter > 4) {
        currQuarter = 1;
        currYear += 1;
      }
      future.push({
        raw: `Q${currQuarter}-${currYear}`,
        displayLabel: `Q${currQuarter} ${currYear}`,
        sortKey: currYear * 10000 + currQuarter * 300,
      });
    } else if (frequency === "yearly" && !lastPeriod.month) {
      currYear += 1;
      future.push({
        raw: `${currYear}`,
        displayLabel: `${currYear}`,
        sortKey: currYear * 10000 + 101,
      });
    } else {
      currMonth += 1;
      if (currMonth > 12) {
        currMonth = 1;
        currYear += 1;
      }
      const mIdx = currMonth - 1;
      const mAbbr = MONTH_ABBR[mIdx];
      let rawOut = `${mAbbr}-${currYear}`;
      if (isHyphenAbbr) {
        rawOut = `${mAbbr}-${currYear}`;
      } else if (isSlashYear) {
        rawOut = `${currYear}-${String(currMonth).padStart(2, "0")}`;
      }

      future.push({
        raw: rawOut,
        displayLabel: `${mAbbr} ${currYear}`,
        sortKey: currYear * 10000 + currMonth * 100 + 1,
      });
    }
  }

  return future;
}
