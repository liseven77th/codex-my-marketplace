#!/usr/bin/env node
// Cross-platform clip normalisation for Windows, macOS and Linux.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const input = args[0];
let output = args[1] && !args[1].startsWith('--') ? args[1] : null;
const value = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const fps = Number(value('fps', '30'));
const crf = Number(value('crf', '18'));
if (!input || !existsSync(input)) {
  console.error('usage: node transcode-clip.mjs <input> [output.mp4] --fps N --crf N');
  process.exit(1);
}
if (!output) output = input.replace(/\.[^.]+$/, '') + '.mp4';
const source = resolve(input);
const target = resolve(output);
if (source.toLowerCase() === target.toLowerCase()) {
  console.error('demo-video: input and output are the same file; keep raw takes separate.');
  process.exit(1);
}
if (!Number.isFinite(fps) || fps <= 0 || !Number.isFinite(crf) || crf < 0 || crf > 51) {
  console.error('demo-video: fps must be positive and crf must be between 0 and 51.');
  process.exit(1);
}
const size = statSync(source).size;
if (size < 4096) {
  console.error('demo-video: ' + input + ' is only ' + size + ' bytes — the recording failed.');
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
function run(bin, argv) {
  const result = spawnSync(bin, argv, { encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || (bin + ' exited with ' + result.status)).trim());
  return result.stdout || '';
}
const temporary = target.replace(/\.mp4$/i, '') + '.part.mp4';
try {
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', source,
    '-r', String(fps), '-fps_mode', 'cfr',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-movflags', '+faststart', '-an', '-f', 'mp4', temporary,
  ]);
  if (existsSync(target)) unlinkSync(target);
  renameSync(temporary, target);
  const probe = JSON.parse(run('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', target,
  ]));
  const video = (probe.streams || []).find((s) => s.codec_type === 'video');
  const durationSeconds = Number(probe.format?.duration || video?.duration || 0);
  if (!(durationSeconds > 0) || !video?.width || !video?.height) throw new Error('ffprobe returned no valid video duration or dimensions.');
  const file = basename(target);
  const sidecar = {
    id: file.replace(/\.[^.]+$/, ''),
    source: basename(source),
    file: 'capture/' + file,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    width: video.width,
    height: video.height,
    fps,
    transcodedAt: new Date().toISOString(),
  };
  writeFileSync(target.replace(/\.mp4$/i, '.json'), JSON.stringify(sidecar, null, 2) + '\n', 'utf8');
  console.log('demo-video: ' + basename(source) + ' -> ' + file + ' (' + sidecar.durationSeconds + 's, ' + video.width + 'x' + video.height + ' @ ' + fps + 'fps)');
} catch (error) {
  if (existsSync(temporary)) unlinkSync(temporary);
  console.error('demo-video: transcode failed: ' + error.message);
  process.exit(1);
}
