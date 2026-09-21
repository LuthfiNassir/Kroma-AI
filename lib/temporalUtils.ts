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

export function periodToTimestamp(p: NormalizedPeriod): number {
  if (p.year && p.month !== undefined && p.day !== undefined) {
    return Date.UTC(p.year, p.month - 1, p.day);
  }
  if (p.year && p.month !== undefined) {
    return Date.UTC(p.year, p.month - 1, 1);
  }
  if (p.year && p.quarter !== undefined) {
    return Date.UTC(p.year, (p.quarter - 1) * 3, 1);
  }
  return Date.UTC(p.year, 0, 1);
}

export interface TemporalSpacingAnalysis {
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "irregular";
  isRegular: boolean;
  averageIntervalDays: number;
  minIntervalDays: number;
  maxIntervalDays: number;
  continuityScore: number;
  granularityLabel: string;
  timeSpanDescription: string;
  duplicateTimestampsCount: number;
  spanDays: number;
}

export function analyzeDateSpacing(
  dateObjects: { raw: string; parsed: NormalizedPeriod; sortKey: number }[]
): TemporalSpacingAnalysis {
  if (dateObjects.length < 2) {
    return {
      frequency: "irregular",
      isRegular: false,
      averageIntervalDays: 0,
      minIntervalDays: 0,
      maxIntervalDays: 0,
      continuityScore: 1.0,
      granularityLabel: "single observation",
      timeSpanDescription: dateObjects[0]?.parsed.displayLabel || "single observation",
      duplicateTimestampsCount: 0,
      spanDays: 0,
    };
  }

  // Chronological sort
  const sorted = [...dateObjects].sort((a, b) => a.sortKey - b.sortKey);
  const timestamps = sorted.map((d) => periodToTimestamp(d.parsed));
  const first = sorted[0].parsed;
  const last = sorted[sorted.length - 1].parsed;
  const spanMs = timestamps[timestamps.length - 1] - timestamps[0];
  const spanDays = Math.max(0, Math.round(spanMs / (1000 * 60 * 60 * 24)));

  const intervals: number[] = [];
  let duplicateCount = 0;

  for (let i = 1; i < timestamps.length; i++) {
    const diffDays = Math.round((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      duplicateCount++;
    }
    intervals.push(diffDays);
  }

  const validIntervals = intervals.filter((d) => d > 0);
  const avgInterval = validIntervals.length > 0
    ? validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length
    : 0;
  const minInterval = validIntervals.length > 0 ? Math.min(...validIntervals) : 0;
  const maxInterval = validIntervals.length > 0 ? Math.max(...validIntervals) : 0;

  // Check structural markers
  const hasDays = sorted.every((d) => d.parsed.day !== undefined);
  const hasMonthsWithoutDays = sorted.every((d) => d.parsed.month !== undefined && d.parsed.day === undefined);
  const hasQuarters = sorted.every((d) => d.parsed.quarter !== undefined);
  const hasOnlyYears = sorted.every((d) => d.parsed.year !== undefined && !d.parsed.month && !d.parsed.quarter && !d.parsed.day);

  let freq: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "irregular" = "irregular";
  let isRegular = false;
  let continuityScore = 0.95;

  if (hasQuarters) {
    freq = "quarterly";
    isRegular = maxInterval <= 100 && minInterval >= 80;
  } else if (hasOnlyYears) {
    freq = "yearly";
    isRegular = maxInterval <= 370 && minInterval >= 360;
  } else if (hasMonthsWithoutDays) {
    freq = "monthly";
    isRegular = maxInterval <= 32 && minInterval >= 28;
    if (!isRegular) continuityScore = 0.7;
  } else if (hasDays) {
    // Determine whether daily, weekly, monthly, or irregular from spacing
    const intervalStdDev = validIntervals.length > 0
      ? Math.sqrt(validIntervals.reduce((acc, v) => acc + Math.pow(v - avgInterval, 2), 0) / validIntervals.length)
      : 0;

    if (maxInterval <= 1 && minInterval >= 1) {
      freq = "daily";
      isRegular = true;
    } else if (minInterval >= 6 && maxInterval <= 8 && intervalStdDev <= 1.0) {
      freq = "weekly";
      isRegular = true;
    } else if (minInterval >= 28 && maxInterval <= 32 && intervalStdDev <= 2.0) {
      freq = "monthly";
      isRegular = true;
    } else {
      // Irregular, spaced observations (e.g. 25 observations over 145 days)
      freq = "irregular";
      isRegular = false;
      continuityScore = Math.max(0.4, Math.round((1 - intervalStdDev / Math.max(avgInterval, 1)) * 100) / 100);
    }
  }

  let granularityLabel = "irregular observations";
  let timeSpanDescription = `${sorted.length} observations spanning ${first.displayLabel} to ${last.displayLabel}`;

  if (freq === "daily" && isRegular) {
    granularityLabel = "daily periods";
    timeSpanDescription = `${sorted.length} daily periods from ${first.displayLabel} through ${last.displayLabel}`;
  } else if (freq === "weekly" && isRegular) {
    granularityLabel = "weekly periods";
    timeSpanDescription = `${sorted.length} weekly periods from ${first.displayLabel} through ${last.displayLabel}`;
  } else if (freq === "monthly" && isRegular) {
    granularityLabel = "monthly periods";
    timeSpanDescription = `${sorted.length} monthly periods from ${first.displayLabel} through ${last.displayLabel}`;
  } else if (freq === "quarterly" && isRegular) {
    granularityLabel = "quarterly periods";
    timeSpanDescription = `${sorted.length} quarterly periods from ${first.displayLabel} through ${last.displayLabel}`;
  } else if (freq === "yearly" && isRegular) {
    granularityLabel = "yearly periods";
    timeSpanDescription = `${sorted.length} yearly periods from ${first.displayLabel} through ${last.displayLabel}`;
  } else {
    granularityLabel = "irregular observations";
    timeSpanDescription = `${sorted.length} observations spanning ${first.displayLabel} to ${last.displayLabel}`;
  }

  return {
    frequency: freq,
    isRegular,
    averageIntervalDays: Math.round(avgInterval * 10) / 10,
    minIntervalDays: minInterval,
    maxIntervalDays: maxInterval,
    continuityScore,
    granularityLabel,
    timeSpanDescription,
    duplicateTimestampsCount: duplicateCount,
    spanDays,
  };
}

export function generateFuturePeriods(
  lastPeriod: NormalizedPeriod,
  count: number = 6,
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "irregular" = "monthly"
): { raw: string; displayLabel: string; sortKey: number }[] {
  const future: { raw: string; displayLabel: string; sortKey: number }[] = [];
  let currYear = lastPeriod.year;
  let currMonth = lastPeriod.month || 1;
  let currQuarter = lastPeriod.quarter || Math.ceil(currMonth / 3);

  // If irregular, do NOT invent calendar months! Generate clean projected periods
  if (frequency === "irregular") {
    for (let i = 1; i <= count; i++) {
      future.push({
        raw: `Proj +${i}`,
        displayLabel: `Proj +${i}`,
        sortKey: lastPeriod.sortKey + i * 100,
      });
    }
    return future;
  }

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
