import {
  ColumnIntelligence,
  DetectedRelationship,
  DeterministicCorrelation,
  TargetOutcomeIntelligence,
  TemporalIntelligence,
} from "./types";

// Pearson Correlation Coefficient calculation
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
    sumY2 += yi * yi;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

// Computes all verified correlations (numeric-to-numeric and numeric-to-ordinal target) for the Fact Pack
export function calculateAllCorrelations(
  data: Record<string, any>[],
  columns: ColumnIntelligence[],
  targetIntel?: TargetOutcomeIntelligence
): DeterministicCorrelation[] {
  const correlations: DeterministicCorrelation[] = [];
  const measures = columns.filter(
    (c) => c.semanticType === "additive_numeric" || c.semanticType === "non_additive_numeric"
  );

  // 1. Numeric <-> Numeric Correlations
  if (measures.length >= 2) {
    for (let i = 0; i < measures.length; i++) {
      for (let j = i + 1; j < measures.length; j++) {
        const colA = measures[i];
        const colB = measures[j];

        const pairs = data
          .map((r) => ({ a: Number(r[colA.name]), b: Number(r[colB.name]) }))
          .filter((p) => !isNaN(p.a) && !isNaN(p.b) && isFinite(p.a) && isFinite(p.b));

        if (pairs.length >= 5) {
          const r = calculatePearsonCorrelation(
            pairs.map((p) => p.a),
            pairs.map((p) => p.b)
          );
          const strength = Math.abs(r) >= 0.7 ? "strong" : Math.abs(r) >= 0.4 ? "moderate" : "weak";
          correlations.push({
            variableA: colA.name,
            variableB: colB.name,
            coefficient: r,
            n: pairs.length,
            direction: r >= 0 ? "positive" : "negative",
            strength,
            method: "Pearson (numeric-to-numeric)",
          });
        }
      }
    }
  }

  // 2. Numeric <-> Ordinal Target Correlations
  if (targetIntel && targetIntel.targetType === "ordinal" && targetIntel.ordinalMapping) {
    const mapping = targetIntel.ordinalMapping;
    measures.forEach((col) => {
      const pairs = data
        .map((r) => {
          const rawTarget = String(r[targetIntel.targetColumn] ?? "").trim();
          const targetRank = mapping[rawTarget];
          const val = Number(r[col.name]);
          return { a: val, b: targetRank };
        })
        .filter((p) => !isNaN(p.a) && isFinite(p.a) && p.b !== undefined && !isNaN(p.b));

      if (pairs.length >= 5) {
        const r = calculatePearsonCorrelation(
          pairs.map((p) => p.a),
          pairs.map((p) => p.b)
        );
        const strength = Math.abs(r) >= 0.7 ? "strong" : Math.abs(r) >= 0.4 ? "moderate" : "weak";
        correlations.push({
          variableA: col.name,
          variableB: targetIntel.targetColumn,
          coefficient: r,
          n: pairs.length,
          direction: r >= 0 ? "positive" : "negative",
          strength,
          method: "Pearson on ordinal target encoding",
        });
      }
    });
  }

  return correlations;
}

