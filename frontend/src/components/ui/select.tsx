import * as React from "react"
import { cn } from "../../lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-[#2A2A38] bg-[#0B0B0F] px-3 py-2 text-sm text-white ring-offset-background placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:ring-offset-2 focus:ring-offset-[#0B0B0F] disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
