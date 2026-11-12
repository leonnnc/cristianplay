import clsx from "clsx";

export function Equalizer({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx("eq", active && "is-active", className)}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
