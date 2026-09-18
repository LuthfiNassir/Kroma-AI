"use client";

import React, { useRef, useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { RadialGradient } from "@/components/ui/RadialGradient";
import { Tiles } from "@/components/ui/Tiles";
import { SAMPLE_DATASETS } from "@/lib/dataEngine";

interface CsvUploaderProps {
  onUploadCsv: (rawCsv: string, fileName: string) => void;
}

export function CsvUploader({ onUploadCsv }: CsvUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        onUploadCsv(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-[#212222]">
      {/* 1. Atmospheric Glow Layer */}
      <RadialGradient />

      {/* 2. Interactive Animated Tiles Layer */}
      <Tiles />

      {/* 3. Foreground Content */}
      <div className="relative z-10 max-w-2xl w-full text-center space-y-6">
        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <BrandMark className="w-4 h-4" />
          <span className="text-[11px] font-mono tracking-widest text-[#C86342] uppercase font-semibold">
            KROMA · AUTONOMOUS DATA INTELLIGENCE
          </span>
        </div>

        {/* Hero Heading */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight font-sans">
          Transform spreadsheets into <br />
          <span className="text-[#C86342]">visual intelligence.</span>
        </h1>

        {/* Supporting Subtitle */}
        <p className="text-xs md:text-sm text-white/60 max-w-lg mx-auto leading-relaxed font-sans">
          Drop any CSV file below to instantly generate interactive Bento dashboards,
          correlations, and deep statistical discovery with zero cloud exposure.
        </p>

        {/* Dropzone Area */}
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
          className={`relative rounded-3xl border-2 border-dashed p-10 backdrop-blur-md transition-all cursor-pointer bg-[#18191b]/85 shadow-2xl ${
            isDragging
              ? "border-[#C86342] bg-[#C86342]/10"
              : "border-white/15 hover:border-[#C86342]/50 hover:bg-[#18191b]/95"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center space-y-3 font-sans">
            {/* Dropzone Center Icon */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex items-center justify-center">
              <BrandMark className="w-10 h-10" />
            </div>
            <div className="text-sm font-semibold text-white">
              Drag & drop your CSV file here, or <span className="text-[#C86342] underline decoration-1 underline-offset-4">[browse]</span>
            </div>
            <div className="text-xs text-white/40 font-mono">
              Supports any tabular schema · Up to 50MB · 100% on-device compute
            </div>
          </div>
        </div>

        {/* Sample Demo Chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-2 font-sans">
          <span className="text-xs text-white/50 font-mono">Or try sample demo:</span>
          {["Sales", "Department", "Marketing"].map((sample) => {
            const sampleKey = sample.toLowerCase() as "sales" | "department" | "marketing";
            return (
              <button
                key={sample}
                type="button"
                onClick={() => onUploadCsv(SAMPLE_DATASETS[sampleKey], `sample_${sampleKey}.csv`)}
                className="rounded-full px-3.5 py-1 bg-white/5 border border-white/10 text-xs font-mono text-white/80 hover:border-[#C86342]/50 hover:text-white transition cursor-pointer"
              >
                {`[Sample: ${sample}]`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
