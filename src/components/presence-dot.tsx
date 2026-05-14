import { cn } from "@/lib/utils";

/** Small status badge for the corner of an avatar. */
export function PresenceDot({
  online,
  className,
}: {
  online: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={online ? "Online" : "Offline"}
      className={cn(
        "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
        online ? "bg-green-400" : "bg-gray-500",
        className
      )}
    />
  );
}
