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
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#22C55E] text-black hover:bg-[#16a34a]": variant === "default",
            "bg-[#EF4444] text-white hover:bg-[#DC2626]": variant === "destructive",
            "border border-[#2A2A38] bg-transparent hover:bg-[#1A1A22] hover:text-[#F8FAFC] text-[#F8FAFC]": variant === "outline",
            "bg-[#1A1A22] text-[#F8FAFC] hover:bg-[#2A2A38]": variant === "secondary",
            "hover:bg-[#1A1A22] hover:text-[#F8FAFC] text-[#94A3B8]": variant === "ghost",
            "text-[#22C55E] underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
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
