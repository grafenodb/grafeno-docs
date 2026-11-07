---
title: A cluster
description: Three engines that hold the same data, elect a leader and keep serving when one fails — tried on one machine first.
sidebar_position: 4
---

# A cluster

Three (or five) engines can hold the same data, kept in sync with Raft. They elect a **leader**, which orders the writes; the others follow. When the leader fails, the rest elect another within about a second and carry on. Reads are served by every member, and large reads are split across them.

Try it on one machine first, then spread it over three.

## Three members on one machine

Make a folder with three settings files. Each member has its own API port (`addr`), its own port for talking to the others (`[cluster] addr`) and its own database; the rest is the same everywhere.

`member-1.toml`:

```toml
db = "member-1.redb"
addr = "127.0.0.1:7811"
token = "change-me"

[cluster]
id = 1
addr = "127.0.0.1:7821"
secret = "one long secret, the same on every member"
voters = [1, 2, 3]
peers = [
  { id = 1, addr = "127.0.0.1:7821", api = "127.0.0.1:7811" },
  { id = 2, addr = "127.0.0.1:7822", api = "127.0.0.1:7812" },
  { id = 3, addr = "127.0.0.1:7823", api = "127.0.0.1:7813" },
]
```

`member-2.toml` and `member-3.toml` are the same with `2` and `3` in `db`, `addr`, `id` and `[cluster] addr` (`member-2.redb`, `127.0.0.1:7812`, `id = 2`, `127.0.0.1:7822`, and so on).

Start the three, each in its own terminal:

```bash
grafeno serve --config member-1.toml
grafeno serve --config member-2.toml
grafeno serve --config member-3.toml
```

Within a second or two they elect a leader. Ask any member:

```bash
grafeno cluster status --url http://127.0.0.1:7811 --token change-me
```

```json
{
  "applied": 1,
  "commit": 1,
  "id": 1,
  "leader": 3,
  "role": "follower",
  "…": "…"
}
```

## Write anywhere, read anywhere

Write through member 2 — a follower forwards the write to the leader — and read it from member 3:

```bash
grafeno shell --url http://127.0.0.1:7812 --token change-me -c '\ns create team'
grafeno shell --url http://127.0.0.1:7812 --token change-me -n team -c "CREATE (:Note {title: 'written on member 2'});"
grafeno shell --url http://127.0.0.1:7813 --token change-me -n team -c "MATCH (n:Note) RETURN n.title;"
```

```text
 n.title
---------------------
 written on member 2
(1 row)
```

Give clients every member, separated by commas, and they move to another one when a member fails:

```bash
grafeno shell --url http://127.0.0.1:7811,http://127.0.0.1:7812,http://127.0.0.1:7813 --token change-me -n team
```

Now stop the leader (Ctrl+C in its terminal) and keep writing through the console: after a short pause the remaining two elect a new leader and the writes go on. Start the stopped member again and it catches up by itself.

## On three machines

The same settings, with each machine's address instead of `127.0.0.1` (and the same ports on each, if you like: `10.0.0.1:7810` for the API and `10.0.0.1:7811` for members, and so on). On installed engines, put the `[cluster]` section in each one's `grafeno.toml` and restart the services. Open the members' port only between the members: traffic between them is authenticated by the secret but not encrypted, so keep them on a private network.

## What you can tune

| Want | Use |
| --- | --- |
| Read your own writes from any member | clients do it for you (`x-grafeno-after`); or send `x-grafeno-consistency: linearizable` |
| Retry a write safely | an `Idempotency-Key` header: the write runs once however many times it is sent |
| More write throughput | more Raft groups (`groups = [...]`), each with its own leader, and namespaces placed on them |
| Watch it | `grafeno cluster status`, the `grafeno_cluster_*` series in `/v1/metrics`, Grafeno Studio's **Cluster** view |
| Change members | `grafeno cluster voters 1 2 3 4` on the leader |

Losing a member, losing a majority, replacing a disk and upgrading a cluster have step-by-step runbooks in the engine's [cluster runbooks](https://github.com/grafenodb/grafeno/blob/main/docs/cluster-runbooks.md).
