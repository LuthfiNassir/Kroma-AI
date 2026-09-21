"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Table as TableIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { DatasetSourceType } from "@/lib/types";
import { cardEntrance, tableRowVariants, buttonTapMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DataTableProps {
  columns: string[];
  data: Record<string, any>[];
  sourceType?: DatasetSourceType;
  className?: string;
  defaultExpanded?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  sourceType = "csv",
  className = "",
  defaultExpanded = true,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filtering based on search query
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lowerQuery = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerQuery);
      })
    );
  }, [data, columns, searchTerm]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const startIdx = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (!columns || columns.length === 0 || !data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-white/50 bg-[#18191b] rounded-2xl border border-white/10">
        [No tabular dataset loaded]
      </div>
    );
  }

  const startRecordIndex = (validCurrentPage - 1) * pageSize + 1;
  const endRecordIndex = Math.min(validCurrentPage * pageSize, sortedData.length);

  const sourceLabel =
    sourceType === "pasted"
      ? "Pasted Data"
      : sourceType === "prompt_only"
      ? "Prompt Reference"
      : "CSV";

  return (
    <motion.div
      variants={cardEntrance}
      id="source-data-table"
      className={cn(
        "w-full rounded-2xl bg-[#18191b] border border-white/10 overflow-hidden shadow-xl transition-all duration-200",
        className
      )}
    >
      {/* Collapsible Table Header Bar */}
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02]">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#C86342] group-hover:border-[#C86342]/50 transition-colors">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider group-hover:text-[#C86342] transition-colors">
                [SOURCE DATASET]
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/60">
                {sourceLabel}
              </span>
            </div>
            <p className="text-[11px] text-white/50 font-mono pt-0.5">
              {data.length} records · {columns.length} attributes
            </p>
          </div>
        </div>

        {/* Controls: Search, Row Count Selector & Compact Expand/Collapse Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isExpanded && (
            <>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search records..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#212222] border border-white/10 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#C86342] w-40 sm:w-52 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-white/60">
                <span className="text-[10px] uppercase text-white/40">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#212222] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#C86342] cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </>
          )}

          {/* Compact Toggle Button */}
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
            title={isExpanded ? "Collapse Source Dataset" : "Expand Source Dataset"}
          >
            <span>{isExpanded ? "[Collapse]" : "[Expand]"}</span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </motion.button>
        </div>
      </div>

      {/* Animated Collapsible Table Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="source-table-expanded-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {/* Horizontally Scrollable Table Container - 100% Native Scrolling */}
            <div className="overflow-x-auto max-h-[380px] no-scrollbar">
              <table className="w-full text-left text-xs text-white/90 border-collapse">
                <thead className="bg-[#212222] text-white/60 sticky top-0 uppercase text-[10px] font-mono font-semibold tracking-wider border-b border-white/10 z-10 select-none">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center text-white/30 border-r border-white/5">
                      #
                    </th>
                    {columns.map((col) => {
                      const isSorted = sortColumn === col;
                      return (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="py-3 px-4 whitespace-nowrap cursor-pointer hover:text-white hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            <ArrowUpDown
                              className={cn(
                                "w-3 h-3 transition-opacity",
                                isSorted ? "text-[#C86342] opacity-100" : "opacity-30 hover:opacity-70"
                              )}
                            />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, idx) => {
                      const globalRowIndex = startRecordIndex + idx;
                      return (
                        <motion.tr
                          key={`${validCurrentPage}-${idx}`}
                          variants={shouldReduceMotion ? undefined : tableRowVariants}
                          initial={shouldReduceMotion ? undefined : "hidden"}
                          animate={shouldReduceMotion ? undefined : "visible"}
                          transition={{ delay: idx * 0.015 }}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-2.5 px-4 text-center text-white/30 border-r border-white/5 text-[11px]">
                            {globalRowIndex}
                          </td>
                          {columns.map((col) => {
                            const val = row[col];
                            const displayVal =
                              val === null || val === undefined || val === ""
                                ? "-"
                                : typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val);

                            const isNumeric = typeof val === "number";

                            return (
                              <td
                                key={col}
                                className={cn(
                                  "py-2.5 px-4 whitespace-nowrap text-white/80",
                                  isNumeric ? "text-right font-mono" : ""
                                )}
                              >
                                {displayVal}
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="py-8 text-center text-xs font-mono text-white/40"
                      >
                        [No records match search &quot;{searchTerm}&quot;]
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="p-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#212222]/80 text-xs font-mono text-white/60">
              <div className="text-[11px]">
                {sortedData.length > 0 ? (
                  <span>
                    Showing <span className="text-white font-semibold">{startRecordIndex}–{endRecordIndex}</span> of{" "}
                    <span className="text-white font-semibold">{sortedData.length}</span> records
                    {searchTerm && ` (filtered from ${data.length} total)`}
                  </span>
                ) : (
                  <span>0 records found</span>
                )}
              </div>

              {/* Page Nav Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40">
                  Page {validCurrentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <motion.button
                    {...(shouldReduceMotion ? {} : buttonTapMotion)}
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validCurrentPage <= 1}
                    className="p-1.5 rounded-lg border border-white/10 bg-[#18191b] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
                    title="Previous Page"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </motion.button>
                  <motion.button
                    {...(shouldReduceMotion ? {} : buttonTapMotion)}
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-white/10 bg-[#18191b] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
                    title="Next Page"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
