"use client";

import { Workspace } from "@/components/Workspace";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary fallbackTitle="Kroma Application Error">
      <Workspace />
    </ErrorBoundary>
  );
}
