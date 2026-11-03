import { registerLocalPlugins } from '@cyann/dash-lab';
import type { WorkbenchPlugin } from '@cyann/dash-lab';

const modules = import.meta.glob<{ default: WorkbenchPlugin }>('./plugins/*/index.ts', { eager: true });

export const plugins = registerLocalPlugins(modules);

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
