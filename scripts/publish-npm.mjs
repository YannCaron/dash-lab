import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const registry = 'https://registry.npmjs.org/';
const options = process.argv.slice(2);
let dryRun = false;
let npmTag;

function run(command, args, capture = false) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', windowsHide: true });

  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command === process.execPath ? 'npm' : command} ${args.slice(command === process.execPath ? 1 : 0).join(' ')} failed.${capture ? '\n' + result.stderr : ''}`,
    );

  return result.stdout?.trim();
}

function assertClean() {
  if (run('git', ['status', '--porcelain'], true))
    throw new Error('Commit or stash pending changes before publishing. Use --dry-run to check uncommitted work.');
}

function hasReleaseTag(gitTag, commit) {
  if (!run('git', ['tag', '--list', gitTag], true)) return false;

  const target = run('git', ['rev-parse', `refs/tags/${gitTag}^{commit}`], true);

  if (target !== commit) throw new Error(`Git tag ${gitTag} already points to another commit. Choose a new version; existing tags are never overwritten.`);

  return true;
}

try {
  for (let index = 0; index < options.length; index++) {
    const option = options[index];

    if (option === '--dry-run') dryRun = true;
    else if (option === '--tag') npmTag = options[++index];
    else if (option === '--help') {
      console.log('Usage: npm run publish:npm -- [--dry-run] [--tag latest|next|custom]');
      process.exit(0);
    } else throw new Error(`Unknown option: ${option}`);

    if (option === '--tag' && (!npmTag || !/^[a-z][a-z0-9._-]*$/.test(npmTag))) throw new Error('--tag requires a lowercase npm distribution tag.');
  }

  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const npm = process.env.npm_execpath;

  if (!npm) throw new Error('Run this script with npm run publish:npm.');
  if (manifest.name !== '@cyann/dash-lab' || manifest.private || manifest.publishConfig?.registry !== registry || manifest.publishConfig.access !== 'public')
    throw new Error('Expected the public @cyann/dash-lab package on https://registry.npmjs.org/.');

  npmTag ??= manifest.version.includes('-') ? 'next' : 'latest';

  if (manifest.version.includes('-') && npmTag === 'latest') throw new Error('Use a prerelease tag such as --tag next for a prerelease version.');

  const gitTag = `v${manifest.version}`;
  const releaseCommit = dryRun ? undefined : run('git', ['rev-parse', 'HEAD'], true);

  if (!dryRun) {
    assertClean();
    run('git', ['check-ref-format', `refs/tags/${gitTag}`], true);
    run('git', ['var', 'GIT_COMMITTER_IDENT'], true);
    hasReleaseTag(gitTag, releaseCommit);

    const username = run(process.execPath, [npm, 'whoami', '--registry', registry], true);

    if (username !== 'cyann') throw new Error('Log in as cyann with npm login --registry=https://registry.npmjs.org/ before publishing.');
  }

  console.log(`${dryRun ? 'Checking' : 'Preparing'} ${manifest.name}@${manifest.version} (${npmTag})`);

  for (const check of ['check', 'lint', 'format:check', 'test', 'test:publish', 'test:package']) {
    run(process.execPath, [npm, 'run', check]);
  }

  if (!dryRun) {
    assertClean();

    if (run('git', ['rev-parse', 'HEAD'], true) !== releaseCommit)
      throw new Error('HEAD changed during validation. Restart publication from the intended release commit.');

    hasReleaseTag(gitTag, releaseCommit);
  }

  const releases = join(root, 'test-results', 'npm-publish');

  mkdirSync(releases, { recursive: true });

  const directory = mkdtempSync(join(releases, 'release-'));
  const [packed] = JSON.parse(run(process.execPath, [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', directory], true));

  if (packed.name !== manifest.name || packed.version !== manifest.version) throw new Error('Packed package identity does not match package.json.');

  const tarball = join(directory, packed.filename);
  const publish = [npm, 'publish', tarball, '--registry', registry, '--access', 'public', '--tag', npmTag];

  if (dryRun) publish.push('--dry-run');

  console.log(`Package: ${tarball}`);
  run(process.execPath, publish);

  if (dryRun) {
    console.log(`Dry run complete. Nothing was published. Git tag ${gitTag} was not created.`);
  } else {
    console.log(`Published ${manifest.name}@${manifest.version} with npm tag ${npmTag}.`);

    try {
      if (hasReleaseTag(gitTag, releaseCommit)) console.log(`Keeping existing Git tag ${gitTag} on ${releaseCommit}.`);
      else {
        run('git', ['tag', '--annotate', gitTag, releaseCommit, '--message', `${manifest.name}@${manifest.version}`]);
        console.log(`Created local Git tag ${gitTag} on ${releaseCommit}.`);
      }
    } catch (cause) {
      throw new Error(
        `npm publication succeeded, but Git tag ${gitTag} could not be recorded on ${releaseCommit}. Repair the local tag manually; do not republish this version.`,
        { cause },
      );
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
