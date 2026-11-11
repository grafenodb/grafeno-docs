---
title: Backups and restore
description: Take consistent backups while the engine runs, restore them, check a file, and move data with exports.
sidebar_position: 3
---

# Backups and restore

## Take a backup

A backup is a consistent copy of the whole database — every namespace, the accounts, roles and keys — taken while the engine keeps serving:

```bash
sudo grafeno backup /backups/grafeno-2026-11-07.redb --config /etc/grafeno/grafeno.toml
```

The new file must not exist yet; Grafeno never overwrites. On Windows, in an administrator PowerShell, with `--config C:\ProgramData\Grafeno\grafeno.toml`. Over HTTP, `GET /v1/backup` returns the file (with the `backup` privilege), and Grafeno Studio has **Administration → Back up the database**.

Schedule it like any other job (a systemd timer, cron, Windows Task Scheduler) and keep copies somewhere else.

## Restore

`grafeno restore` turns a backup into a database file you can use. It checks every page of the backup, upgrades its format if it came from an older version, verifies every namespace, and only then writes the new file — the backup itself is only read:

```bash
grafeno restore /backups/grafeno-2026-11-07.redb /var/lib/grafeno/restored.redb
```

```text
Restored /backups/grafeno-2026-11-07.redb into /var/lib/grafeno/restored.redb (… bytes).
```

To put it in service: stop the engine, point `db` in the settings at the restored file (or move it where `db` points), make it the service's (`chown grafeno:grafeno` on Linux), and start the engine again. Grafeno Studio's start screen also has **Recover a backup…**, which does the same and opens the result.

## Check a file

A copy from a failing disk, an interrupted transfer, an old USB stick? Check it before trusting it, with nothing else using it:

```bash
grafeno check --db /backups/grafeno-2026-11-07.redb
```

It verifies every page against its checksum, then that the indexes and counters agree with the records, and exits with an error if anything is wrong.

## Exports: data you can read and move

An export is the other kind of copy: JSON Lines, one record per line, readable by any tool and portable between versions — but without accounts and keys.

From a running engine, use the console:

```bash
sudo grafeno shell --config /etc/grafeno/grafeno.toml --namespace demo -c '\export demo.jsonl'
```

```text
Wrote 2 records to demo.jsonl.
```

and `\import demo.jsonl` brings it back, into the same or another engine. On a database file with no engine using it, the same is a command of its own:

```bash
grafeno export --db memory.redb -n demo -o demo.jsonl
grafeno import --db other.redb demo.jsonl
```

One namespace can also go out as CSV (`--format csv`: `nodes.csv` and `edges.csv`, with typed headers such as `name:int` and `:LABEL`) or GraphML (`--format graphml`), and come in from them.

| | Backup | Export |
| --- | --- | --- |
| What | the whole database file | the records of one or more namespaces |
| Accounts, roles, keys | included | not included |
| Readable | no (a database file) | yes (JSON Lines, CSV, GraphML) |
| For | disaster recovery | moving data, other tools, review |
