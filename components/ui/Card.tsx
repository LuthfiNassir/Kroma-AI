import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "2xl" | "3xl";
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "2xl",
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-[#18191b] border border-white/10 text-white shadow-xl transition-all duration-200",
        variant === "3xl" ? "rounded-3xl" : "rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
