import { ChartDataSeries, ChartType } from "./types";

export interface ChartViewport {
  zoom: number; // 1.0 (baseline) to 8.0+
  startIndex: number; // For sequential/categorical charts
  endIndex: number; // For sequential/categorical charts
  xDomain?: [number, number]; // For scatter charts
  yDomain?: [number, number]; // For scatter charts
}

export interface ZoomedDomainResult {
  visibleData: any[];
  yDomain: [number | "auto", number | "auto"];
  xDomain?: [number | "auto", number | "auto"];
  isZoomed: boolean;
  totalPoints: number;
  visibleCount: number;
  zoomLevel: number;
  canPanLeft: boolean;
  canPanRight: boolean;
}

/**
 * Initializes the default 1.0x baseline viewport for a given chart series.
 */
export function createInitialViewport(series: ChartDataSeries | null): ChartViewport {
  const data = series?.data || [];
  const total = data.length;

  if (series?.type === "scatter" && total > 0) {
    const xVals = data.map((d) => Number(d.x)).filter((v) => !isNaN(v));
    const yVals = data.map((d) => Number(d.y)).filter((v) => !isNaN(v));
    const xMin = xVals.length > 0 ? Math.min(...xVals) : 0;
    const xMax = xVals.length > 0 ? Math.max(...xVals) : 100;
    const yMin = yVals.length > 0 ? Math.min(...yVals) : 0;
    const yMax = yVals.length > 0 ? Math.max(...yVals) : 100;
    return {
      zoom: 1.0,
      startIndex: 0,
      endIndex: Math.max(0, total - 1),
      xDomain: [xMin, xMax],
      yDomain: [yMin, yMax],
    };
  }

  return {
    zoom: 1.0,
    startIndex: 0,
    endIndex: Math.max(0, total - 1),
  };
}

/**
 * Updates a viewport given a zoom factor and an anchor ratio (0.0 to 1.0)
 * corresponding to the cursor pointer position along the chart width.
 */
export function zoomViewportAtAnchor(
  current: ChartViewport,
  series: ChartDataSeries | null,
  zoomFactor: number, // > 1 for zoom in, < 1 for zoom out
  anchorRatioX: number = 0.5,
  anchorRatioY: number = 0.5
): ChartViewport {
  if (!series || !Array.isArray(series.data) || series.data.length === 0) {
    return current;
  }

  const rawData = series.data;
  const total = rawData.length;
  const chartType = (series.type || "bar") as ChartType;

  // 1. Scatter Chart Viewport Zoom
  if (chartType === "scatter" && current.xDomain && current.yDomain) {
    const [origXMin, origXMax] = current.xDomain;
    const [origYMin, origYMax] = current.yDomain;

    const spanX = origXMax - origXMin;
    const spanY = origYMax - origYMin;

    const newZoom = Math.max(1.0, Math.min(10.0, current.zoom * zoomFactor));
    if (newZoom <= 1.01) {
      return createInitialViewport(series);
    }

    const relFactor = newZoom / current.zoom;
    const newSpanX = spanX / relFactor;
    const newSpanY = spanY / relFactor;

    const focalX = origXMin + anchorRatioX * spanX;
    const focalY = origYMin + (1 - anchorRatioY) * spanY;

    const newXMin = focalX - anchorRatioX * newSpanX;
    const newXMax = newXMin + newSpanX;
    const newYMin = focalY - (1 - anchorRatioY) * newSpanY;
    const newYMax = newYMin + newSpanY;

    return {
      zoom: Number(newZoom.toFixed(2)),
      startIndex: 0,
      endIndex: total - 1,
      xDomain: [Number(newXMin.toFixed(2)), Number(newXMax.toFixed(2))],
      yDomain: [Number(newYMin.toFixed(2)), Number(newYMax.toFixed(2))],
    };
  }

  // 2. Sequential & Categorical Chart Viewport Zoom (Line, Area, Bar, Boxplot)
  const currentWindowSize = Math.max(2, current.endIndex - current.startIndex + 1);
  const focalIndex = current.startIndex + anchorRatioX * (currentWindowSize - 1);

  // New window size
  const newWindowSize = Math.max(2, Math.min(total, Math.round(currentWindowSize / zoomFactor)));
  if (newWindowSize >= total) {
    return {
      zoom: 1.0,
      startIndex: 0,
      endIndex: total - 1,
    };
  }

  let newStart = Math.round(focalIndex - anchorRatioX * (newWindowSize - 1));
  let newEnd = newStart + newWindowSize - 1;

  // Clamp to boundaries
  if (newStart < 0) {
    newStart = 0;
    newEnd = Math.min(total - 1, newWindowSize - 1);
  }
  if (newEnd >= total) {
    newEnd = total - 1;
    newStart = Math.max(0, total - newWindowSize);
  }

  const effectiveZoom = Number((total / newWindowSize).toFixed(1));

  return {
    zoom: Math.max(1.0, effectiveZoom),
    startIndex: newStart,
    endIndex: newEnd,
  };
}

