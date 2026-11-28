---
title: Storage and migrations
description: What the database takes on disk, how to bring a file written by an earlier release up to the current formats, give space back, and go back.
sidebar_position: 5
---

# Storage and migrations

Since 0.6.0 the engine stores data in smaller and faster formats: values compressed with a dictionary per namespace, nodes and edges as typed binary records, full-text indexes with one entry per term and node, vector graphs that keep neighbors as small numbers, and indexes made automatically for a server's new namespaces. Together they store 21–47% less than 0.5.3, load up to 35% faster and read many records 10–24% faster, with every query answering the same.

A database written by an earlier release opens as it is: nothing is rewritten when it opens, and what it holds stays in the format it was written in. New writes and new indexes take the new formats. `grafeno storage` brings what is already stored up to date, and back.

## What a database takes

```bash
grafeno storage stats --config /etc/grafeno/grafeno.toml
grafeno storage status --config /etc/grafeno/grafeno.toml
```

`stats` shows what each table takes, and the free and fragmented space (`--namespaces` per namespace). `status` lists the work pending: space a compaction would give back, namespaces without dictionaries or without an indexing policy, and the migrations recorded. Over HTTP, owners have `GET /v1/storage`.

## Bring a file up to date

Stop the server that uses the file (or see [On a running server](#on-a-running-server)), and keep room for twice the file: the migration copies it first, as `<file>.before-<id>.redb`. Then look at the plan, which changes nothing:

```bash
grafeno storage plan --config /etc/grafeno/grafeno.toml \
  --encoding compressed --reindex-existing --fulltext postings \
  --vector-links numbers --verify --compact
```

and apply it:

```bash
grafeno storage apply --config /etc/grafeno/grafeno.toml \
  --encoding compressed --reindex-existing --fulltext postings \
  --vector-links numbers --verify --compact
```

| Option | What it does |
| --- | --- |
| `--encoding compressed` | Trains dictionaries and rewrites records, texts and logs compressed (`json` goes back) |
| `--reindex-existing` | Rebuilds every index; full-text ones in the format of `--fulltext` |
| `--fulltext postings\|entries` | The format of full-text indexes |
| `--vector-links numbers\|ids` | Compacts every vector space into this format |
| `--indexing automatic\|hybrid\|manual` | Gives the namespaces this [indexing policy](../gq/namespaces.md#indexing-policy) and builds the indexes it wants for their data |
| `-n <namespace>` | Only these namespaces (all by default) |
| `--verify` | Checks every namespace at the end against a digest of its records taken before |
| `--compact` | Packs the file afterwards |

The migration runs in batches, each committed with its checkpoint. If it stops, the file is valid and partly migrated, and `grafeno storage resume --config …` runs it to its end. Running `apply` again with the same options changes nothing; `grafeno storage verify` checks the namespaces at any time. On 100,000 catalogue entities (1 GiB) a full migration with compaction took about a minute.

The engine's repository has scripts that do all of this for a service, stopping and starting it around the migration: `packaging/scripts/storage-upgrade.sh` for a systemd service, `storage-upgrade.ps1` for the Windows service, and `storage-upgrade-container.sh` for a container or a Compose service.

### In a container

The image runs any `grafeno` command, so a stopped container's volume migrates with the same image:

```bash
docker stop grafeno
docker run --rm --volumes-from grafeno ghcr.io/grafenodb/grafeno:0.6.0 \
  storage apply --config /data/grafeno.toml --encoding compressed \
  --reindex-existing --fulltext postings --vector-links numbers --verify --compact
docker start grafeno
```

### On a running server

Owners can migrate without stopping the server: `POST /v1/storage/migrations` with `{"options": {...}, "dry_run": true}` plans, and without `dry_run` runs it batch by batch between other writes; `GET /v1/storage/migrations` lists them.

## Give space back

Deletes leave free pages in the file. `grafeno vacuum --db F` gives them back with the server stopped (`--maximum` also packs partly filled pages). A running server compacts itself without stopping: `POST /v1/storage/compact` (owners), or on a schedule:

```toml
[maintenance]
compact = "window"
window = "02:00-04:00"   # UTC
```

Requests that come during a pass wait for it, a fraction of a second: on a 272 MiB file with three quarters deleted, a compaction took 0.4 s and left 57 MiB.

## Going back

A file that holds a new format is refused by 0.5.x, with a message (never misread). To open it with an earlier release again, leave each format with its setting and a migration:

| To leave | Run |
| --- | --- |
| Compressed records | `[storage] compression = "off"`, then `grafeno storage apply --encoding json --verify` |
| Full-text postings | `[storage] fulltext = "entries"`, then `grafeno storage apply --fulltext entries --reindex-existing --verify` |
| Vector links by number | `[storage] vector_links = "ids"`, then `grafeno storage apply --vector-links ids --verify` |

Restoring the copy that `apply` made also goes back, losing what was written after it.

## In a cluster

A member that falls behind receives a snapshot of a peer's file, which an earlier release refuses once it holds a new format. Upgrade every member to 0.6.0 first with the new formats off:

```toml
[storage]
compression = "off"
fulltext = "entries"
vector_links = "ids"
```

Once every member runs it, remove those lines and restart the members one at a time; then migrate one member at a time, with its server stopped, waiting until `grafeno cluster status` shows it caught up before the next.
