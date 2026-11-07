---
title: Administration CLI
description: Inspect, back up, export, import, check, and rebuild Grafeno data.
---

# Administration CLI

One program, `grafeno`, is the server, the console and every administration command. `grafeno --help` lists them, and `grafeno <command> --help` explains one.

## The installation

| Command | Purpose |
| --- | --- |
| `grafeno setup` | Create an instance: data folder, settings, first administrator, service ([Instances](./instances.md)). |
| `grafeno instances` | List instances; `drop` one, or `rollback` one after an upgrade. |
| `grafeno doctor` | Check settings, permissions, the database, disk space, the port and the service. |
| `grafeno config token` | Print the server's token (`config path` prints where the settings are). |
| `grafeno serve --config F` | Run the server in the foreground (the services do this). |
| `grafeno restore BACKUP NEW` | Recover a backup into a new database file ([Backups](./backups.md)). |

## Access

| Command | Purpose |
| --- | --- |
| `grafeno users list \| create \| password \| disable \| delete` | Accounts ([Users, roles and permissions](../guides/access.md)). |
| `grafeno keys list \| create \| revoke` | API keys for programs and agents. |
| `grafeno roles`, `grafeno grants` | Roles and their privileges. |

These take `--config F` to work through a running server, or `--db F` to open a file directly.

## The data

The commands below inspect and repair the data. Commands that use `--db` open the file directly; stop any server or MCP process that owns it first.

| Command | Purpose |
| --- | --- |
| `grafeno namespaces --db F` | List namespaces and their node and edge counts. |
| `grafeno stats --db F [-n NS]` | Print statistics as JSON. |
| `grafeno check --db F [-n NS]` | Verify checksums, records, indexes, and counters. |
| `grafeno check --db F --recall 100` | Also estimate vector-search recall@10. |
| `grafeno compact --db F -n NS` | Rebuild a namespace's vector graph. |
| `grafeno rebuild --db F -n NS` | Rebuild indexes and counters from records. |
| `grafeno extract --db F -n NS` | Link mentions in new and changed text. |
| `grafeno export --db F -o data.jsonl` | Export JSON Lines. |
| `grafeno import --db F data.jsonl` | Import an export transactionally. |

Use `--all` instead of `-n NS` where supported. CSV and GraphML are available with `--format csv` or `--format graphml`; those formats target one namespace.

## Consistent backup

`backup` creates a new database file and refuses to overwrite an existing one.

```bash
grafeno backup snapshot.redb --db grafeno.redb
```

To back up a running server without stopping it, target its URL or configuration instead of opening its database file. The server keeps serving while it produces the consistent copy.

## A safe maintenance sequence

1. Create a backup.
2. Run `check` and preserve its output.
3. Use `rebuild` only when the report identifies inconsistent indexes or counters.
4. Use `compact` when vector recall or reachability is the problem.
5. Run `check` again.

`rebuild` and `compact` repair derived structures; they are not substitutes for a backup.
