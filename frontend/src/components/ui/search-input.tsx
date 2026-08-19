import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, defaultValue, onChange, onClear, ...props }, ref) => {

    const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (onClear) {
        onClear()
      } else if (onChange) {
        const event = Object.create(e)
        event.target = { value: "" }
        event.currentTarget = { value: "" }
        onChange(event as unknown as React.ChangeEvent<HTMLInputElement>)
      }
    }

    const hasValue = value !== undefined ? value !== "" : defaultValue !== undefined ? defaultValue !== "" : false;

    return (
      <div className={cn("relative w-full", className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          className={cn(
            "pl-9 pr-9 h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors w-full",
            className
          )}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
