import { checkContentOutput } from './private-content.mjs';
try { console.log('OK: ' + await checkContentOutput() + ' published content pages; no private source files in deployment output.'); }
catch (error) { console.error(error.message); process.exitCode = 1; }
