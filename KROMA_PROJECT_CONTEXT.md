# KROMA: Autonomous Data Analyst & Executive Intelligence Platform
## Permanent Engineering Context & Architectural Source of Truth

> **CRITICAL PROTOCOL FOR ALL FUTURE AI AGENTS:**  
> This document is the **single source of truth** for the Kroma project. Before modifying or adding any code, reading any task, or making design decisions in this repository, you **MUST** read and understand this file. Do not invent new architectural patterns, do not introduce external cloud dependencies, do not use emojis, and do not alter the design palette without consulting this document.

---

## 1. Product Overview & Philosophy

### 1.1 Product Definition
**Kroma** is an autonomous, local-first data analyst and executive intelligence desktop application. It transforms raw, messy, multi-schema CSV spreadsheets into interactive **Bento Dashboards**, predictive trajectories, and plain-English executive narrative insights with **zero cloud exposure**.

### 1.2 The Core Autonomous Workflow
```text
Raw CSV File Drop
       │
       ▼
Local Client Parsing (PapaParse dynamicTyping)
       │
       ▼
Schema Intelligence & Column Profiling (7 data classes)
       │
       ▼
Structural Relationship Discovery (Pearson r, cross-tab, funnels, cohorts)
       │
       ▼
Dataset Intelligence Profile Generation (Measures, dimensions, temporal, quality)
       │
       ▼
Deterministic Analytical Capability Validation (Forecasting, trends, prediction, correlations)
       │
       ▼
Visualization Recommendation & Dashboard Specification (DashboardSpec)
       │
       ▼
Executive Bento Canvas & Deep-Dive 2x2 Statistical Matrix
       │
       ▼
Decoupled Natural-Language AI Exploration (Ollama Qwen 2.5 Coder 7B)
       │
       ▼
Structured AI Actions (REFRESH_DASHBOARD / REBUILD_DASHBOARD around focal theme)
```

### 1.3 Core Product Philosophy
- **Local-First & Data Sovereignty:** The user's data never leaves their local workstation. All parsing, transformation, statistical analysis, charting, and LLM inference execute on `localhost`.
- **Autonomous & Zero-Config:** Users drag and drop a raw CSV file. The system infers data types, imputes missing cells, classifies the dataset profile, validates analytical capabilities, and builds an optimal visualization canvas without asking for manual chart configuration.
- **Deterministic Facts + AI Interpretation:** The TypeScript Data Intelligence Engine is the authoritative source of truth for all numerical calculations, totals, and distributions. The local LLM interprets these facts and handles conversational user intent, rather than hallucinating stats from sample rows.
- **Deterministic Baseline + Decoupled Chat:** The baseline dashboard is immutable and deterministic. Conversational AI queries generate self-contained inline charts and narrative explanations in the chat thread without corrupting or wiping the Bento dashboard.
- **Controlled Dashboard Rebuilds:** When the user explicitly requests to "Refresh the dashboard" or "Rebuild around profitability", Kroma executes a structured action that re-synthesizes the `DashboardSpec` while preserving the conversational history.

---

