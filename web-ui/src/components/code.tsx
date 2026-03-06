import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Code({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn("font-mono text-xs bg-muted px-1 rounded", className)}
      {...props}
    />
  );
}
