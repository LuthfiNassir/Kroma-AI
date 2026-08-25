import React from "react";

export function BrandMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#18191B"/>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="white" strokeOpacity="0.1"/>
      <path d="M6 26C6 17.1634 13.1634 10 22 10V26H6Z" fill="#FE6749"/>
      <rect x="18" y="6" width="8" height="12" rx="4" fill="#A5329E"/>
      <circle cx="12" cy="14" r="3" fill="#FFFFFF"/>
    </svg>
  );
}
