// Placeholder SkewedLines decorative component
// Used as a visual background pattern in several pages

import { cn } from "@/lib/utils";

interface SkewedLinesProps {
  className?: string;
}

export function SkewedLines({ className }: SkewedLinesProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]",
        className
      )}
      aria-hidden="true"
    >
      <svg
        className="absolute w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="skewed-lines"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="40"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#skewed-lines)" />
      </svg>
    </div>
  );
}
