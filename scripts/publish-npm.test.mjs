import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'test-results', 'publish-script');

mkdirSync(output, { recursive: true });

function fixture({ user = 'cyann', fail = '', version = '0.1.0', moveHead = false } = {}) {
  const directory = mkdtempSync(join(output, 'case-'));
  const scripts = join(directory, 'scripts');
  const log = join(directory, 'npm-calls.jsonl');
  const npm = join(directory, 'fake-npm.cjs');
  const manifest = { name: '@cyann/dash-lab', version, publishConfig: { registry: 'https://registry.npmjs.org/', access: 'public' } };

  mkdirSync(scripts);
  copyFileSync(join(root, 'scripts', 'publish-npm.mjs'), join(scripts, 'publish-npm.mjs'));
  writeFileSync(join(directory, 'package.json'), JSON.stringify(manifest));
  writeFileSync(join(directory, '.gitignore'), 'npm-calls.jsonl\ntag-at-publish.txt\ntest-results/\n');
  writeFileSync(
    npm,
    `
const {appendFileSync,readFileSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');
const args=process.argv.slice(2);
appendFileSync('npm-calls.jsonl',JSON.stringify(args)+'\\n');
if(args[0]==='run' && args[1]===process.env.TEST_FAIL) process.exit(1);
if(args[0]==='run' && args[1]==='check' && process.env.TEST_MOVE_HEAD==='yes') spawnSync('git',['commit','--allow-empty','--message','Concurrent commit']);
if(args[0]==='whoami') console.log(process.env.TEST_USER);
if(args[0]==='publish') {
  writeFileSync('tag-at-publish.txt',spawnSync('git',['tag','--list'],{encoding:'utf8'}).stdout);
  if(process.env.TEST_FAIL==='publish') process.exit(1);
}
if(args[0]==='pack') {
  const pkg=JSON.parse(readFileSync('package.json','utf8'));
  const filename='cyann-dash-lab-'+pkg.version+'.tgz';
  writeFileSync(join(args[args.indexOf('--pack-destination')+1],filename),'fixture');
  console.log(JSON.stringify([{name:pkg.name,version:pkg.version,filename}]));
}
if(args[0]==='publish' && !args.includes('--dry-run') && process.env.TEST_ALLOW_PUBLISH!=='yes') process.exit(99);
`,
  );

  for (const args of [
    ['init', '--quiet'],
    ['config', 'user.name', 'Test'],
    ['config', 'user.email', 'test@example.invalid'],
    ['add', '.'],
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'fixture'],
  ]) {
    const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8', windowsHide: true });

    assert.equal(result.status, 0, result.stderr);
  }

  return {
    directory,
    git(...args) {
      const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8', windowsHide: true });

      assert.equal(result.status, 0, result.stderr);

      return result.stdout.trim();
    },
    run(args, allowPublish = false) {
      return spawnSync(process.execPath, [join(scripts, 'publish-npm.mjs'), ...args], {
        cwd: directory,
        encoding: 'utf8',
        windowsHide: true,
        env: {
          ...process.env,
          npm_execpath: npm,
          TEST_USER: user,
          TEST_FAIL: fail,
          TEST_ALLOW_PUBLISH: allowPublish ? 'yes' : 'no',
          TEST_MOVE_HEAD: moveHead ? 'yes' : 'no',
        },
      });
    },
    calls() {
      try {
        return readFileSync(log, 'utf8')
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line));
      } catch (error) {
        if (error.code === 'ENOENT') return [];

        throw error;
      }
    },
  };
}

test('dry run checks an uncommitted checkout, skips authentication and only simulates publishing its tarball', () => {
  const project = fixture();

  writeFileSync(join(project.directory, 'uncommitted.txt'), 'work');

  const result = project.run(['--dry-run']);
  const calls = project.calls();
  const publish = calls.at(-1);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    calls.some(([command]) => command === 'whoami'),
    false,
  );
  assert.deepEqual(
    calls.filter(([command]) => command === 'run').map(([, name]) => name),
    ['check', 'lint', 'format:check', 'test', 'test:publish', 'test:package'],
  );
  assert.equal(publish[0], 'publish');
  assert.equal(publish.includes('--dry-run'), true);
  assert.equal(publish.includes('https://registry.npmjs.org/'), true);
  assert.equal(publish.includes('public'), true);
  assert.match(publish[1], /cyann-dash-lab-0\.1\.0\.tgz$/);
  assert.equal(project.git('tag', '--list'), '');
});

test('a failed validation prevents packing and publishing', () => {
  const project = fixture({ fail: 'test' });
  const result = project.run(['--dry-run']);

  assert.notEqual(result.status, 0);
  assert.equal(
    project.calls().some(([command]) => command === 'pack' || command === 'publish'),
    false,
  );
});

