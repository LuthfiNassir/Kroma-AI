import React from "react";

interface TableProps {
  columns: string[];
  data: Record<string, any>[];
  maxRows?: number;
}

export const Table: React.FC<TableProps> = ({ columns, data, maxRows = 50 }) => {
  const displayData = data.slice(0, maxRows);

  if (!columns || columns.length === 0 || !data || data.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-white/50 bg-[#18191b] rounded-2xl border border-white/10">
        [No tabular dataset loaded]
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-[#18191b] border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            [Dataset Preview]
          </span>
          <span className="text-[11px] text-white/50 font-mono">
            ({data.length} total rows)
          </span>
        </div>
        <span className="text-[11px] text-white/40">
          Showing first {displayData.length} rows
        </span>
      </div>

      <div className="overflow-x-auto max-h-[360px] no-scrollbar">
        <table className="w-full text-left text-xs text-white/90 border-collapse">
          <thead className="bg-[#212222] text-white/60 sticky top-0 uppercase text-[10px] font-semibold tracking-wider border-b border-white/10 z-10">
            <tr>
              <th className="py-3 px-4 w-12 text-center text-white/30 border-r border-white/5 font-mono">
                #
              </th>
              {columns.map((col) => (
                <th key={col} className="py-3 px-4 font-mono whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayData.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-white/[0.03] transition-colors font-mono"
              >
                <td className="py-2.5 px-4 text-center text-white/30 border-r border-white/5 text-[11px]">
                  {idx + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col];
                  const displayVal =
                    val === null || val === undefined
                      ? "-"
                      : typeof val === "object"
                      ? JSON.stringify(val)
                      : String(val);

                  return (
                    <td
                      key={col}
                      className="py-2.5 px-4 whitespace-nowrap text-white/80"
                    >
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