## 2. End-to-End System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│               DESKTOP RUNTIME LAYER (Tauri v2 / Rust)                  │
│  • Native Windows Packaging (x64 .exe / .msi)                          │
│  • WebView2 Runtime Host                                               │
│  • Strict Localhost CSP Boundary (http://127.0.0.1:11434)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             PRESENTATION LAYER (Next.js 14 App Router)                 │
│  • Static Site Generation (SSG: output: "export")                      │
│  • Client-Side React 18 Component Tree with Strict TypeScript          │
│  • "Watermelon UI" Design System (Tailwind CSS + CSS Custom Properties)│
│  • Framer Motion Transitions & Lucide Minimalist Iconography           │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│   IN-MEMORY DATA INTELLIGENCE ENGINE │ │ LOCAL AI INFERENCE ENGINE     │
│   (lib/dataIntelligence.ts, etc.)    │ │ (lib/ollama.ts)               │
│  • Column Semantic Profiler          │ │ • Ollama Local Daemon         │
│  • Relationship Discovery Engine     │ │ • Model: qwen2.5-coder:7b     │
│  • Capability Validation Layer       │ │ • Authoritative Fact Context  │
│  • Visualization Recommender         │ │ • Structured Action Parser    │
│  • Dashboard Spec Synthesizer        │ │ • Direct Client Fetch Fallback│
│  • Conditional Forecast Trajectory   │ │ • DuckDB SQL Query Generator  │
└──────────────────────────────────────┘ └───────────────────────────────┘
```

### 2.1 Technology Stack Matrix

| Layer | Technology | Version | Location / Source | Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop Wrapper** | Tauri Core / CLI | `^2.11.1` / `^2.11.4` | [`src-tauri/`](file:///c:/Users/luthf/Downloads/DataAnalyst/src-tauri/) | Native window lifecycle, security boundary, OS packaging |
| **Framework** | Next.js (App Router) | `^14.2.7` | [`app/`](file:///c:/Users/luthf/Downloads/DataAnalyst/app/) | Static export UI router (`output: "export"`) |
| **Language** | TypeScript | `^5.5.4` | [`tsconfig.json`](file:///c:/Users/luthf/Downloads/DataAnalyst/tsconfig.json) | End-to-end type safety and schema definitions |
| **Styling** | Tailwind CSS | `^3.4.10` | [`tailwind.config.js`](file:///c:/Users/luthf/Downloads/DataAnalyst/tailwind.config.js) | Dark editorial tokenized layout engine |
| **Visualizations** | Recharts | `^2.12.7` | [`components/ChartCard.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ChartCard.tsx) | SVG-based responsive charting |
| **Motion** | Framer Motion | `^13.1.1` | [`package.json`](file:///c:/Users/luthf/Downloads/DataAnalyst/package.json) | Modals, drawers, and transition physics |
| **CSV Parser** | PapaParse | `^5.4.1` | [`lib/dataEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/dataEngine.ts) | Fast in-memory parsing with dynamic typing |
| **Iconography** | Lucide React | `^0.439.0` | [`components/`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/) | Vector icons (strictly replaces emojis) |
| **Local LLM** | Ollama / Qwen 2.5 Coder | `7B Parameters` | [`lib/ollama.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/ollama.ts) | Structured JSON insight & SQL synthesis |
| **Session Cache** | LocalStorage / Firebase | Optional Cloud | [`lib/firebase.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/firebase.ts) | Local session history (`ai_data_analyst_sessions`) |

---

## 3. Data Intelligence & Ingestion Pipeline

The data intelligence architecture is modularized across specialized functional layers:
- [`lib/dataIntelligence.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/dataIntelligence.ts): Schema profiling, missingness, numeric distribution stats, temporal continuity, and dataset intelligence profile creation.
- [`lib/relationshipEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/relationshipEngine.ts): Pearson correlation, cohort variance, time-series velocity, target outcome cross-tabulations, and 2D matrices.
- [`lib/capabilityEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/capabilityEngine.ts): Deterministic validation of analytical capabilities.
- [`lib/visualizationEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/visualizationEngine.ts): Recommendation layer matching data relationships to optimal visualizations.
- [`lib/dashboardEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/dashboardEngine.ts): Synthesis of dynamic `DashboardState` and focused dashboard rebuilds.
- [`lib/dataEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/dataEngine.ts): Root orchestrator for parsing, imputation, and backward compatibility.

### 3.1 Column Semantic Partitioning (7 Data Classes)
1. **Identifier Columns (`idColumns`):** Column names matching `id`, `*_id`, `*id`, `code`, `*_code`, `ssn`, `ticket`, `uuid`. Excluded from numeric aggregations.
2. **Date Columns (`dateColumns`):** Columns containing `date`, `quarter`, `month`, `year`, `time`, `timestamp`, `day`. Evaluated for temporal frequency and continuity.
3. **Binary / Target Flags (`binaryTargetColumns`):** Numeric/boolean columns with $\le 2$ unique values (`0`, `1`, `true`, `false`) or matching known outcome keywords (`stroke`, `survived`, `churn`, `hypertension`, `heart_disease`, `active`, `target`, `default`, `outcome`, `attrition`, `converted`).
4. **Non-Additive Numerics (`nonAdditiveNumericColumns`):** Rates, ratios, or indivisible physical metrics (`age`, `bmi`, `glucose`, `rate`, `rating`, `temp`, `score`, `percent`, `ratio`, `delay`, `tenure`, `pclass`, `fare`).
5. **Additive Numerics (`additiveNumericColumns`):** Continuous numeric metrics that can be meaningfully summed (`amount`, `sales`, `revenue`, `price`, `cost`, `spend`, `budget`, `profit`, `expense`, `units`).
6. **Low-Cardinality Categoricals (`lowCardinalityCategories`):** String/category fields with **between 2 and 6 distinct values**. (Strictly the only columns permitted for Donut/Pie charts).
7. **High-Cardinality Text (`highCardinalityTextColumns`):** Categorical fields with $> 6$ distinct values (e.g., customer names, descriptions).

### 3.2 Bi-Modal Safe Missing Value Imputation
- **Additive Numeric Columns:** Imputed with `0` (preserves baseline totals).
- **Non-Additive Numeric Columns:** Imputed with the **median** of valid entries (preserves standard deviations and cohort averages).
- **Categorical Columns:** Imputed with `"[Unassigned]"`.

---

## 4. Relationship Discovery & Capability Validation

### 4.1 Discovered Relationship Types ([`lib/relationshipEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/relationshipEngine.ts))
- **Numeric ↔ Numeric Correlation ($r$):** Calculates Pearson correlation matrix across numeric measures ($r \in [-1, 1]$). Recommends `scatter` charts when meaningful co-movement exists.
- **Temporal ↔ Numeric Trend:** Evaluates temporal intervals, frequency, and growth deltas over sequential observations.
- **Category ↔ Numeric Breakdown:** Measures mean and sum variance across categorical segments.
- **Target Outcome ↔ Cohort Risk:** Computes positive target rates across demographic groups.
- **Category ↔ Category (Cross-Tabulation):** 2D matrix intersections for cohort clustering and heatmap rendering.

### 4.2 Deterministic Analytical Capabilities ([`lib/capabilityEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/capabilityEngine.ts))
- **`timeSeriesForecasting`:** Strictly conditional. Requires a valid temporal column, $\ge 6$ historical observations, high temporal continuity score ($\ge 50\%$), and continuous numeric measures. If unfulfilled, forecasting is marked inactive with explicit reasons.
- **`trendAnalysis`:** Requires a temporal dimension with $\ge 3$ sequential observations.
- **`targetPrediction`:** Requires at least one detected target outcome flag paired with explanatory feature attributes.
- **`correlationAnalysis`:** Requires at least 2 distinct continuous numeric metrics.
- **`cohortAnalysis`:** Requires at least one low/medium cardinality categorical dimension.
- **`funnelAnalysis`:** Requires operational stage/status workflow attributes.
- **`distributionAnalysis`:** Requires numeric measures with $\ge 10$ records.

---

## 5. Dataset Archetypes & Adaptive Bento Dashboard

Datasets are classified into 4 foundational archetypes, enriched with multi-signal characteristics:

1. **`FINANCIAL`:** Revenue, spend, transactions, run rate, category margin, spending forecast.
2. **`QUANTITATIVE_PROGRESS`:** Longitudinal velocity, tracking streaks, baseline vs peak spreads.
3. **`CATEGORICAL_OPERATIONAL`:** Pipeline stage volume, cycle velocity, throughput ratios.
4. **`CROSS_SECTIONAL_DISCOVERY`:** Population demographics, cohort spreads, target outcome disparities.

