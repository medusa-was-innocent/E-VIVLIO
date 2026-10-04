import { coverUrl } from "@/lib/cover";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "size-11 rounded-md",
  sm: "size-12 rounded-md",
  md: "size-16 rounded-lg",
  lg: "size-44 rounded-xl",
  xl: "w-full max-w-80 aspect-square rounded-2xl",
  hero: "w-full aspect-square rounded-2xl",
  tile: "w-full aspect-square rounded-xl",
};

export function Cover({
  src,
  alt,
  className,
  size = "md",
}: {
  src: string;
  alt: string;
  className?: string;
  size?: keyof typeof sizes;
}) {
  const width = size === "xs" || size === "sm" ? 160 : size === "md" ? 320 : 800;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-surface-2 shadow-border",
        sizes[size],
        className,
      )}
    >
      {src ? (
        <img
          src={coverUrl(src, width)}
          alt={alt}
          className="cover-art size-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="grid size-full place-items-center bg-surface-2">
          <svg viewBox="0 0 64 64" className="size-3/5 text-fg/80" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <circle cx="32" cy="32" r="6" className="fill-now" />
          </svg>
        </div>
      )}
    </div>
  );
}
