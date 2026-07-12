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
          "border-transparent bg-slate-900 text-white shadow-sm": variant === "default",
          "border-transparent bg-slate-100 text-slate-900": variant === "secondary",
          "border-transparent bg-red-100 text-red-700 border-red-200": variant === "destructive",
          "border-transparent bg-emerald-100 text-emerald-700 border-emerald-200": variant === "success",
          "border-transparent bg-amber-100 text-amber-700 border-amber-200": variant === "warning",
          "border-transparent bg-indigo-100 text-indigo-700 border-indigo-200": variant === "info",
          "text-slate-900 border-slate-200": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
