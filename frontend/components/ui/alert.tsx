import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-red-200 bg-red-50/80 text-foreground dark:border-red-950 dark:bg-red-950/35 [&_[data-slot=alert-title]]:text-red-900 dark:[&_[data-slot=alert-title]]:text-red-100 [&_[data-slot=alert-description]]:text-red-950/85 dark:[&_[data-slot=alert-description]]:text-red-50/85 [&_svg]:text-red-600 dark:[&_svg]:text-red-400",
        error:
          "border-red-200 bg-red-50/80 text-foreground dark:border-red-950 dark:bg-red-950/35 [&_[data-slot=alert-title]]:text-red-900 dark:[&_[data-slot=alert-title]]:text-red-100 [&_[data-slot=alert-description]]:text-red-950/85 dark:[&_[data-slot=alert-description]]:text-red-50/85 [&_svg]:text-red-600 dark:[&_svg]:text-red-400",
        info:
          "border-blue-200 bg-blue-50/80 text-foreground dark:border-blue-900 dark:bg-blue-950/35 *:data-[slot=alert-description]:text-blue-950/85 dark:*:data-[slot=alert-description]:text-blue-50/85 *:[svg]:text-blue-600 dark:*:[svg]:text-blue-400",
        success:
          "border-emerald-200 bg-emerald-50/80 text-foreground dark:border-emerald-900 dark:bg-emerald-950/35 *:data-[slot=alert-description]:text-emerald-950/85 dark:*:data-[slot=alert-description]:text-emerald-50/85 *:[svg]:text-emerald-600 dark:*:[svg]:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
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
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
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
