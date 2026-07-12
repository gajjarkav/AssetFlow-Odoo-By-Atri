import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-[#F8FAFC] text-black": variant === "default",
          "border-transparent bg-[#2A2A38] text-[#F8FAFC]": variant === "secondary",
          "border-transparent bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30": variant === "destructive",
          "border-transparent bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30": variant === "success",
          "border-transparent bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30": variant === "warning",
          "border-transparent bg-blue-500/20 text-blue-400 border-blue-500/30": variant === "info",
          "text-[#F8FAFC] border-[#2A2A38]": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
