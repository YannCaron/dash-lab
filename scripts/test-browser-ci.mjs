import { spawn } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { createServer, preview } from 'vite';

const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));
const development = process.argv.includes('--dev');
const port = development ? 5383 : 4383;
const server = development
  ? await createServer({ configFile, server: { host: '127.0.0.1', port, strictPort: true } })
  : await preview({ configFile, preview: { host: '127.0.0.1', port, strictPort: true } });
if (development) await server.listen();
let child;
try {
  child = spawn(process.execPath, [fileURLToPath(new URL('./test-browser.mjs', import.meta.url)), `http://127.0.0.1:${port}`], {
    stdio: 'inherit',
    windowsHide: true,
  });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} finally {
  if (child && child.exitCode === null) child.kill();
  if (development) await server.close();
  else await new Promise((resolve, reject) => server.httpServer.close((error) => (error ? reject(error) : resolve())));
}
