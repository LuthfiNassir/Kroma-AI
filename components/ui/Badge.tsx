import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "coral" | "purple" | "outline";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white/5 border-white/10 text-white/80",
    coral: "bg-[#FE6749]/15 border-[#FE6749]/30 text-[#FE6749]",
    purple: "bg-[#A5329E]/15 border-[#A5329E]/30 text-[#FE88ED]",
    outline: "bg-transparent border-white/20 text-white/70",
  };

  return (
    <div
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium border w-fit inline-flex items-center gap-1.5 tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