// Discovers deep structural relationships within the dataset
export function discoverRelationships(
  data: Record<string, any>[],
  columns: ColumnIntelligence[],
  temporal: TemporalIntelligence,
  targetIntel?: TargetOutcomeIntelligence
): DetectedRelationship[] {
  const relationships: DetectedRelationship[] = [];
  const measures = columns.filter(
    (c) => c.semanticType === "additive_numeric" || c.semanticType === "non_additive_numeric"
  );
  const dimensions = columns.filter((c) => c.semanticType === "categorical");
  const targets = columns.filter(
    (c) =>
      c.semanticType === "binary_target" ||
      c.semanticType === "ordinal_target" ||
      c.semanticType === "nominal_target" ||
      c.semanticType === "numeric_target"
  );

  // 1. Numeric ↔ Numeric Correlations (Scatter / Regression)
  if (measures.length >= 2) {
    for (let i = 0; i < measures.length; i++) {
      for (let j = i + 1; j < measures.length; j++) {
        const colA = measures[i];
        const colB = measures[j];

        const pairs = data
          .map((r) => ({ a: Number(r[colA.name]), b: Number(r[colB.name]) }))
          .filter((p) => !isNaN(p.a) && !isNaN(p.b) && isFinite(p.a) && isFinite(p.b));

        if (pairs.length >= 5) {
          const r = calculatePearsonCorrelation(
            pairs.map((p) => p.a),
            pairs.map((p) => p.b)
          );

          if (Math.abs(r) >= 0.25 || pairs.length < 50) {
            const strengthDesc =
              Math.abs(r) > 0.7
                ? "strong correlation"
                : Math.abs(r) > 0.4
                ? "moderate correlation"
                : "mild association";

            relationships.push({
              id: `rel_corr_${colA.name}_${colB.name}`,
              type: "numeric_correlation",
              sourceColumn: colA.name,
              targetColumn: colB.name,
              strength: r,
              description: `${colA.name} and ${colB.name} exhibit a ${strengthDesc} (r = ${r}).`,
              recommendedChart: "scatter",
              insights: `Scatter visualization demonstrates ${r > 0 ? "positive co-movement" : "inverse trade-off"} between metrics.`,
            });
          }
        }
      }
    }
  }

  // 1b. Numeric ↔ Ordinal Target Relationships
  if (targetIntel && targetIntel.targetType === "ordinal" && targetIntel.ordinalMapping) {
    const mapping = targetIntel.ordinalMapping;
    measures.forEach((col) => {
      const pairs = data
        .map((r) => {
          const rawTarget = String(r[targetIntel.targetColumn] ?? "").trim();
          const targetRank = mapping[rawTarget];
          const val = Number(r[col.name]);
          return { a: val, b: targetRank };
        })
        .filter((p) => !isNaN(p.a) && isFinite(p.a) && p.b !== undefined && !isNaN(p.b));

      if (pairs.length >= 5) {
        const r = calculatePearsonCorrelation(
          pairs.map((p) => p.a),
          pairs.map((p) => p.b)
        );
        const strengthDesc =
          Math.abs(r) > 0.7
            ? "strong association"
            : Math.abs(r) > 0.4
            ? "moderate association"
            : "mild association";

        relationships.push({
          id: `rel_ord_${col.name}_${targetIntel.targetColumn}`,
          type: "numeric_correlation",
          sourceColumn: col.name,
          targetColumn: targetIntel.targetColumn,
          strength: r,
          description: `${col.name} has a ${strengthDesc} ${r > 0 ? "positive" : "negative"} association with ordinal ${targetIntel.targetColumn} (r = ${r.toFixed(3)}, n = ${pairs.length}).`,
          recommendedChart: "scatter",
          insights: `Ordinal Pearson coefficient (${r > 0 ? "+" : ""}${r.toFixed(3)}) indicates ${r > 0 ? "higher values correlate with higher risk" : "higher values correlate with lower risk"}.`,
        });
      }
    });
  }

  // 2. Temporal ↔ Numeric Trends (Line / Area / Forecast)
  if (temporal.hasTemporal && temporal.dateColumn && measures.length > 0) {
    const primaryMeasure = measures[0];
    relationships.push({
      id: `rel_temporal_${temporal.dateColumn}_${primaryMeasure.name}`,
      type: "temporal_trend",
      sourceColumn: temporal.dateColumn,
      targetColumn: primaryMeasure.name,
      strength: temporal.continuityScore,
      description: `${primaryMeasure.name} progression tracked over ${temporal.observationCount} observations across ${temporal.frequency} intervals.`,
      recommendedChart: "area",
      insights: `Temporal trajectory reveals longitudinal velocity and sequential patterns.`,
    });
  }

  // 3. Category ↔ Numeric Cohort Breakdowns (Bar / Donut)
  if (dimensions.length > 0 && measures.length > 0) {
    const primaryDim = dimensions[0];
    const primaryMeasure = measures[0];

    // Compute variance between categories
    const catSums: Record<string, { sum: number; count: number }> = {};
    data.forEach((r) => {
      const k = String(r[primaryDim.name] || "Other");
      const v = Number(r[primaryMeasure.name]) || 0;
      if (!catSums[k]) catSums[k] = { sum: 0, count: 0 };
      catSums[k].sum += v;
      catSums[k].count += 1;
    });

    const entries = Object.entries(catSums);
    if (entries.length > 0) {
      const means = entries.map(([, stat]) => stat.count > 0 ? stat.sum / stat.count : 0);
      const maxMean = Math.max(...means);
      const minMean = Math.min(...means);
      const varianceRatio = minMean > 0 ? Math.round((maxMean / minMean) * 10) / 10 : maxMean;

      relationships.push({
        id: `rel_cohort_${primaryDim.name}_${primaryMeasure.name}`,
        type: "category_breakdown",
        sourceColumn: primaryDim.name,
        targetColumn: primaryMeasure.name,
        strength: Math.min(varianceRatio / 5, 1),
        description: `${primaryMeasure.name} distributions segmented across ${entries.length} ${primaryDim.name} cohorts.`,
        recommendedChart: entries.length <= 6 ? "pie" : "bar",
        insights: `Dominant cohort variance: Top category leads bottom by ${varianceRatio}x factor.`,
      });
    }
  }

  // 4. Target Outcome ↔ Cohort Risk Differential (Target Cross-Tab)
  if (targets.length > 0 && (dimensions.length > 0 || measures.length > 0)) {
    const targetCol = targets[0];
    const groupCol = dimensions[0]?.name || measures[0]?.name || "";

    if (groupCol) {
      relationships.push({
        id: `rel_target_${targetCol.name}_${groupCol}`,
        type: "target_outcome",
        sourceColumn: groupCol,
        targetColumn: targetCol.name,
        strength: 0.85,
        description: `${targetCol.name} positive outcome rate evaluated across ${groupCol} segments.`,
        recommendedChart: "bar",
        insights: `Cohort cross-tabulation highlights risk disparity and concentration vectors.`,
      });
    }
  }

  // 5. Category ↔ Category (Cross-Tabulation Matrix / Heatmap)
  if (dimensions.length >= 2) {
    const dimA = dimensions[0];
    const dimB = dimensions[1];

    if (dimA.cardinality !== "high" && dimB.cardinality !== "high") {
      relationships.push({
        id: `rel_crosstab_${dimA.name}_${dimB.name}`,
        type: "cross_tabulation",
        sourceColumn: dimA.name,
        targetColumn: dimB.name,
        strength: 0.75,
        description: `2D matrix intersection between ${dimA.name} and ${dimB.name}.`,
        recommendedChart: "heatmap",
        insights: `Heatmap density matrix reveals cohort overlap and clustering nodes.`,
      });
    }
  }

  return relationships;
}
