import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null
  src?: string | null
}

function getInitials(name: string = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, src, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700",
          className
        )}
        {...props}
      >
        {src ? (
          <img src={src} alt={name || "avatar"} className="h-full w-full rounded-full" />
        ) : (
          <span>{getInitials(name || "")}</span>
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar }
