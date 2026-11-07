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
| `docs/guides` | GQ scripts, memory for agents, users and roles, the HTTP API, MCP |
| `docs/clients` | The TypeScript client |
| `docs/operations` | The command line, instances and upgrades, backups, a cluster |
| `docs/reference` | GQ, configuration |
| `i18n/es` | The Spanish translation of every page and of the site's labels |

Every example and every result shown was run against the engine before it
was written down: keep it that way when adding pages.

## Run

```bash
npm install
npm start
```

The site is at `http://localhost:3000` (`npm start -- --locale es` for the
Spanish one). `npm run build` writes `build/` with both languages, and
fails on any broken link or anchor.

`url` in `docusaurus.config.ts` points at localhost until the site is
published.
