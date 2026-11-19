"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";
import { ConnectionProvider } from "@/components/ConnectionContext";
import { SplashGate } from "@/components/SplashGate";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      <ConnectionProvider>
        <SplashGate />
        {children}
      </ConnectionProvider>
    </NextThemesProvider>
  );
}
