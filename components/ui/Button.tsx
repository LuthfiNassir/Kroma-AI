import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  pill?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  pill = false,
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "font-medium transition-all duration-150 inline-flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantStyles = {
    primary:
      "bg-[#FE6749] text-white hover:bg-[#e85a3c] shadow-md shadow-[#FE6749]/20 active:scale-[0.98]",
    secondary:
      "bg-[#A5329E] text-white hover:bg-[#8e2987] shadow-md shadow-[#A5329E]/20 active:scale-[0.98]",
    outline:
      "bg-white/5 text-white border border-white/15 hover:bg-white/10 hover:border-white/25 active:scale-[0.98]",
    ghost:
      "bg-transparent text-white/70 hover:text-white hover:bg-white/5 active:scale-[0.98]",
    danger:
      "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98]",
  };

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        pill ? "rounded-full" : "rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