### 5.1 Dynamic Bento Grid Layout ([`components/BentoGrid.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/BentoGrid.tsx))
- **Dataset Intelligence & Capability Bar:** Displays detected profile, row/attribute count, observation frequency, active analytical capabilities badges, and active focal rebuild theme.
- **Top Row (12 Cols):** 4 Dynamic Executive KPI Cards tailored to the dataset.
- **Hero Perspective (`col-span-8`):** Area trend or primary cohort bar visual with calculated variance.
- **Volume Donut / Distribution (`col-span-4`):** Guaranteed low-cardinality proportional breakdown ($\le 6$ slices).
- **Comparative Yield / Risk Cross-Tab (`col-span-6`):** Secondary cohort distribution or target rate cross-tabulation.
- **Executive Highlights Card (`col-span-6`):** Completeness ratio, primary driver, and dominant cohort.
- **Conditional What-If Trajectory Engine (12 Cols):** Rendered only if forecasting is validated. If inactive, renders a clean capability status banner.
- **Full Dataset Table (12 Cols):** Collapsible paginated preview table.

---

## 6. Local AI Inference & Structured Actions

### 6.1 Inference Pipeline ([`lib/ollama.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/ollama.ts))
- **Ollama Local Endpoint:** `http://127.0.0.1:11434/api/chat`
- **Model:** `qwen2.5-coder:7b` with `format: "json"`
- **Authoritative Fact Context:** Ollama receives computed statistics (means, medians, stdDev, sums, top frequencies), available capabilities with explicit reasons, and detected relationships.
- **Strict Invariant:** Ollama does not hallucinate statistics; the deterministic Data Intelligence Engine is the authority.

### 6.2 Structured AI Actions
The LLM returns a structured `action` object:
```json
{
  "explanation": "**[Direct Answer]**\n...\n\n**[Key Drivers & Comparisons]**\n- ...\n\n**[Compounding Relationship]**\n...\n\n**[Executive Takeaway]**\n...",
  "insight": "1 sentence executive takeaway.",
  "action": {
    "type": "ANSWER" | "CREATE_VISUALIZATION" | "REFRESH_DASHBOARD" | "REBUILD_DASHBOARD" | "FORECAST" | "ANALYZE_RELATIONSHIP",
    "focus": "profitability"
  },
  "sql": "SELECT ... FROM dataset",
  "chartType": "scatter",
  "chartTitle": "Correlation Analysis",
  "xAxisLabel": "Metric A",
  "yAxisLabel": "Metric B",
  "chartData": [...]
}
```

### 6.3 Controlled Dashboard Refresh & Rebuild ([`components/Workspace.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/Workspace.tsx))
- When the user asks to "Refresh the dashboard" or "Rebuild focusing on profit", the AI returns `action.type === "REBUILD_DASHBOARD"` with `action.focus === "profit"`.
- `Workspace.tsx` calls `refreshDashboardWithFocus(tableData, columns, focus)`.
- The dashboard regenerates dynamically around the requested metric while preserving the entire chat history.

---

## 7. Local-First Privacy & Desktop Packaging

### 7.1 Data Sovereignty
- **Zero Cloud Exposure:** No CSV rows, metadata, or queries leave `localhost`.
- **Session Storage:** Saved sessions are stored in `localStorage` under `ai_data_analyst_sessions`.

