import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
          {
            "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white border border-indigo-700/50 shadow-[0_4px_14px_0_rgba(99,102,241,0.39),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23),inset_0_1px_0_rgba(255,255,255,0.3)] hover:from-indigo-400 hover:to-indigo-500": variant === "default",
            "bg-gradient-to-b from-red-500 to-red-600 text-white border border-red-700/50 shadow-[0_4px_14px_0_rgba(239,68,68,0.39),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.23),inset_0_1px_0_rgba(255,255,255,0.3)] hover:from-red-400 hover:to-red-500": variant === "destructive",
            "border border-slate-200/60 bg-white/50 backdrop-blur-md hover:bg-white/80 hover:text-slate-900 text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)]": variant === "outline",
            "bg-slate-100/80 backdrop-blur-md text-slate-900 hover:bg-slate-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]": variant === "secondary",
            "hover:bg-slate-100/50 hover:text-slate-900 text-slate-600": variant === "ghost",
            "text-indigo-600 underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-lg px-3": size === "sm",
            "h-11 rounded-xl px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
