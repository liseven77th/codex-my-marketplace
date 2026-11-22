#!/usr/bin/env node
// Cross-platform Remotion renderer. Use this from PowerShell or a POSIX shell.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(name);
const mode = has('--final') ? 'final' : 'draft';
const project = resolve(arg('--project', process.cwd()));
const demo = join(project, 'demo');
const studio = join(demo, 'studio');
const timeline = join(demo, 'timeline.json');
const output = resolve(arg('--out', join(demo, 'out', mode === 'final' ? 'demo.mp4' : 'demo-draft.mp4')));
const codec = arg('--codec', 'h264');
const composition = arg('--composition', 'Demo');
const concurrency = Number(arg('--concurrency', String(Math.max(1, cpus().length - 1))));
const here = dirname(fileURLToPath(import.meta.url));

function run(bin, argv, options = {}) {
  const result = spawnSync(bin, argv, {
    encoding: 'utf8', stdio: 'inherit', windowsHide: true,
    shell: process.platform === 'win32', ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(bin + ' exited with code ' + result.status);
}
if (!existsSync(timeline)) throw new Error('No ' + timeline + '. Run scripts/reconcile.mjs first.');
if (!existsSync(studio)) throw new Error('No Remotion project at ' + studio + '. Run the init script first.');
run(process.execPath, [join(here, 'validate-timeline.mjs'), timeline]);
mkdirSync(dirname(output), { recursive: true });
if (!existsSync(join(studio, 'node_modules'))) {
  console.log('demo-video: installing Remotion dependencies (first render only)…');
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--silent'], { cwd: studio });
}
const common = [composition, output, '--public-dir=..', '--concurrency=' + concurrency, '--log=info', '--enforce-audio-track'];
let renderArgs;
if (mode === 'draft') {
  renderArgs = [...common, '--scale=0.6', '--crf=28', '--codec=h264', '--audio-codec=aac'];
  console.log('demo-video: DRAFT render -> ' + output);
} else if (codec === 'prores') {
  renderArgs = [...common, '--codec=prores', '--prores-profile=hq'];
  console.log('demo-video: FINAL ProRes render -> ' + output);
} else {
  renderArgs = [...common, '--crf=18', '--codec=h264', '--audio-codec=aac', '--audio-bitrate=320k'];
  console.log('demo-video: FINAL render -> ' + output);
}
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
run(npx, ['remotion', 'render', 'src/index.ts', ...renderArgs], { cwd: studio });
try {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', output], {
    encoding: 'utf8', windowsHide: true,
  });
  if (result.status === 0) console.log('demo-video: rendered ' + output + ' — ' + result.stdout.trim() + 's');
} catch {}
if (mode === 'draft') console.log('Next: extract review frames and watch the draft before the final render.');
