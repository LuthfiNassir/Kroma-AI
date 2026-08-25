"use client";

import React from "react";

export function RadialGradient() {
  return (
    <div
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0"
      style={{
        background:
          "radial-gradient(circle 900px at 50% -100px, rgba(165, 50, 158, 0.25), transparent 80%), radial-gradient(circle 700px at 50% 25%, rgba(254, 103, 73, 0.12), transparent 70%)",
      }}
    />
  );
}
