"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Music2 } from "lucide-react";
import clsx from "clsx";

export function Thumb({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  // Se guarda la URL que falló en vez de un booleano: al cambiar `src`
  // el estado se invalida solo, sin necesidad de un efecto de reseteo.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-white/[0.04]",
        className,
      )}
    >
      {failed ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-500/20">
          <Music2 className="h-1/3 w-1/3 max-h-8 max-w-8 text-white/40" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
