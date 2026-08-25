"use client";

import React, { useRef, useState } from "react";
import { RadialGradient } from "@/components/ui/RadialGradient";
import { Tiles } from "@/components/ui/Tiles";
import { BrandMark } from "@/components/ui/BrandMark";
import { SAMPLE_DATASETS } from "@/lib/dataEngine";

interface CsvUploaderProps {
  onUploadCsv: (csvContent: string, fileName: string) => void;
}

export function CsvUploader({ onUploadCsv }: CsvUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("[Error: Please upload a valid .csv file]");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onUploadCsv(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-[#212222]">
      {/* 1. Background Ambient Glow (fixed z-0) */}
      <RadialGradient />

      {/* 2. Interactive Animated Tiles Grid (fixed z-0) */}
      <Tiles />

      {/* 3. Foreground Content (relative z-10) */}
      <div className="relative z-10 max-w-2xl w-full text-center space-y-6 pointer-events-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/15 backdrop-blur-md">
          <BrandMark className="w-4 h-4" />
          <span className="text-[11px] font-mono tracking-widest text-[#FE6749] uppercase font-bold">
            KROMA · AUTONOMOUS DATA INTELLIGENCE
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight font-sans">
          Transform spreadsheets <br />
          into <span className="text-[#FE6749]">visual intelligence.</span>
        </h1>

        <p className="text-sm text-white/60 max-w-lg mx-auto leading-relaxed font-sans">
          Drop any CSV dataset to instantly generate executive Bento dashboards, statistical correlations, and conversational insights.
        </p>

        {/* Dropzone Card */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              processFile(e.dataTransfer.files[0]);
            }
          }}
          className={`relative rounded-3xl border-2 border-dashed p-10 backdrop-blur-md transition-all cursor-pointer bg-[#18191b]/80 shadow-2xl ${
            isDragging
              ? "border-[#FE6749] bg-[#FE6749]/10 scale-[1.01]"
              : "border-white/20 hover:border-[#FE6749]/60 hover:bg-[#18191b]/95"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center space-y-3 font-sans">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-white/80">
              <BrandMark className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-white">
              Drag & drop your CSV file here, or <span className="text-[#FE6749] underline decoration-1 underline-offset-4">[browse]</span>
            </div>
            <div className="text-xs text-white/40 font-mono">
              Supports any tabular schema · Up to 50MB · 100% on-device compute
            </div>
          </div>
        </div>

        {/* Clean Demo Sample Buttons */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-2 font-sans">
          <span className="text-xs text-white/50">Or try sample demo:</span>
          <button
            type="button"
            onClick={() => onUploadCsv(SAMPLE_DATASETS.sales, "sample_sales.csv")}
            className="rounded-full px-3.5 py-1 bg-white/5 border border-white/10 text-xs font-medium text-white/80 hover:border-[#FE6749]/60 hover:text-white hover:bg-white/10 transition-all shadow-sm cursor-pointer"
          >
            [Sample: Sales]
          </button>
          <button
            type="button"
            onClick={() => onUploadCsv(SAMPLE_DATASETS.department, "sample_department.csv")}
            className="rounded-full px-3.5 py-1 bg-white/5 border border-white/10 text-xs font-medium text-white/80 hover:border-[#FE6749]/60 hover:text-white hover:bg-white/10 transition-all shadow-sm cursor-pointer"
          >
            [Sample: Department]
          </button>
          <button
            type="button"
            onClick={() => onUploadCsv(SAMPLE_DATASETS.marketing, "sample_marketing.csv")}
            className="rounded-full px-3.5 py-1 bg-white/5 border border-white/10 text-xs font-medium text-white/80 hover:border-[#FE6749]/60 hover:text-white hover:bg-white/10 transition-all shadow-sm cursor-pointer"
          >
            [Sample: Marketing]
          </button>
        </div>
      </div>
    </div>
  );
}
