"use client";

import type { ReactNode } from "react";

import { AskAriaProvider } from "./ask-aria-context";
import { AskAriaPanel } from "./ask-aria-panel";

export function AskAriaInvocation({ children }: { children: ReactNode }) {
  return (
    <AskAriaProvider>
      {children}
      <AskAriaPanel />
    </AskAriaProvider>
  );
}
