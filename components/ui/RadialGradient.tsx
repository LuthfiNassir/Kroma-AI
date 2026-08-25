"use client";

import React from "react";

export function RadialGradient() {
  return (
    <div
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0"
      style={{
        background: "radial-gradient(circle 800px at 50% -100px, rgba(165, 50, 158, 0.18), transparent 80%), radial-gradient(circle 600px at 50% 20%, rgba(254, 103, 73, 0.08), transparent 70%)",
      }}
    />
  );
}
