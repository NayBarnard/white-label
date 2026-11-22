"use client";

import Image from "next/image";

type Props = {
  compact?: boolean;
  prominent?: boolean;
};

export function AnimatedLogo({ compact = false, prominent = false }: Props) {
  return (
    <Image
      src="/logo-still.png"
      alt="your firm"
      width={960}
      height={468}
      priority={compact}
      sizes={
        compact
          ? "(max-width: 640px) 112px, 128px"
          : prominent
            ? "(max-width: 640px) 100vw, 440px"
            : "192px"
      }
      className={`block aspect-[72/35] h-auto object-contain ${
        compact ? "w-28 sm:w-32" : prominent ? "w-full max-w-[440px]" : "w-48"
      }`}
    />
  );
}
