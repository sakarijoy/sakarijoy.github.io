import { spawn } from 'node:child_process';
import { projectRoot, prepareContent, checkContentOutput } from './private-content.mjs';

async function run(file) {
  const code = await new Promise((done, fail) => {
    const child = spawn(process.execPath, [file], { cwd: projectRoot, stdio: 'inherit' });
    child.once('error', fail); child.once('exit', code => done(code ?? 1));
  });
  if (code !== 0) throw new Error('网站生成失败。');
}
try {
  // Missing/unreadable content fails before cleaning the last successful local build.
  const result = await prepareContent();
  console.log('已导入 ' + result.published + ' 条已发布内容，草稿未导入。');
  await run('tools/clean.mjs');
  await run('node_modules/@11ty/eleventy/cmd.cjs');
  await checkContentOutput();
} catch (error) { console.error(error.message); process.exitCode = 1; }
