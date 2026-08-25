import React, { useRef, ChangeEvent } from "react";
import { FileSpreadsheet, Play } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { SAMPLE_DATASETS } from "@/lib/dataEngine";

interface CsvUploaderProps {
  onUploadCsv: (csvContent: string, fileName: string) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onUploadCsv }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        onUploadCsv(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        onUploadCsv(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const loadSample = (sampleKey: keyof typeof SAMPLE_DATASETS, sampleName: string) => {
    onUploadCsv(SAMPLE_DATASETS[sampleKey], `${sampleName}.csv`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 text-center py-6">
      {/* Kroma Hero Section Header */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#FE6749] tracking-widest uppercase mb-3 font-mono">
          KROMA · AUTONOMOUS DATA INTELLIGENCE
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight font-sans">
          Transform spreadsheets<br />into <span className="text-[#FE6749]">visual intelligence.</span>
        </h1>
        <p className="text-sm md:text-base text-white/60 max-w-xl mx-auto mt-3 mb-8">
          Drop any CSV dataset to instantly generate executive Bento dashboards, statistical correlations, and conversational insights.
        </p>
      </div>

      {/* Upload Dropzone Card */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="rounded-3xl border-2 border-dashed border-white/15 hover:border-[#FE6749]/50 bg-[#18191b]/60 p-10 backdrop-blur-sm transition-all cursor-pointer group shadow-2xl space-y-4 max-w-2xl mx-auto"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        <div className="mx-auto w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <BrandMark className="w-12 h-12" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white tracking-tight">
            Drag & drop CSV file or click to browse
          </h3>
          <p className="text-xs text-white/40">
            Supports any delimited dataset up to 50MB. Local privacy guaranteed.
          </p>
        </div>

        <div className="pt-2">
          <span className="rounded-full px-5 py-2 text-xs font-semibold bg-[#FE6749] text-white shadow-lg hover:bg-[#e85a3c] transition inline-flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>[Choose CSV File]</span>
          </span>
        </div>
      </div>

      {/* Preset Sample Dataset Chips */}
      <div className="space-y-3 max-w-2xl mx-auto pt-2">
        <div className="text-center">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest font-mono">
            [Instant Test Datasets]
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => loadSample("department", "Department_Store")}
            className="rounded-2xl bg-[#18191b] border border-white/10 p-3.5 text-left hover:border-[#FE6749]/50 hover:bg-white/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white font-mono">
                [Sample: Department Store]
              </span>
              <Play className="w-3 h-3 text-[#FE6749] opacity-0 group-hover:opacity-100 transition" />
            </div>
            <p className="text-[10px] text-white/40 font-mono">5 departments • Budgets & headcount</p>
          </button>

          <button
            type="button"
            onClick={() => loadSample("sales", "SaaS_Revenue_Metrics")}
            className="rounded-2xl bg-[#18191b] border border-white/10 p-3.5 text-left hover:border-[#A5329E]/50 hover:bg-white/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white font-mono">
                [Sample: SaaS Revenue Metrics]
              </span>
              <Play className="w-3 h-3 text-[#A5329E] opacity-0 group-hover:opacity-100 transition" />
            </div>
            <p className="text-[10px] text-white/40 font-mono">13 records • Regional sales & reps</p>
          </button>

          <button
            type="button"
            onClick={() => loadSample("marketing", "Healthcare_Stroke_Risk")}
            className="rounded-2xl bg-[#18191b] border border-white/10 p-3.5 text-left hover:border-emerald-500/50 hover:bg-white/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white font-mono">
                [Sample: Healthcare Stroke Risk]
              </span>
              <Play className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <p className="text-[10px] text-white/40 font-mono">5 campaigns • Spend & ROI metrics</p>
          </button>
        </div>
      </div>
    </div>
  );
};
