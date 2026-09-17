"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { modalContentVariants, buttonTapMotion } from "@/lib/motion";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Kroma] Unhandled UI Exception caught by ErrorBoundary:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] h-full w-full flex items-center justify-center p-6 bg-[#212222] font-sans">
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            className="max-w-lg w-full rounded-3xl bg-[#18191b] border border-red-500/30 p-6 md:p-8 shadow-2xl space-y-5 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/50 uppercase tracking-wider">
                [Kroma Runtime Diagnostic]
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {this.props.fallbackTitle || "Analytics Workspace Rendering Notice"}
              </h2>
              <p className="text-xs text-white/60 leading-relaxed font-sans max-w-sm mx-auto">
                An isolated component state anomaly occurred. The Kroma core engine remains active and safe.
              </p>
            </div>

            {process.env.NODE_ENV !== "production" && this.state.error && (
              <div className="rounded-xl bg-black/40 border border-white/5 p-3 text-left font-mono text-[11px] text-red-300 max-h-24 overflow-y-auto no-scrollbar">
                <code>{this.state.error.message || String(this.state.error)}</code>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <motion.button
                {...buttonTapMotion}
                type="button"
                onClick={this.handleRetry}
                className="rounded-xl bg-[#FE6749] text-white px-5 py-2 text-xs font-semibold hover:bg-[#e85a3c] transition-colors flex items-center gap-2 cursor-pointer font-mono shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>[Retry Analytics]</span>
              </motion.button>
              <motion.button
                {...buttonTapMotion}
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 px-4 py-2 text-xs font-medium transition-colors cursor-pointer font-mono"
              >
                [Reload Application]
              </motion.button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
