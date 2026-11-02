import type { ReactNode } from 'react';

/** Properties of the reusable application workbench. */
export interface WorkbenchProps {
  /** Accessible name of this application. */
  title: string;
  /** Application content. */
  children?: ReactNode;
}

/** Hosts application content independently of the demo application. */
export function Workbench({ title, children }: WorkbenchProps) {
  return (
    <section className="dl-workbench" aria-label={title}>
      {children}
    </section>
  );
}
