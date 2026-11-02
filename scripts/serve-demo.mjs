import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import ts from 'typescript';
import { build, createServer, preview } from 'vite';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const watch = process.argv.includes('--watch');
const resources = [];
process.chdir(projectRoot);

async function close() {
  await Promise.allSettled(resources.map((resource) => resource.close()));
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void close();
  });
}

try {
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Type checking failed.');

  if (watch) {
    const host = ts.createWatchCompilerHost('tsconfig.lib.json', {}, ts.sys);
    resources.push(ts.createWatchProgram(host));

    const watcher = await build({ configFile: 'vite.lib.config.ts', build: { watch: {} } });
    resources.push(watcher);
    await new Promise((resolve, reject) => {
      watcher.on('event', (event) => {
        if (event.code === 'END') resolve();
        if (event.code === 'ERROR') reject(event.error);
      });
    });

    const server = await createServer({ configFile: 'vite.config.ts' });
    resources.push(server);
    await server.listen();
    server.printUrls();
  } else {
    const types = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.lib.json'], { stdio: 'inherit' });
    if (types.error) throw types.error;
    if (types.status !== 0) throw new Error('Declaration build failed.');

    await build({ configFile: 'vite.lib.config.ts' });
    await build({ configFile: 'vite.config.ts' });
    const server = await preview({ configFile: 'vite.config.ts' });
    resources.push({ close: () => new Promise((resolve, reject) => server.httpServer.close((error) => (error ? reject(error) : resolve()))) });
    server.printUrls();
  }
} catch (error) {
  console.error(error);
  await close();
  process.exitCode = 1;
}
