"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-primary shrink-0" />
        ),
        info: (
          <InfoIcon className="size-4 text-sky-500 shrink-0" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-500 shrink-0" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-destructive shrink-0" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-primary shrink-0" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--card)",
          "--success-text": "var(--card-foreground)",
          "--success-border": "var(--primary)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      richColors={false}
      {...props}
    />
  )
}

export { Toaster }
