"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BrandMark } from "@/components/ui/BrandMark";

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync maximized state and listen for resize events from Tauri
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    const initWindowState = async () => {
      if (typeof window === "undefined") return;
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        if (appWindow) {
          const max = await appWindow.isMaximized();
          if (isMounted) setIsMaximized(max);

          unlisten = await appWindow.onResized(async () => {
            try {
              const currentMax = await appWindow.isMaximized();
              if (isMounted) setIsMaximized(currentMax);
            } catch {
              // Ignore resize query errors
            }
          });
        }
      } catch {
        // Fallback for non-Tauri / browser development environments
      }
    };

    initWindowState();

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleMinimize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (err) {
      console.warn("TitleBar: minimize failed", err);
    }
  }, []);

  const handleToggleMaximize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      if (await appWindow.isMaximized()) {
        await appWindow.unmaximize();
        setIsMaximized(false);
      } else {
        await appWindow.maximize();
        setIsMaximized(true);
      }
    } catch (err) {
      console.warn("TitleBar: toggleMaximize failed", err);
    }
  }, []);

  const handleClose = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (err) {
      console.warn("TitleBar: close failed", err);
    }
  }, []);

  // Double-clicking the draggable area toggles maximize/restore
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Do not trigger if user double-clicks one of the window control buttons
      if ((e.target as HTMLElement).closest("button")) return;
      handleToggleMaximize();
    },
    [handleToggleMaximize]
  );

  return (
    <header
      className="h-11 w-full bg-[#18191b] border-b border-white/10 flex items-center justify-between select-none shrink-0 z-50 relative overflow-hidden"
    >
      {/* Draggable Title Bar Region (Left & Center) */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleDoubleClick}
        className="flex-1 h-full flex items-center pl-3.5 pr-2 gap-2.5 min-w-0 cursor-default"
      >
        {/* Kroma Logo Asset */}
        <BrandMark className="w-4 h-4 shrink-0 pointer-events-none" />

        {/* Application Title */}
        <span className="text-sm font-mono font-semibold text-white/90 tracking-tight truncate pointer-events-none">
          Kroma AI
        </span>
      </div>

      {/* Window Control Buttons (Right Side) — Non-draggable buttons */}
      <div
        data-tauri-drag-region="false"
        className="flex items-center h-full shrink-0"
      >
        {/* Minimize Button */}
        <button
          type="button"
          onClick={handleMinimize}
          aria-label="Minimize"
          title="Minimize"
          className="w-[46px] h-11 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
        >
          <svg
            width="10"
            height="1"
            viewBox="0 0 10 1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none"
          >
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          aria-label={isMaximized ? "Restore" : "Maximize"}
          title={isMaximized ? "Restore" : "Maximize"}
          className="w-[46px] h-11 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
        >
          {isMaximized ? (
            /* Restore Icon (overlapping squares) */
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none"
            >
              <path
                d="M2.5 0.5H9.5V7.5H8.5V1.5H2.5V0.5Z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.5 2.5H7.5V9.5H0.5V2.5ZM1.5 3.5H6.5V8.5H1.5V3.5Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            /* Maximize Icon (single square) */
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none"
            >
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          )}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          title="Close"
          className="w-[46px] h-11 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#e81123] transition-colors duration-150 cursor-pointer"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none"
          >
            <path
              d="M0.5 0.5L9.5 9.5M9.5 0.5L0.5 9.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
};