test('real publication refuses a dirty checkout before contacting npm', () => {
  const project = fixture();

  writeFileSync(join(project.directory, 'uncommitted.txt'), 'work');

  const result = project.run([]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Commit or stash/);
  assert.deepEqual(project.calls(), []);
});

test('real publication refuses a different npm account', () => {
  const project = fixture({ user: 'someone-else' });
  const result = project.run([]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Log in as cyann/);
  assert.deepEqual(
    project.calls().map(([command]) => command),
    ['whoami'],
  );
});

test('the release path publishes exactly the packed file after validation and account verification', () => {
  const project = fixture();
  const result = project.run(['--tag', 'stable'], true);
  const calls = project.calls();
  const publish = calls.at(-1);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls[0][0], 'whoami');
  assert.equal(calls.at(-2)[0], 'pack');
  assert.equal(publish[0], 'publish');
  assert.equal(publish.includes('--dry-run'), false);
  assert.equal(publish[publish.indexOf('--tag') + 1], 'stable');
  assert.match(publish[1], /test-results[/\\]npm-publish[/\\]release-[^/\\]+[/\\]cyann-dash-lab-0\.1\.0\.tgz$/);
  assert.equal(readFileSync(join(project.directory, 'tag-at-publish.txt'), 'utf8').trim(), '');
  assert.equal(project.git('rev-parse', 'version-0.1.0^{commit}'), project.git('rev-parse', 'HEAD'));
  assert.equal(project.git('cat-file', '-t', 'refs/tags/version-0.1.0'), 'tag');
  assert.equal(project.git('tag', '--list'), 'version-0.1.0');
});

test('failed npm publication leaves no Git release tag', () => {
  const project = fixture({ fail: 'publish' });
  const result = project.run([], true);

  assert.notEqual(result.status, 0);
  assert.equal(project.git('tag', '--list'), '');
});

test('an existing tag on the release commit is reused unchanged', () => {
  const project = fixture();

  project.git('tag', '--annotate', 'version-0.1.0', '--message', 'Prepared release');

  const original = project.git('rev-parse', 'refs/tags/version-0.1.0');
  const result = project.run([], true);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(project.git('rev-parse', 'refs/tags/version-0.1.0'), original);
});

test('a tag on another commit blocks publication before contacting npm', () => {
  const project = fixture();

  project.git('tag', '--annotate', 'version-0.1.0', '--message', 'Older commit');
  project.git('commit', '--allow-empty', '--message', 'New release commit');

  const result = project.run([], true);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already points to another commit/);
  assert.deepEqual(project.calls(), []);
});

test('a Git tag failure clearly reports that npm publication already succeeded', () => {
  const project = fixture();

  project.git('config', 'tag.gpgSign', 'true');
  project.git('config', 'gpg.program', 'missing-test-signing-program');

  const result = project.run([], true);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /npm publication succeeded, but Git tag version-0.1.0 could not be recorded/);
  assert.match(result.stderr, /do not republish/);
  assert.equal(project.calls().at(-1)[0], 'publish');
  assert.equal(project.git('tag', '--list'), '');
});

test('moving HEAD during validation prevents publication and release tagging', () => {
  const project = fixture({ moveHead: true });
  const result = project.run([], true);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HEAD changed during validation/);
  assert.equal(
    project.calls().some(([command]) => command === 'pack' || command === 'publish'),
    false,
  );
  assert.equal(project.git('tag', '--list'), '');
});

test('prereleases default to next and cannot overwrite latest', () => {
  const project = fixture({ version: '0.2.0-rc.1' });
  const result = project.run([], true);
  const publish = project.calls().at(-1);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(publish[publish.indexOf('--tag') + 1], 'next');
  assert.equal(project.git('rev-parse', 'version-0.2.0-rc.1^{commit}'), project.git('rev-parse', 'HEAD'));

  const invalid = fixture({ version: '0.2.0-rc.1' });

  assert.notEqual(invalid.run(['--dry-run', '--tag', 'latest']).status, 0);
  assert.deepEqual(invalid.calls(), []);
});

test('invalid options or a different package name cannot reach npm', () => {
  for (const args of [['--unknown'], ['--tag'], ['--tag', '--dry-run']]) {
    const project = fixture();

    assert.notEqual(project.run(args).status, 0);
    assert.deepEqual(project.calls(), []);
  }

  const project = fixture();

  writeFileSync(join(project.directory, 'package.json'), JSON.stringify({ name: 'other-package', version: '0.1.0' }));

  assert.notEqual(project.run(['--dry-run']).status, 0);
  assert.deepEqual(project.calls(), []);
});
