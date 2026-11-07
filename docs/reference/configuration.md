---
title: Configuration
description: Every setting of grafeno.toml, what it does, and its default.
sidebar_position: 2
---

# Configuration

The engine reads its settings from `grafeno.toml`: the service does, and so do `grafeno serve --config` and `grafeno shell --config`. Restart the service after changing it. Where it is:

| System | File |
| --- | --- |
| Linux (packages) | `/etc/grafeno/grafeno.toml` (other instances: `/etc/grafeno/<name>.toml`) |
| Windows (installer) | `C:\ProgramData\Grafeno\grafeno.toml` |
| Anywhere | `grafeno config path` prints it |

`grafeno config init` writes a new one with a fresh token; `grafeno config token` prints the token. Flags and environment variables (`GRAFENO_DB`, `GRAFENO_ADDR`, `GRAFENO_TOKEN`) override the file. Every setting is optional: what is missing takes the default shown.

## The essentials

```toml
db = "/var/lib/grafeno/grafeno.redb"   # the database file
addr = "127.0.0.1:7810"                # where the API listens; "0.0.0.0:7810": every interface
token = "…"                            # the owner's secret; every /v1 request needs it, a key or a session
cors_origins = []                      # web pages allowed to call the API from a browser ("*": any)
durability = "immediate"               # or "eventual": faster writes, a crash loses at most 0.5 s
max_requests = 512                     # served at once; more get 503 with Retry-After
copy_before_upgrade = true             # copy the database before a new version changes its format
```

:::warning Before opening the port
Listen beyond `127.0.0.1` only with a token (or accounts) and behind TLS, for example a reverse proxy such as Caddy or nginx. The engine speaks plain HTTP.
:::

## `[query]`: limits for each query

```toml
[query]
timeout_secs = 30
max_reads = 50000000        # nodes, edges and index entries a query may read
max_rows = 1000000          # rows held at once
max_memory_mb = 512         # one value a query builds, or the rows it holds
max_cost = 0                # refuse queries whose estimated cost is above this (0: off)
scan_threads = 0            # threads large scans share (0: one per CPU; 1: none)
```

A query past a limit stops with an error naming it; `0` turns a limit off.

## `[memory]`: caches, in MiB

```toml
[memory]
cache_mb = 256              # pages of the database file
projection_cache_mb = 256   # graphs kept for graph algorithms
vector_cache_mb = 128       # vectors decoded while inserting embeddings
```

These caches are most of the memory Grafeno keeps; everything else is per request and bounded by `[query]`. With 10 million edges the engine stays near 300 MiB with the defaults. On a 512 MiB machine, `cache_mb = 128` and `projection_cache_mb = 64`.

## `[writer]`: the group commit

```toml
[writer]
max_batch = 512             # writes committed together at most
queue = 4096                # writes that may wait; more get 503
flush_ms = 500              # with eventual durability, how often commits reach the disk
import_chunk = 2000         # records per transaction of a bulk import
```

Concurrent writes are committed together, each still all-or-nothing on its own: about 11,000 writes a second on an SSD with immediate durability.

## `[auth]`: accounts and sign-in

```toml
[auth]
session_minutes = 15        # an access token's life (sessions renew it)
refresh_days = 30           # a session's life
lockout_attempts = 5        # failed sign-ins that lock an account for a while
address_attempts = 20       # failed sign-ins that refuse an address for a while
lockout_minutes = 15
```

## `[changes]` and `[audit]`: what is kept

```toml
[changes]                   # the change log that streams and webhooks follow
enabled = true
max_entries = 1000000       # per namespace; 0 for no limit
max_age_days = 7            # 0 for no limit

[audit]                     # the security log
max_entries = 10000000
max_age_days = 365
```

## `[background]`: work that follows the changes

```toml
[background]
extract = ["notes"]             # link what new and changed texts mention, in these namespaces
communities = ["notes"]         # keep community summaries fresh
communities_every_secs = 300
communities_min_changes = 50
```

## `[cluster]`: membership of a cluster

```toml
[cluster]
id = 1
addr = "10.0.0.1:7811"          # where this member listens for the others
secret = "…"                    # the same on every member
voters = [1, 2, 3]              # the first members; [] on a member that joins later
peers = [
  { id = 1, addr = "10.0.0.1:7811", api = "10.0.0.1:7810" },
  { id = 2, addr = "10.0.0.2:7811", api = "10.0.0.2:7810" },
  { id = 3, addr = "10.0.0.3:7811", api = "10.0.0.3:7810" },
]
```

See [A cluster](../operations/cluster.md).

## Seeing what a server runs with

A superuser can ask a running server for its settings, without the token or the cluster secret:

```bash
curl http://127.0.0.1:7810/v1/settings -H "Authorization: Bearer $TOKEN"
```
