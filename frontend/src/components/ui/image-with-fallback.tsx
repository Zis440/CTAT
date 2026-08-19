
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackClassName,
  ...props
}: ImageWithFallbackProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className={cn("relative", className)}>
      {status === "loading" && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-md" />
      )}

      {status === "error" ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 h-full w-full bg-muted/50 text-muted-foreground rounded-md",
            fallbackClassName
          )}
        >
          <ImageOff className="h-8 w-8" />
          <span className="text-xs">Failed to load</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            status === "loading" ? "opacity-0" : "opacity-100",
            className
          )}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          {...props}
        />
      )}
    </div>
  );
}