### 7.2 Tauri v2 Desktop Host ([`src-tauri/`](file:///c:/Users/luthf/Downloads/DataAnalyst/src-tauri/))
- **Configuration:** [`src-tauri/tauri.conf.json`](file:///c:/Users/luthf/Downloads/DataAnalyst/src-tauri/tauri.conf.json)
- **Frontend Distribution:** `../out` (Next.js static export `output: "export"`).
- **CSP Boundary:** Localhost access permitted to `http://127.0.0.1:11434` and `http://localhost:11434`.

---

## 8. Design System: "Watermelon UI"

Kroma follows a **Dark Editorial Creative-Tech** visual identity.

### 8.1 Color Palette
```text
Canvas Background:  #212222   (Main deep dark canvas)
Surface / Card:     #18191b   (Frosted Bento containers and modals)
Primary Coral:      #C86342   (Canonical brand accent, hero series, primary CTAs)
Velvet Orchid:      #A5329E   (Secondary series, comparisons, scenario badges)
Text Primary:       #FFFFFF   (Headings, primary metrics, high contrast)
Text Muted:         rgba(255, 255, 255, 0.55)  (Labels, axis markers, subtext)
Card Border:        rgba(255, 255, 255, 0.10)  (1px sharp frosted glass border)
```

### 8.2 Deprecated Design Tokens
- **Sky Cyan (`#38BDF8`):** Legacy token from older specifications. Deprecated for new components.

### 8.3 HARD CONSTRAINT: Zero-Emoji Policy
> **STRICT RULE:** The Kroma user interface must contain **ZERO EMOJIS**.  
> Always use Lucide React vector icons, SVG shapes, or bracketed monospace tags (e.g. `[Active]`, `[Close]`, `[Verified]`, `[Forecasting Inactive]`).

### 8.4 Typography Standards
- **Headings & Display:** `Outfit`, `Inter`, sans-serif
- **Body & Controls:** `Inter`, system-ui, sans-serif
- **Tabular Data, Code, Badges, Metrics:** `JetBrains Mono`, monospace

---

## 9. Complete Component Inventory

```text
components/
├── BentoGrid.tsx          # 12-col Bento canvas, Dataset Intelligence banner, active capabilities, conditional forecasting.
├── ChartCard.tsx          # Polymorphic chart renderer (Bar, Line, Area, Pie, BoxPlot, Heatmap, Scatter, Treemap).
├── ChartModal.tsx         # Full-screen deep-dive inspection modal with 2x2 statistical matrix and executive narrative.
├── ChatPanel.tsx          # Decoupled AI conversational interface with structured markdown & inline Recharts.
├── CsvUploader.tsx        # Hero drag-and-drop landing state with background atmospheric tiles and demo dataset chips.
├── MetricCard.tsx         # Executive KPI card with uppercase monospace label, large counter, and subtext pill.
├── Sidebar.tsx            # Collapsible session history drawer with new analysis triggers and status badges.
├── WhatIfWidget.tsx       # Interactive scenario modeling widget with delta sliders and projection curves.
├── Workspace.tsx          # Root orchestrator managing sessions, uploads, tabs, modal state, structured actions, and Ollama bridge.
└── ui/
    ├── AIComposer.tsx     # Enhanced prompt input with suggestion chips.
    ├── Badge.tsx          # Monospace tag pill component.
    ├── BrandMark.tsx      # Vector brand logo glyph.
    ├── Button.tsx         # Standard styled button primitive.
    ├── Card.tsx           # Generic surface container.
    ├── DynamicChart.tsx   # Dynamic chart wrapper.
    ├── RadialGradient.tsx # Ambient background lighting gradient.
    ├── StaticGrid.tsx     # Background architectural grid overlay.
    ├── Table.tsx          # Full dataset paginated preview table with column sorting.
    └── Tiles.tsx          # Interactive mouse-reactive background grid tiles.
```

---

## 10. Complete Repository File Map

```text
/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts         # Next.js API route for dev mode Ollama proxy (disabled in static export)
│   ├── globals.css              # Design tokens, custom scrollbars, noise filter overlay, typography imports
│   ├── layout.tsx               # Root HTML shell with dark theme metadata
│   └── page.tsx                 # Entry page rendering the Workspace component
├── components/                  # (See Component Inventory above)
├── lib/
│   ├── dataEngine.ts            # Root analytical orchestrator, ingestion, imputation, and backward compatibility
│   ├── dataIntelligence.ts      # Schema profiling, column statistics, temporal analytics, and profile synthesis
│   ├── relationshipEngine.ts    # Pearson correlation, cohort variance, time-series velocity, and cross-tabulations
│   ├── capabilityEngine.ts      # Deterministic analytical capability validation layer
│   ├── visualizationEngine.ts   # Chart recommendation layer and trajectory projection calculations
│   ├── dashboardEngine.ts       # Dynamic DashboardSpec synthesis and focused dashboard regeneration
│   ├── firebase.ts              # Session persistence engine with local storage fallback
│   ├── ollama.ts                # Ollama prompt synthesis, structured action parsing, and direct fetch client
│   ├── types.ts                 # TypeScript interfaces (DatasetIntelligenceProfile, Capabilities, Actions, DashboardState)
│   └── utils.ts                 # Tailwind class merger (clsx + twMerge)
├── src-tauri/
│   ├── src/
│   │   └── main.rs              # Rust entry point initializing Tauri desktop runtime
│   ├── Cargo.toml               # Tauri Rust crate dependencies
│   ├── build.rs                 # Tauri build script
│   └── tauri.conf.json          # Desktop window definitions, security CSP, and WiX installer metadata
├── next.config.mjs              # Next.js 14 static export configuration (output: "export")
├── tailwind.config.js           # Tailwind theme extension with brand colors and radii
├── tsconfig.json                # TypeScript compiler configuration with @/* path aliases
├── package.json                 # Node dependencies and build scripts
└── KROMA_PROJECT_CONTEXT.md     # Single source of truth / AI project memory
```

---

## 11. Development & Build Commands

```bash
# 1. Install Node dependencies
npm install

# 2. Run Next.js web application in development mode (port 3000)
npm run dev

# 3. Create static Next.js export build (compiles to /out)
npm run build

# 4. Clean build artifacts and Windows compilation locks
npm run desktop:clean

# 5. Run native Tauri desktop app in development mode
npm run desktop:dev

# 6. Compile native Windows production binaries (.exe and .msi)
npm run desktop:build

# 7. Execute TypeScript and ESLint linting checks
npm run lint
```

---

## 12. Non-Negotiable Project Constraints

1. **Local Privacy Invariant:** Never transmit raw CSV data, row values, or column names to external third-party cloud APIs.
2. **Local AI Invariant:** Ollama on `http://127.0.0.1:11434` with model `qwen2.5-coder:7b` is the official local LLM runtime.
3. **Deterministic Authority:** Numerical calculations, correlations, distributions, and capabilities are decided deterministically in TypeScript. The LLM interprets facts, it does not invent them.
4. **Decoupled Chat Invariant:** Conversational queries generate inline responses inside the chat thread without wiping the Bento dashboard.
5. **Zero-Emoji Policy:** Absolutely no emojis in any UI, button, label, chart, error state, or generated text.
6. **Strict Design Palette:** Only use the approved brand colors (`#212222`, `#18191b`, `#C86342`, `#A5329E`, `#FFFFFF`).
7. **Cardinality Safeguard:** Donut / Pie charts are strictly forbidden for categorical variables with $> 6$ unique values.
8. **Conditional Forecasting:** Never generate a forecast unless a continuous temporal dimension with $\ge 6$ historical observations is validated.
9. **Safe Imputation:** Additive metrics must be imputed with `0`; non-additive metrics with the **median**.
10. **Static Export Compatibility:** All frontend code must remain compatible with Next.js static export (`output: "export"`).

---

## 13. Known Issues & Technical Debt

| Issue | Severity | Affected Files | Current Behavior | Recommended Solution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API Route in Static Export** | Low | `app/api/analyze/route.ts`, `components/Workspace.tsx` | Next.js API routes are not compiled into `out/` during static export. | `Workspace.tsx` gracefully catches the failure and redirects to `queryOllamaDirect()` client-side. | Managed via Fallback |
| **Windows Process File Locks** | Low | `src-tauri/target`, `out/` | Rebuilding Tauri while an instance is running can cause Windows file lock errors. | Use `npm run desktop:clean` to rimraf `.next`, `out`, and `src-tauri/target`. | Documented |
| **Large Dataset Memory Limits** | Low | `lib/dataIntelligence.ts` | CSVs exceeding 100,000 rows may encounter client-side memory latency during correlation computation. | Introduce WebWorker chunking for ultra-large CSVs. | Backlog |

---

## 14. Architecture & Design Decision Log

### 2026-09-16
- **Decision:** Built Autonomous Dataset Intelligence, Relationship Discovery, and Capability Validation Layer.
  - **Reason:** Prevent fixed archetype template forcing and ensure dashboards reflect actual mathematical relationships and data capabilities.
  - **Affected Files:** [`lib/dataIntelligence.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/dataIntelligence.ts), [`lib/relationshipEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/relationshipEngine.ts), [`lib/capabilityEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/capabilityEngine.ts), [`lib/visualizationEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/visualizationEngine.ts), [`lib/dashboardEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/dashboardEngine.ts), [`lib/dataEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/dataEngine.ts), [`lib/types.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/types.ts)
  - **Impact:** Any CSV dataset is deeply profiled; relationships (correlations, cohorts, temporal trends) and capabilities (conditional forecasting, target prediction) are computed deterministically before rendering the dashboard.

- **Decision:** Added Structured AI Actions & Controlled Dashboard Rebuilds (`REFRESH_DASHBOARD`, `REBUILD_DASHBOARD`).
  - **Reason:** Allow users to request conversational dashboard updates and focal tuning (e.g. "focus on profit") without losing chat history or breaking deterministic state.
  - **Affected Files:** [`lib/ollama.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/ollama.ts), [`components/Workspace.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/Workspace.tsx), [`components/BentoGrid.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/BentoGrid.tsx)
  - **Impact:** Chat queries can trigger `refreshDashboardWithFocus()` which re-executes the pipeline on the dataset with focal metrics and updates the Bento grid while retaining conversation threads.

- **Decision:** Enforced "Watermelon UI" Dark Editorial Creative-Tech design system.
  - **Reason:** Previous SaaS-style light dashboard lacked premium executive weight and distinct product identity.
  - **Affected Files:** [`app/globals.css`](file:///c:/Users/luthf/Downloads/DataAnalyst/app/globals.css), [`tailwind.config.js`](file:///c:/Users/luthf/Downloads/DataAnalyst/tailwind.config.js), [`components/`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/)
  - **Impact:** Unified all surfaces around `#212222` canvas, `#18191b` cards, `#C86342` coral accents, `#A5329E` orchid accents, noise textures, and bracketed monospace tags.

- **Decision: Canonical Brand Coral Accent Update (#C86342) & Sidebar Interaction Refactor**
  - **Date:** 2026-09-18
  - **Reason:** Updated brand palette to canonical coral `#C86342` and refined sidebar collapsed interaction to eliminate redundant arrow buttons, using the centered Kroma logo exclusively to expand the sidebar.
  - **Affected Files:** [`tailwind.config.js`](file:///c:/Users/luthf/Downloads/DataAnalyst/tailwind.config.js), [`app/globals.css`](file:///c:/Users/luthf/Downloads/DataAnalyst/app/globals.css), [`components/Sidebar.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/Sidebar.tsx), [`components/`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/)
  - **Impact:**
    - Canonical coral accent is `#C86342` across all styles, arbitrary Tailwind classes, Recharts stroke/fill, and focus rings.
    - Collapsed sidebar contains only the centered Kroma logo (`h-[60px]`); arrow button is completely removed.
    - Collapsed logo click expands sidebar without navigating away from the active session.
    - Expanded logo click navigates to landing page while preserving session history safely.

- **ADR-007: Resolution of Runtime "Cannot find module './276.js'" & UI Rendering Crashes**
  - **Status:** Accepted & Implemented
  - **Date:** 2026-09-16
  - **Context:** The application experienced an intermittent crash where the browser threw `Error: Cannot find module './276.js'` in Webpack runtime, while also displaying an unstyled DOM with a giant 1536px Kroma SVG BrandMark.
  - **Root Cause Analysis:**
    1. *Webpack Stale Cache Desynchronization:* A long-running `next dev` process was invalidated when static builds or package operations altered generated server chunks in `.next/`, leaving `webpack-runtime.js` referencing obsolete chunk IDs (e.g. `276.js`).
    2. *Remote Font Network & CSP Block:* An `@import url('https://fonts.googleapis.com/...')` at line 1 of `globals.css` was blocked by Tauri's local CSP (`style-src 'self' 'unsafe-inline'`) and offline mode, interrupting CSS stylesheet evaluation.
    3. *SVG Intrinsic Dimensions:* `BrandMark.tsx` SVG lacked explicit HTML `width`/`height` attributes and inline defensive constraints, allowing it to expand to 100% viewport width if external CSS was delayed.
    4. *700-Node DOM Explosion in Background Tiles:* `Tiles.tsx` created 700 unconstrained `motion.div` nodes that inflated document height to 5,160px.
  - **Permanent Fixes:**
    1. Cleaned `.next` build artifacts and added `"dev:clean": "rimraf .next && next dev"` script to `package.json`.
    2. Switched fonts completely to Next.js native `next/font/google` (`Inter`, `Outfit`, `JetBrains_Mono`) with local CSS variables (`--font-inter`, `--font-outfit`, `--font-mono`) in `app/layout.tsx`. Zero external network requests; 100% self-contained local `.woff2` font bundles.
    3. Added explicit HTML `width={size}`, `height={size}`, `maxWidth: "100%"`, `height: "auto"`, and `flexShrink: 0` to `components/ui/BrandMark.tsx`.
    4. Replaced `Tiles.tsx` 700 physical DOM nodes with a zero-DOM-cost pure CSS grid pattern.
    5. Implemented `components/ErrorBoundary.tsx` across the root layout and workspace sub-panels (BentoGrid, ChatPanel).
    6. Refactored `ChartModal.tsx` into a two-column viewport with a fixed left chart canvas and independently scrollable right analysis pane containing a structured 6-step narrative hierarchy.
    7. Updated `src-tauri/tauri.conf.json` CSP to explicitly allow `font-src 'self' data:;`.
  - **Affected Files:** [`package.json`](file:///c:/Users/luthf/Downloads/DataAnalyst/package.json), [`app/layout.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/app/layout.tsx), [`app/globals.css`](file:///c:/Users/luthf/Downloads/DataAnalyst/app/globals.css), [`tailwind.config.js`](file:///c:/Users/luthf/Downloads/DataAnalyst/tailwind.config.js), [`components/ui/BrandMark.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ui/BrandMark.tsx), [`components/ui/Tiles.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ui/Tiles.tsx), [`components/ErrorBoundary.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ErrorBoundary.tsx), [`components/Workspace.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/Workspace.tsx), [`components/ChartModal.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ChartModal.tsx), [`src-tauri/tauri.conf.json`](file:///c:/Users/luthf/Downloads/DataAnalyst/src-tauri/tauri.conf.json)

### ADR-004: Central Motion System Architecture (`lib/motion.ts`)
- **Status:** Approved & Implemented (2026-09-16)
- **Context:** The application required a cohesive, editorial, luxury motion language across all screens (landing, composer, dashboard construction, chart reveals, modals, chat stream, sidebar) without bouncy, cartoonish, or distracting animations.
- **Decision:** Built a centralized motion configuration in [`lib/motion.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/motion.ts) leveraging `framer-motion` 13.x (Motion React). Standardized timing tokens (micro 160ms, UI 220ms, entrance 350ms, modal 280ms, dashboard 450ms), custom cubic-bezier curves (`editorial` `[0.16, 1, 0.3, 1]`, `snappy` `[0.22, 1, 0.36, 1]`), spring physics, and reusable variants (`cardEntrance`, `modalContentVariants`, `chipEntrance`, `bannerSlideDown`, `chatMessageUser`, `chatMessageAssistant`, `tableRowVariants`).
- **Safeguards:** Full support for `prefers-reduced-motion` via `useReducedMotion()`. 100% transform and opacity animations only (no layout reflow). Native scrolling preserved without hijacking.
- **Affected Files:** [`lib/motion.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/motion.ts), [`components/KromaComposer.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/KromaComposer.tsx), [`components/Workspace.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/Workspace.tsx), [`components/BentoGrid.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/BentoGrid.tsx), [`components/ChartModal.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ChartModal.tsx), [`components/ChartCard.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ChartCard.tsx), [`components/DataTable.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/DataTable.tsx), [`components/MetricCard.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/MetricCard.tsx), [`components/ChatPanel.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ChatPanel.tsx), [`components/Sidebar.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/Sidebar.tsx), [`components/DatasetSummaryCard.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/DatasetSummaryCard.tsx), [`components/ErrorBoundary.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ErrorBoundary.tsx).

### ADR-005: Next.js Development & Static Build Cache Isolation
- **Status:** Approved & Implemented (2026-09-16)
- **Context:** Executing `next build` concurrently with an active `next dev` background process wiped `.next/static` development chunks on disk, resulting in 404s for `layout.css` and unstyled HTML.
- **Decision:** Standardized dev workflow with `npm run dev:clean` (`rimraf .next && next dev`) and ensured that development and build processes never execute simultaneously on the same `.next` directory.
- **Affected Files:** [`package.json`](file:///c:/Users/luthf/Downloads/DataAnalyst/package.json), [`KROMA_PROJECT_CONTEXT.md`](file:///c:/Users/luthf/Downloads/DataAnalyst/KROMA_PROJECT_CONTEXT.md).

---

### ADR-006: Autonomous Engine v2 Architecture & Deterministic Intelligence Grounding
- **Status:** Approved & Implemented (2026-09-17)
- **Context:** Previous analytical versions suffered from temporal misclassification (longitudinal monthly series misclassified as cross-sectional), fabricated categorical dimensions (e.g. synthetic "General" bucket and 1-slice donut charts when no categorical columns existed), timezone parsing drift ("Jan-2025" shifting to "2024-12-31" UTC), false-positive date parsing on 2-digit numbers (e.g. employee age 24 parsed as year 2024), unbounded forecasting, and LLM mathematical or false causal hallucinations (e.g. claiming ad spend caused an April 2026 revenue dip without proof).
- **Decision:**
  1. **Strict Temporal Intelligence (`lib/temporalUtils.ts`):** Implemented regex-based calendar parsing without UTC timezone drift. Enforced safe date parsing where numbers under 1970 are never treated as dates. Automated future calendar period generation (`Sep-2026` to `Feb-2027`).
  2. **Deterministic Forecasting Engine (`lib/forecastEngine.ts`):** Implemented deterministic Ordinary Least Squares (OLS) regression with 95% confidence intervals (`predictedMin`, `predictedMax`), strict prerequisite validation (>= 6 periods, longitudinal continuity), and period-over-period growth intelligence.
  3. **Zero Fabricated Dimensions:** Removed all synthetic "General" fallbacks. When categorical columns do not exist, `dimensions` is strictly empty (`[]`), and segmentation/cohort/breakdown capabilities are deterministically disabled.
  4. **Grounding & Anti-Hallucination (`lib/ollama.ts`):** Transferred all mathematical computation to TypeScript. The LLM prompt is injected with pre-calculated growth rates, exact period changes (e.g. March to April 2026: $76,100 -> $74,800, -1.7%), and strict non-causal instructions (metrics moving contemporaneously must be reported as co-occurrence, never causation).
  5. **Structured Action Dispatcher (`components/Workspace.tsx`):** Integrated live execution of structured actions (`REFRESH_DASHBOARD`, `FOCUS_ANALYSIS`, `SHOW_FORECAST`, `SHOW_SOURCE_DATA`, `NEW_ANALYSIS`) with deterministic client-side fallbacks when Ollama is unavailable or offline.
  6. **Human-Friendly Editorial Explanations (`components/ChartModal.tsx`):** Restructured narrative presentations to lead with plain-English insights, actionable takeaways, and a collapsible `[Technical Details]` section for statistical jargon (r-value, confidence level, methodology).
- **Affected Files:** `lib/temporalUtils.ts`, `lib/forecastEngine.ts`, `lib/dataIntelligence.ts`, `lib/capabilityEngine.ts`, `lib/visualizationEngine.ts`, `lib/dashboardEngine.ts`, `lib/ollama.ts`, `components/Workspace.tsx`, `components/ChartModal.tsx`, `components/ChartCard.tsx`, `components/DataTable.tsx`.

## 15. Project Changelog

### 2026-09-17 (Engine v2 Upgrade)
- **Added:** Deterministic calendar and temporal parser in `lib/temporalUtils.ts` fixing timezone offsets and preventing 2-digit integers (e.g. Age) from false date matches.
- **Added:** Deterministic 6-month forecasting engine in `lib/forecastEngine.ts` with OLS regression, 95% confidence bounds, and plain English explanation generator.
- **Added:** Growth intelligence module calculating period-over-period changes, growth streaks, and identifying exact dips and peaks.
- **Added:** Question-answering charts in `lib/visualizationEngine.ts` (growth trajectories, multi-metric time series, scatter plots).
- **Added:** Actual vs Forecast visual distinction in `components/ChartCard.tsx` with solid actuals and dashed predictive horizons.
- **Added:** Live structured action execution in `components/Workspace.tsx` with deterministic fallbacks.
- **Added:** Collapsible `[Technical Details]` in `components/ChartModal.tsx` for cleaner executive reading.
- **Fixed:** Eliminated fake "General" categorical dimension and single-slice donut charts when data has no categorical columns.
- **Fixed:** Eliminated fake zero-baseline points in time series data.
- **Fixed:** Eliminated date drift (`Jan-2025` now strictly starts at Jan 2025, no Dec 2024 offset).

### 2026-09-16
- **Added:** Central Motion System ([`lib/motion.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/motion.ts)) with standardized timing tokens, editorial cubic-bezier curves, responsive spring physics, and reusable component animation variants.
- **Added:** Landing page staggered entrance animations (brand badge -> hero heading -> supporting text -> universal composer -> sample dataset chips) with ambient floating background glow.
- **Added:** Universal AI Composer micro-interactions (focus elevation, live tabular data detection badge slide-in, CSV attachment chip enter/exit animations with `AnimatePresence`, analyze loading state).
- **Added:** Progressive Dashboard construction animation (Dataset Summary -> Intelligence Bar -> DataTable -> KPI Row -> Bento Charts -> Forecast/What-If).
- **Added:** KPI Number Counter animations in [`components/MetricCard.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/MetricCard.tsx) smoothly interpolating values on entrance.
- **Added:** Animated Recharts chart rendering across all chart types (bar, line, area, pie, scatter, treemap) with subtle card hover lift.
- **Added:** Modal scale and fade transitions in [`components/ChartModal.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ChartModal.tsx) with fixed left visual canvas and progressive 6-section narrative reveal in the right pane.
- **Added:** Conversational Chat stream animated message reveals with `AnimatePresence` and inline chart animations.
- **Added:** Smooth sidebar collapse/expand layout transition with `motion.aside` and active session coral accent transition.
- **Added:** Seamless page view transitions with `AnimatePresence mode="wait"` between Universal Composer Landing Screen and Active Dashboard Workspace.
- **Added:** Re-analysis loading overlay during `[Refresh Analysis]` preventing jarring unmounts or screen flashes.
- **Added:** Full `prefers-reduced-motion` compliance across all components via `useReducedMotion()`.
- **Fixed:** Resolved Next.js dev server CSS chunk 404 cache collision caused by concurrent build execution; verified clean recovery with `npm run dev:clean`.
- **Fixed:** Maintained 100% Next.js static export (`output: "export"`) and Tauri v2 build compatibility with zero errors.

---

## 16. Current Project State

```text
Project:                 Kroma Autonomous Data Analyst
Platform:                Windows Desktop Native & Web
Desktop Framework:       Tauri v2 (Rust + WebView2)
Frontend:                Next.js 14 App Router (Static Export) + TypeScript + Tailwind CSS
Motion System:           Motion.dev / Framer Motion 13.x (Central lib/motion.ts)
Visualization Engine:    Recharts + Custom SVG Polymorphic Renderers
Data Engine:             Modular Dataset Intelligence (Profiling, Relationships, Capabilities, DashboardSpec)
Local LLM Runtime:       Ollama (http://127.0.0.1:11434 / qwen2.5-coder:7b)
Visual Direction:        Watermelon UI (Dark Editorial Creative-Tech)
Emoji Policy:            STRICT ZERO EMOJIS
Primary Brand Colors:    Canvas #212222, Card #18191b, Coral #C86342, Orchid #A5329E, White #FFFFFF
Last Context Update:     2026-09-18 (Brand Accent #C86342 & Sidebar Interaction)
```

---

## 17. Protocol & Instructions for Future AI Agents

### 17.1 Pre-Change Protocol
1. **Read `KROMA_PROJECT_CONTEXT.md` first.**
2. Inspect the relevant source files before proposing modifications.
3. Verify whether the requested change conflicts with any **Non-Negotiable Constraints** (e.g., zero emojis, local privacy, decoupled chat, approved colors, deterministic statistical authority).
4. Review the **Decision Log** and **Known Issues**.

### 17.2 Implementation Guidelines
- **Targeted Changes:** Make precise edits. Do not rewrite working modules from scratch.
- **Maintain Type Safety:** Update interfaces in [`lib/types.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/types.ts) whenever state or payload structures change.
- **Preserve Safeguards:** Never remove cardinality checks, bi-modal imputation rules, or conditional forecasting validation.
- **Strict Styling & Motion:** Use Tailwind utilities aligned with the `brand` palette and import animation variants directly from [`lib/motion.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/motion.ts).

### 17.3 Post-Change Protocol
1. Run `npm run lint` and `npm run build` to verify clean compilation.
2. Verify that the application continues to build under `output: "export"`.
3. **Update `KROMA_PROJECT_CONTEXT.md`:**
   - Update **Current Project State**.
   - Add an entry to the **Architecture & Design Decision Log** for major decisions.
   - Add an entry to the **Project Changelog**.
   - Update **Component Inventory** or **Known Issues** if applicable.

### 17.4 Conflict Resolution Hierarchy
When encountering conflicting requirements or instructions, resolve in the following order:
```text
1. Actual current source code in the repository
2. Explicit user prompt in the current conversation
3. KROMA_PROJECT_CONTEXT.md
4. Older specification / planning documents
5. AI assumptions (lowest priority)
```

---

## 18. Frontend Build & Styling Invariants

### 18.1 Root Cause Analysis: Dev Server / Build Cache Collision
A critical styling breakdown previously occurred where the browser rendered raw, unstyled HTML (white background, serif fonts, no CSS). The exact root cause:
1. A background `next dev` server process was running while a separate task executed `npm run build` (`next build`).
2. Next.js's production build wiped and regenerated the `.next/` directory with production hashes.
3. The running development server in memory attempted to serve development bundles (`/_next/static/css/app/layout.css` and `/_next/static/chunks/main-app.js`) that had been clobbered on disk, returning **HTTP 404** for all stylesheet and script requests.
4. **Permanent Invariant Rule:** Never run `npm run build` while `next dev` is running concurrently in the same workspace. If `.next` ever desynchronizes or returns 404 for CSS chunks, stop the server, execute `Remove-Item -Recurse -Force .next`, and restart `npm run dev` (or use `npm run dev:clean`).

### 18.2 Core Styling Architecture
- **Global Stylesheet Location:** [`app/globals.css`](file:///c:/Users/luthf/Downloads/DataAnalyst/app/globals.css) is the single authoritative global stylesheet containing `@tailwind base; @tailwind components; @tailwind utilities;` alongside custom Kroma CSS variables (`--bg-canvas`, `--bg-surface`, `--accent-coral`, `--accent-purple`).
- **Stylesheet Import:** Exclusively imported in [`app/layout.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/app/layout.tsx). It must NEVER be imported in individual components or sub-routes.
- **Tailwind Content Paths:** Configured in [`tailwind.config.js`](file:///c:/Users/luthf/Downloads/DataAnalyst/tailwind.config.js) scanning:
  - `./app/**/*.{js,ts,jsx,tsx,mdx}`
  - `./pages/**/*.{js,ts,jsx,tsx,mdx}`
  - `./components/**/*.{js,ts,jsx,tsx,mdx}`
  - `./lib/**/*.{js,ts,jsx,tsx,mdx}`
- **PostCSS Wiring:** [`postcss.config.js`](file:///c:/Users/luthf/Downloads/DataAnalyst/postcss.config.js) maps standard `tailwindcss` and `autoprefixer`.
- **Static Export & Desktop Target:** [`next.config.mjs`](file:///c:/Users/luthf/Downloads/DataAnalyst/next.config.mjs) must always maintain `output: "export"`, `images: { unoptimized: true }`, and `trailingSlash: true` for Tauri v2 compatibility (`src-tauri/tauri.conf.json` maps `frontendDist: "../out"` and `devUrl: "http://localhost:3000"`).

### 18.3 Analytical Chart Viewport & Trackpad Zoom Engine
- **True Analytical Domain Zoom:** Built in [`lib/zoomEngine.ts`](file:///c:/Users/luthf/Downloads/DataAnalyst/lib/zoomEngine.ts) with `ChartViewport` (`zoom`, `startIndex`, `endIndex`, `xDomain`, `yDomain`). Zooming recalculates the visible data window and axes minimum/maximum ticks; it strictly avoids CSS `transform: scale`.
- **Pointer-Anchored Focal Tracking:** Calculates `anchorRatioX = (clientX - rect.left) / rect.width`. The data point directly under the pointer remains anchored under the pointer during trackpad pinch or mouse wheel operations.
- **Scoped Gesture Listener:** The non-passive wheel event listener is attached strictly to the inner chart plotting container DOM element (`chartCanvasRef`) inside [`components/ChartModal.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/ChartModal.tsx). It calls `e.preventDefault()` only within the plotting canvas to block outer browser page zoom while allowing normal scrolling outside the canvas.
- **Shared Viewport State:** Manual buttons (`[-]`, `[+]`, `[Reset]`), pan arrows, drag gestures, and trackpad gestures all mutate the identical `ChartViewport` state.
- **Dashboard Isolation:** All zoom state is modal-local. When closing the modal, dashboard charts remain completely unaffected at baseline scale.

### 18.4 Sidebar Header & Navigation Invariants
- **Collapsed Sidebar (`80px` width):** Contains ONLY the horizontally centered Kroma BrandMark logo inside `h-[60px]`, matching the top navigation bar height. The separate expand arrow button (`>`) has been **completely removed**.
- **Collapsed Logo Click Behavior:** Clicking the Kroma logo when the sidebar is collapsed **expands/opens the sidebar** (`onToggleOpen`). It does **NOT** navigate away from the current session or call `handleNavigateHome()`. The active analysis dashboard and session state remain untouched and visible.
- **Expanded Sidebar (`288px` width):** Displays `[BrandMark + Title] [ChevronLeft]` in the header. Clicking the logo navigates to the landing page (`handleNavigateHome()`). Clicking `ChevronLeft` collapses the sidebar.
- **Session Safety Invariant:** Clicking the logo **never** deletes a session, never clears session history, and never resets the dataset. All active sessions are preserved in Session History and can be restored at any time.
- **Smooth Motion:** Sidebar width transitions smoothly between `80px` and `288px` using Framer Motion with cubic-bezier easing (`[0.16, 1, 0.3, 1]`), fully respecting user reduced-motion preferences.

### 18.5 Bento Grid Zero-Whitespace Guarantee
- In [`components/BentoGrid.tsx`](file:///c:/Users/luthf/Downloads/DataAnalyst/components/BentoGrid.tsx), card spans dynamically adapt:
  - 1 Chart: Chart (8 cols) + Highlights (4 cols) = 12 cols
  - 2 Charts: Chart 0 (8) + Chart 1 (4) = 12 cols (Row 1); Highlights = 12 cols (Row 2)
  - 3 Charts: Chart 0 (8) + Chart 1 (4) = 12 cols (Row 1); Chart 2 (6) + Highlights (6) = 12 cols (Row 2)
  - 4 Charts: Chart 0 (8) + Chart 1 (4) = 12 cols (Row 1); Chart 2 (4) + Chart 3 (4) + Highlights (4) = 12 cols (Row 2)
- Every row mathematically sums to 12 columns, eliminating blank rectangles and unused whitespace.

