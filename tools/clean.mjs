import { lstat, realpath, rm } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const workspace = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const target = resolve(workspace, '_site');
if (target !== workspace + sep + '_site') throw new Error('Unexpected output directory');
const info = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
if (info?.isSymbolicLink()) throw new Error('Refusing to clean a symbolic link');
if (info) {
  const resolvedTarget = await realpath(target);
  if (resolvedTarget !== target) throw new Error('Unexpected resolved output directory');
  await rm(target, { recursive: true });
}
