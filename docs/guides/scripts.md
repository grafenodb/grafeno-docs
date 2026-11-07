---
title: Run scripts
description: Execute GQ files and shell meta-commands interactively or in automation.
---

# Run scripts

`grafeno shell` accepts interactive input, one command, a file, or standard input. It returns a non-zero exit code when a statement fails, so it can be used in CI and application scripts.

## Execute a command

Against a running server:

```bash
grafeno shell --url http://127.0.0.1:7810 -n demo \
  -c "MATCH (n) RETURN count(n);"
```

Use `--json` for machine-readable results:

```bash
grafeno shell --url http://127.0.0.1:7810 -n demo --json \
  -c "MATCH (n:Person) RETURN n.@id, n.name;"
```

## Execute a file

Create `people.gq`:

```text
CREATE (:Person {name: 'Ana'});
CREATE (:Person {name: 'Luis'});
MATCH (p:Person) RETURN p.name ORDER BY p.name;
```

Then run it:

```bash
grafeno shell --url http://127.0.0.1:7810 -n demo -f people.gq
```

Pass `-f -` to read standard input. Inside an interactive session or another script, `\i FILE` includes a file.

## Meta-commands

Meta-commands occupy their own line and do not end in `;`.

| Command | Purpose |
| --- | --- |
| `\?` | Show shell help. |
| `\ns` | List namespaces. |
| `\ns create NAME` | Create an empty namespace. |
| `\ns drop NAME --yes` | Delete a namespace and its data. |
| `\use NAME` | Switch namespace. |
| `\stats`, `\check`, `\rebuild` | Inspect or repair the current namespace. |
| `\search TEXT`, `\recall TEXT`, `\context TEXT` | Try retrieval. |
| `\export FILE`, `\import FILE` | Move JSON Lines data. |
| `\format table|json` | Select output format. |
| `\timing on|off` | Show statement duration. |
| `\i FILE` | Run another script. |
| `\q` | Exit. |

## File or server

`--db data.redb` opens a file directly. `--url` connects to a running engine. Prefer `--url` for operational scripts because the server retains ownership of its database and can continue serving other clients.

For credentials, use `GRAFENO_TOKEN` rather than placing a token in shell history. A cluster URL may contain comma-separated members; the shell tries another member if one is unavailable.
