import clsx from "clsx";

export function LiveDot({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-block shrink-0 rounded-full",
        className ?? "h-2 w-2",
        active ? "live-dot" : "bg-slate-500/70",
      )}
    />
  );
}
