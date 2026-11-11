// Runs the examples of the documentation against a real engine and writes
// what it answers under each one.
//
// A fence written ```text run``` holds GQ statements (and console commands
// such as \stats). The tool runs every such fence of a page, in order, in a
// namespace of the page's own, and puts what the console printed in the
// ```text result``` fence that follows it (adding one when there is none).
// Results are never written by hand.
//
//   node tools/run-examples.mjs [files or folders…]
//
// With no arguments: every page in docs/ and in the Spanish translation.
// GRAFENO_BIN chooses the engine (default: the debug build of the engine
// repository next to this one). `--check` changes nothing and fails when a
// result differs from what the engine answers now.

import {spawn, spawnSync} from 'node:child_process';
import {
  closeSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exe = process.platform === 'win32' ? '.exe' : '';
const binary =
  process.env.GRAFENO_BIN ?? resolve(root, '..', 'grafeno', 'target', 'debug', `grafeno${exe}`);
const args = process.argv.slice(2);
const check = args.includes('--check');
const targets = args.filter((a) => a !== '--check');
const token = 'docs-examples';
const SEPARATOR = '@@@ next example @@@';

function pages(path) {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((name) => pages(join(path, name)));
  }
  return /\.mdx?$/.test(path) ? [path] : [];
}

const files = (
  targets.length
    ? targets
    : ['docs', 'i18n/es/docusaurus-plugin-content-docs/current']
)
  .map((t) => resolve(root, t))
  .flatMap(pages);

// Fences: their position, their info string and their body.
function fences(text) {
  const found = [];
  const pattern = /^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
  let match;
  while ((match = pattern.exec(text))) {
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      info: match[1].trim(),
      body: match[2],
    });
  }
  return found;
}

const isRun = (fence) => /^text\s+run\b/.test(fence.info);
const isResult = (fence) => /^text\s+result\b/.test(fence.info);

async function startServer() {
  const dir = mkdtempSync(join(tmpdir(), 'grafeno-docs-'));
  const config = join(dir, 'grafeno.toml');
  // Event subscriptions are off unless the settings turn them on.
  writeFileSync(config, ['[events]', 'enabled = true', ''].join('\n'));
  const server = spawn(
    binary,
    ['serve', '--config', config, '--memory', '--addr', '127.0.0.1:0', '--token', token],
    {stdio: ['ignore', 'ignore', 'pipe']},
  );
  const url = await new Promise((done, fail) => {
    let output = '';
    server.stderr.on('data', (chunk) => {
      output += chunk.toString();
      const found = output.match(/listening on (http:\/\/\S+)\r?\n/);
      if (found) done(found[1]);
    });
    server.once('exit', (code) => fail(new Error(`grafeno exited with ${code}: ${output}`)));
  });
  return {server, url, dir};
}

// Runs a page's fences in one console session; one output per fence.
function runPage(url, dir, ns, bodies) {
  const script = bodies
    .map((body) => `${body.trimEnd()}\nRETURN '${SEPARATOR}' AS s;\n`)
    .join('');
  const scriptFile = join(dir, `${ns}.gq`);
  const outputFile = join(dir, `${ns}.out`);
  writeFileSync(scriptFile, script);
  // One file for both streams, so errors stay where they happened.
  const out = openSync(outputFile, 'w');
  spawnSync(binary, ['shell', '--url', url, '--token', token, '-n', ns, '-f', scriptFile], {
    stdio: ['ignore', out, out],
  });
  closeSync(out);
  const text = readFileSync(outputFile, 'utf8').replace(/\r\n/g, '\n');
  const parts = text.split(
    new RegExp(`^ s\\n-+\\n ${SEPARATOR}\\n\\(1 row\\)\\n`, 'm'),
  );
  if (parts.length !== bodies.length + 1) {
    throw new Error(`${ns}: expected ${bodies.length} outputs, got ${parts.length - 1}:\n${text}`);
  }
  return parts
    .slice(0, -1)
    .map((part) =>
      part
        .replace(/^grafeno: some statements failed\n/m, '')
        // As the local console prints it: the transport is not the point.
        .replace(/ \(HTTP \d+\)$/gm, '')
        .trimEnd(),
    );
}

let changed = 0;
let differences = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const all = fences(text);
  const runs = all.filter(isRun);
  if (!runs.length) continue;
  // A fresh engine per page: what one page creates never shows in another.
  const {server, url, dir} = await startServer();
  let outputs;
  try {
    // Every page has its engine, so every page can use the same namespace.
    outputs = runPage(url, dir, 'demo', runs.map((f) => f.body));
  } finally {
    server.kill();
  }
  // Rebuild the page from the end, so earlier positions stay right.
  let next = text;
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    const after = all[all.indexOf(run) + 1];
    const between = after ? text.slice(run.end, after.start) : '';
    const spanish = /[\\/]i18n[\\/]es[\\/]/.test(file);
    const title = spanish ? 'Resultado' : 'Result';
    const block =
      '```text result title="' + title + '"\n' + (outputs[i] || '(no output)') + '\n```';
    if (after && isResult(after) && /^\s*$/.test(between)) {
      if (after.body.trimEnd() !== (outputs[i] || '(no output)')) differences++;
      next = next.slice(0, after.start) + block + next.slice(after.end);
    } else {
      differences++;
      next = next.slice(0, run.end) + '\n\n' + block + next.slice(run.end);
    }
    // The statement's own title, set the same way on every page.
    const header = '```text run title="' + (spanish ? 'Ejemplo' : 'Example') + '"';
    const current = next.slice(run.start, next.indexOf('\n', run.start));
    if (current !== header) {
      next = next.slice(0, run.start) + header + next.slice(run.start + current.length);
    }
  }
  if (next !== text) {
    changed++;
    if (check) {
      console.error(`differs: ${relative(root, file)}`);
    } else {
      writeFileSync(file, next);
      console.log(`updated: ${relative(root, file)}`);
    }
  }
}
console.log(`${files.length} pages read, ${changed} ${check ? 'differ' : 'updated'}`);
if (check && differences) process.exit(1);
