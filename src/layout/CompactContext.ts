import { createContext, useContext } from 'react';

export const CompactContext = createContext(false);

/** Reads this workbench's density so application and plugin content can hide optional details. Defaults to false outside Workbench. */
export function useCompactMode(): boolean {
  return useContext(CompactContext);
}