/**
 * Shifts the visible viewport window left or right by a delta of records.
 */
export function panViewport(
  current: ChartViewport,
  series: ChartDataSeries | null,
  deltaSteps: number
): ChartViewport {
  if (!series || !Array.isArray(series.data) || series.data.length === 0) {
    return current;
  }

  const total = series.data.length;
  const windowSize = current.endIndex - current.startIndex + 1;

  if (windowSize >= total) return current;

  let newStart = current.startIndex + deltaSteps;
  let newEnd = current.endIndex + deltaSteps;

  if (newStart < 0) {
    newStart = 0;
    newEnd = windowSize - 1;
  }
  if (newEnd >= total) {
    newEnd = total - 1;
    newStart = total - windowSize;
  }

  return {
    ...current,
    startIndex: newStart,
    endIndex: newEnd,
  };
}

/**
 * Resolves the ChartViewport into the exact visible data slice and recalibrated axes domains.
 */
export function resolveZoomedDomain(
  series: ChartDataSeries | null,
  viewport: ChartViewport
): ZoomedDomainResult {
  if (!series || !Array.isArray(series.data) || series.data.length === 0) {
    return {
      visibleData: [],
      yDomain: ["auto", "auto"],
      isZoomed: false,
      totalPoints: 0,
      visibleCount: 0,
      zoomLevel: 1.0,
      canPanLeft: false,
      canPanRight: false,
    };
  }

  const rawData = series.data;
  const total = rawData.length;
  const chartType = (series.type || "bar") as ChartType;

  // 1. Baseline View (1.0x)
  if (viewport.zoom <= 1.01 || (viewport.startIndex === 0 && viewport.endIndex === total - 1 && !viewport.xDomain)) {
    return {
      visibleData: rawData,
      yDomain: ["auto", "auto"],
      xDomain: undefined,
      isZoomed: false,
      totalPoints: total,
      visibleCount: total,
      zoomLevel: 1.0,
      canPanLeft: false,
      canPanRight: false,
    };
  }

  // 2. Scatter Chart Domain Recalibration
  if (chartType === "scatter" && viewport.xDomain && viewport.yDomain) {
    const [xMin, xMax] = viewport.xDomain;
    const [yMin, yMax] = viewport.yDomain;

    const filtered = rawData.filter((pt) => {
      const px = Number(pt.x);
      const py = Number(pt.y);
      return px >= xMin && px <= xMax && py >= yMin && py <= yMax;
    });

    return {
      visibleData: filtered,
      xDomain: [Math.floor(xMin), Math.ceil(xMax)],
      yDomain: [Math.floor(yMin), Math.ceil(yMax)],
      isZoomed: true,
      totalPoints: total,
      visibleCount: filtered.length,
      zoomLevel: viewport.zoom,
      canPanLeft: true,
      canPanRight: true,
    };
  }

  // 3. Sequential & Categorical Chart Domain Recalibration
  const validStart = Math.max(0, Math.min(viewport.startIndex, total - 1));
  const validEnd = Math.max(validStart, Math.min(viewport.endIndex, total - 1));
  const visibleSlice = rawData.slice(validStart, validEnd + 1);

  const yKey = series.yKey || (rawData[0]?.value !== undefined ? "value" : rawData[0]?.y !== undefined ? "y" : "value");

  const visibleYValues: number[] = [];
  visibleSlice.forEach((item) => {
    if (typeof item[yKey] === "number" && !isNaN(item[yKey])) {
      visibleYValues.push(item[yKey]);
    }
    if (typeof item.historical === "number" && !isNaN(item.historical)) {
      visibleYValues.push(item.historical);
    }
    if (typeof item.forecast === "number" && !isNaN(item.forecast)) {
      visibleYValues.push(item.forecast);
    }
    Object.keys(item).forEach((k) => {
      if (typeof item[k] === "number" && !isNaN(item[k]) && k !== "id" && k !== "index") {
        visibleYValues.push(item[k]);
      }
    });
  });

  let yDomain: [number | "auto", number | "auto"] = ["auto", "auto"];

  if (visibleYValues.length > 0) {
    const minY = Math.min(...visibleYValues);
    const maxY = Math.max(...visibleYValues);

    if (minY === maxY) {
      const pad = minY === 0 ? 1 : Math.abs(minY * 0.1);
      yDomain = [Math.floor(minY - pad), Math.ceil(maxY + pad)];
    } else {
      const range = maxY - minY;
      const padding = range * 0.08;

      if (chartType === "bar" && minY >= 0) {
        yDomain = [0, Math.ceil(maxY + padding)];
      } else {
        yDomain = [Math.floor(minY - padding), Math.ceil(maxY + padding)];
      }
    }
  }

  return {
    visibleData: visibleSlice,
    yDomain,
    xDomain: undefined,
    isZoomed: true,
    totalPoints: total,
    visibleCount: visibleSlice.length,
    zoomLevel: viewport.zoom,
    canPanLeft: validStart > 0,
    canPanRight: validEnd < total - 1,
  };
}
