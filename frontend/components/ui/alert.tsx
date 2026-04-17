import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-card text-card-foreground [&_svg]:text-muted-foreground",
        destructive:
          "border-red-900 bg-red-950/35 text-foreground [&_[data-slot=alert-title]]:text-red-100 [&_[data-slot=alert-description]]:text-red-50/85 [&_svg]:text-red-400",
        error:
          "border-red-900 bg-red-950/35 text-foreground [&_[data-slot=alert-title]]:text-red-100 [&_[data-slot=alert-description]]:text-red-50/85 [&_svg]:text-red-400",
        warning:
          "border-amber-800 bg-amber-950/35 text-foreground [&_[data-slot=alert-title]]:text-amber-100 [&_[data-slot=alert-description]]:text-amber-50/85 [&_svg]:text-amber-400",
        info:
          "border-blue-900 bg-blue-950/35 text-foreground [&_[data-slot=alert-title]]:text-blue-100 [&_[data-slot=alert-description]]:text-blue-50/85 [&_svg]:text-blue-400",
        success:
          "border-emerald-900 bg-emerald-950/35 text-foreground [&_[data-slot=alert-title]]:text-emerald-100 [&_[data-slot=alert-description]]:text-emerald-50/85 [&_svg]:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const variantIcons: Record<string, React.ReactElement> = {
  default:     <Info />,
  destructive: <AlertTriangle />,
  error:       <XCircle />,
  warning:     <AlertTriangle />,
  info:        <Info />,
  success:     <CheckCircle2 />,
}

function Alert({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const icon = variantIcons[variant ?? "default"]
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon}
      {children}
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-heading font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
