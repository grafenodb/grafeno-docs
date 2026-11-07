---
title: MCP for agents
description: Expose Grafeno memory and graph tools over the Model Context Protocol.
---

# MCP for agents

`grafeno mcp` speaks MCP over standard input and output. The client starts the process and exchanges JSON-RPC with it; logs go to standard error.

```bash
grafeno mcp --db agent.redb --namespace me
```

Every tool accepts an optional `namespace`. Without one it uses `--namespace`.

## Memory workflow

| Tool | Purpose |
| --- | --- |
| `remember` | Store a memory and optional links. |
| `recall` | Hybrid retrieval with match reasons. |
| `context` | Render relevant memories and facts within a token budget. |
| `relate` | Record a dated fact between nodes. |
| `update` | Change text, name, properties, labels, or importance. |
| `forget` | Invalidate, retract, or delete a fact; delete a node. |
| `get_node` | Read a node and its connecting facts. |
| `query` | Run read-only GQ, up to 200 rows. |

Maintenance tools include `find_matches`, `merge`, `undo_merge`, `extract`, `add_mentions`, `review`, `resolve_review`, `maintain`, `consolidate`, `overview`, `summarize_communities`, `set_summary`, and `changes`.

## Fence an agent

```bash
grafeno mcp --db agent.redb --namespace me \
  --allow me,shared-* --read-only
```

| Option | Effect |
| --- | --- |
| `--allow vault,team-*` | Limit the namespaces the agent may use. |
| `--read-only` | Offer only reading tools; recall does not record accesses. |
| `--as NAME` | Save `NAME` in `@recorded_by` for the agent's writes. |
| `--own-only` | With `--as`, only allow changes to records written by that actor. |

:::warning Database ownership
The MCP process opens its database file directly. It cannot share that file with `grafeno serve` or another MCP process. Use different files for separate agents unless the client integrates through the HTTP API.
:::
