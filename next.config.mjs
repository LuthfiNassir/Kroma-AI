import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
export default (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    distDir: isDev ? ".next-dev" : ".next",
    output: "export",
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
  };
};
