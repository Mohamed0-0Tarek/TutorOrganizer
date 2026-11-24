"use client";

import { createContext, useContext, type ReactNode } from "react";

const AiConfigContext = createContext(false);

export function AiConfigProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <AiConfigContext.Provider value={enabled}>
      {children}
    </AiConfigContext.Provider>
  );
}

export function useAiEnabled(): boolean {
  return useContext(AiConfigContext);
}
