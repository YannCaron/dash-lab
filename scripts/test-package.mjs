import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this check with npm run test:package.');
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const cache = run([npm, 'config', 'get', 'cache']).trim();
await mkdir(join(root, 'test-results'), { recursive: true });
const directory = await mkdtemp(join(root, 'test-results', 'package-'));
const [packed] = JSON.parse(run([npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', directory]));
assert.ok(packed.files.some((file) => file.path === 'LICENSE'));
assert.ok(packed.files.some((file) => file.path === 'dist/index.d.ts'));
assert.ok(!packed.files.some((file) => /^(src|demo|test-results|node_modules)\//.test(file.path) || /\.test\.[cm]?[jt]sx?$/.test(file.path)));
await writeFile(
  join(directory, 'package.json'),
  JSON.stringify(
    {
      name: 'dash-lab-consumer-check',
      private: true,
      type: 'module',
      dependencies: { 'dash-lab': `file:./${packed.filename}`, react: manifest.devDependencies.react, 'react-dom': manifest.devDependencies['react-dom'] },
      devDependencies: { '@types/react': manifest.devDependencies['@types/react'], '@types/react-dom': manifest.devDependencies['@types/react-dom'] },
    },
    null,
    2,
  ),
);
run([npm, 'install', '--offline', '--no-audit', '--no-fund', '--cache', cache], directory);
const consumer = `import { I18nProvider, Workbench, registerLocalPlugins, useI18n, useNotifications } from 'dash-lab';
import type { WorkbenchPlugin, WorkbenchPreferences, PluginAPI } from 'dash-lab';
function Panel() { const {t}=useI18n(); const {notify}=useNotifications(); return <button onClick={()=>notify({title:t('Hello')})}>{t('Hello')}</button>; }
const plugin: WorkbenchPlugin = {id:'consumer',activate(api:PluginAPI){api.registerPanel({id:'panel',title:'Panel',component:Panel});}};
const plugins=registerLocalPlugins({'./plugins/consumer/index.ts':{default:plugin}});
export const preferences: WorkbenchPreferences={theme:'dark',motion:'system',notifications:{toastsEnabled:true,toastDurationMs:5000}};
export const application=<I18nProvider initialLocale="fr"><Workbench title="Consumer" plugins={plugins} preferencesStorageKey={false}/></I18nProvider>;
`;
await writeFile(join(directory, 'consumer.tsx'), consumer);
run(
  [
    join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--ignoreConfig',
    '--noEmit',
    '--strict',
    '--exactOptionalPropertyTypes',
    '--skipLibCheck',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--jsx',
    'react-jsx',
    '--target',
    'ES2022',
    'consumer.tsx',
  ],
  directory,
);
await writeFile(
  join(directory, 'runtime.mjs'),
  `import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {I18nProvider,Workbench,PluginRegistry,decodeConfiguration} from 'dash-lab';
const plugins=new PluginRegistry();
plugins.registerPlugin({id:'consumer',activate(api){api.registerStatusItem({id:'status',component:()=> 'Consumer status'});}});
const html=renderToStaticMarkup(createElement(I18nProvider,{initialLocale:'fr',children:createElement(Workbench,{title:'Consumer',plugins,preferencesStorageKey:false,children:'Consumer content'})}));
assert.ok(html.includes('Consumer status'));
assert.ok(html.includes('Consumer content'));
assert.ok(html.includes('lang="fr"'));
assert.ok(html.includes('Ouvrir la palette de commandes'));
const css=await readFile(new URL(import.meta.resolve('dash-lab/style.css')),'utf8');
assert.ok(css.includes('.dl-panel-content'));
assert.ok(css.includes('--dl-accent'));
const configuration=decodeConfiguration(JSON.stringify({format:'dash-lab',version:1,workspace:null,preferences:{theme:'light',motion:'system',notifications:{toastsEnabled:true,toastDurationMs:5000}}}),[]);
assert.equal(configuration.preferences.theme,'light');
console.log('PASS packed ESM, strict NodeNext declarations, legacy configuration, providers, plugin status, French, and CSS export');
`,
);
process.stdout.write(run([join(directory, 'runtime.mjs')], directory));
console.log(`Consumer artifacts: ${dirname(join(directory, 'runtime.mjs'))}`);
