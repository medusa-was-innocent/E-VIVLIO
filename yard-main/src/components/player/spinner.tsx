import { cn } from "@/lib/utils";

export function LoadRing({
  progress,
  className,
}: {
  progress: number;
  className?: string;
}) {
  const p = Math.min(1, Math.max(0.08, progress || 0.08));
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-5 yard-spin", className)}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.4"
      />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={`${p * 40} 56`}
      />
    </svg>
  );
}
