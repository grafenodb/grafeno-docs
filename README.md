# grafeno-docs

The official documentation of Grafeno, written with
[Docusaurus](https://docusaurus.io). It sits apart from the engine
([grafenodb/grafeno](https://github.com/grafenodb/grafeno)) and the
interface ([grafenodb/grafeno-studio](https://github.com/grafenodb/grafeno-studio)).

It is written for someone new to Grafeno, to follow in order: install the
engine, build a first graph step by step, open it in Grafeno Studio, then
the concepts, the guides and the reference. English is the default
language; Spanish is the other locale, at `/es/`.

| Folder | What it holds |
| --- | --- |
| `docs/get-started` | Install Grafeno, your first graph, Grafeno Studio |
| `docs/concepts` | The data model, time, search and recall |
| `docs/gq` | The GQ tutorial: one page per feature, each statement with its result |
| `docs/vectors` | Embeddings, vector indexes, hybrid search, sizing |
| `docs/algorithms` | Every graph algorithm, with a worked example |
| `docs/guides` | GQ scripts, memory for agents, users and roles, the HTTP API, MCP |
| `docs/clients` | The TypeScript client |
| `docs/operations` | The command line, instances and upgrades, backups, a cluster |
| `docs/reference` | GQ, configuration |
| `i18n/es` | The Spanish translation of every page and of the site's labels |

Every example and every result shown was run against the engine before it
was written down: keep it that way when adding pages.

## Examples that run

A fence written ` ```text run ` holds GQ statements; `tools/run-examples.mjs`
runs every such fence of a page against a real engine (in memory, one
engine per page, so pages never see each other's data) and writes what the
console printed into the ` ```text result ` fence after it. Results are
never typed by hand:

```bash
node tools/run-examples.mjs                       # every page, both languages
node tools/run-examples.mjs docs/gq/match.md      # one page
node tools/run-examples.mjs --check               # change nothing; fail if a result differs
```

It uses the engine's debug build next to this repository
(`../grafeno/target/debug/grafeno`), or `GRAFENO_BIN`. Results that hold
ids, times or milliseconds change at each run.

## Run

```bash
npm install
npm start
```

The site is at `http://localhost:3000/docs/` (`npm start -- --locale es`
for the Spanish one). `npm run build` writes it into `build/docs/`, with
both languages, and fails on any broken link or anchor.

## Deploy

The site is published at [grafenodb.org/docs](https://grafenodb.org/docs/),
under the landing page at `grafenodb.org`, which is deployed apart.
`docusaurus.config.ts` sets `url: 'https://grafenodb.org'` and
`baseUrl: '/docs/'`, so every link and file carries `/docs/`.

On Cloudflare it is a Worker with static assets (`wrangler.jsonc`), which
answers only `grafenodb.org/docs` and what is under it; the rest of the
domain stays with the landing page. In the Cloudflare project:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | 20 or later (`NODE_VERSION=22` if needed) |

The build writes into `build/docs/` and the Worker serves `./build`, so a
request for `/docs/…` finds its file. Unknown paths get the site's
`404.html`. Images in raw HTML must go through `useBaseUrl` (see
`docs/intro.md`): a plain `/img/…` path would miss the `/docs/` base.
