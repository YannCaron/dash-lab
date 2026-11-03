import { existsSync } from 'node:fs';

if (!process.env.CI && process.env.HUSKY !== '0' && process.env.NODE_ENV !== 'production' && existsSync('.git')) {
  let install;
  try {
    ({ default: install } = await import('husky'));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  if (install) {
    const error = install();
    if (error) throw new Error(error);
  }
}
