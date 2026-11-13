---
title: MCP for agents
description: Give an agent Grafeno as its long-term memory over the Model Context Protocol, from its first session to the next.
---

# MCP for agents

`grafeno mcp` speaks MCP over standard input and output. The agent's client starts the process and exchanges JSON-RPC with it; logs go to standard error. It needs no server: the process opens its database file itself.

```bash
grafeno mcp --db agent.redb --namespace me
```

An MCP client's configuration (where the file lives and what it is called depend on the client):

```json
{
  "mcpServers": {
    "grafeno": {
      "command": "grafeno",
      "args": ["mcp", "--db", "/path/to/agent.redb", "--namespace", "me"]
    }
  }
}
```

The server tells the agent how to use it when it connects: call `context` (or `recall`) before answering anything that may depend on what it knows, `remember` new facts and decisions, `relate` nodes, `resume` at the start of ongoing work and `checkpoint` before stopping. Every tool takes an optional `namespace`; without one it uses `--namespace`. Ids are the UUIDs the tools return.

## The tools

| To… | Tools |
| --- | --- |
| Store and connect | `remember` (a memory, a person, a decision, with links), `relate` (a dated fact between two nodes), `update`, `forget` (a fact ends, is taken back, or is deleted) |
| Find and read | `recall` (words, meaning and the graph, each result with why it matched), `context` (memories and facts as text within a token budget), `get_node`, `query` (read-only [GQ](../gq/index.md), 200 rows at most), `overview` (community summaries for broad questions) |
| Store long texts | `ingest` (a document, a conversation or code, cut into chunks) |
| Pick work up again | `checkpoint` (where a task stands), `resume` (its latest checkpoint and what changed since) |
| Follow facts over time | `timeline` (how a node changed), `contradictions` (facts that clashed under a constraint), `changes` (what was written since a sequence number) |
| Keep memory in shape | `maintain` (health, likely duplicates, fading memories, groups to summarize), `feedback` (useful, obsolete, wrong), `merge`, `undo_merge`, `consolidate`, `find_matches` |
| Link what texts mention | `extract`, `add_mentions`, `review`, `resolve_review` |
| Summarize the graph | `summarize_communities`, `set_summary` |

The examples below come from one session with an engine: an agent that recorded Ana Torres working at Acme from 2021, then at Globex from 2024, under the constraint that a person has one employer at a time.

## Long texts: `ingest`

`remember` stores one memory. `ingest` takes a whole text and cuts it the way it is written, with no model:

| `kind` | Cut at |
| --- | --- |
| `document` (default) | headings (`#`, `##`, …), then blank lines, then sentence ends; each chunk starts with its heading path |
| `conversation` | turns: a line that starts with a speaker (`Ana: …`, `[10:30] user: …`) begins one |
| `code` | definitions that start a line (`fn`, `def`, `class`, `function`, `struct`, …), with the comments, attributes and decorators above them |

The whole becomes one node (`Document`, `Conversation` or `Code`) and each chunk a memory linked to it in order (`has_part`, `next`), with its lines and its part (heading path, speakers or definitions). Chunks hold up to `max_chars` (1,500). Then extraction links what the chunks mention. Ingesting the same `source` again replaces its chunks.

```json
{"name": "ingest", "arguments": {
  "content": "# Billing runbook\n\nWhat to do when invoices stop going out.\n\n## Restart\n\nRestart the consumer with `systemctl restart billing-consumer`.\n\n## Escalate\n\nCall Ana Torres at ana@example.com if it does not come back.",
  "source": "docs/billing-runbook.md"}}
```

```json
{
  "chunks": 3,
  "extraction": { "created": 1, "linked": 6, "mentions": 7, "texts_read": 4, "texts_unchanged": 0, "waiting_for_review": 2 },
  "id": "01a1d2a7-2add-76bd-8b76-9925d6d3a5a7",
  "replaced": 0,
  "chunk_ids": ["…"]
}
```

Recall then finds the chunk, and the graph brings its neighbor along:

```json
{"name": "recall", "arguments": {"query": "restart the consumer", "limit": 2}}
```

```json
{
  "results": [
    {
      "labels": ["Chunk"],
      "text": "Billing runbook > Restart\n\nRestart the consumer with `systemctl restart billing-consumer`.",
      "why": ["text match #1", "importance 0.50"],
      "…": "…"
    },
    {
      "labels": ["Chunk"],
      "text": "Billing runbook\n\nWhat to do when invoices stop going out.",
      "why": ["1 hop(s) from Chunk c8ed297d", "importance 0.50"],
      "…": "…"
    }
  ]
}
```

## Picking work up again: `checkpoint` and `resume`

Before it stops, the agent saves where the task stands. Checkpoints of one task (matched by its words, whatever the case or spacing) form a chain, and the agent that saves one is recorded (`agent`, or the name given with `--as`).

```json
{"name": "checkpoint", "arguments": {
  "task": "Move billing to events",
  "summary": "The producer publishes invoice events; the consumer is next.",
  "done": ["producer publishes invoice.created"],
  "next": ["consumer", "backfill old invoices"],
  "decisions": ["at-least-once delivery, idempotent consumer"],
  "files": ["src/producer.rs"],
  "about": "01a1d2a7-2ad7-72b4-93b1-dfd88852d1ec"}}
```

In the next session, this agent or another one resumes it, and learns what was written in memory since:

```json
{"name": "resume", "arguments": {"task": "move billing to events"}}
```

```json
{
  "found": true,
  "checkpoint": {
    "task": "Move billing to events",
    "summary": "The producer publishes invoice events; the consumer is next.",
    "done": ["producer publishes invoice.created"],
    "next": ["consumer", "backfill old invoices"],
    "decisions": ["at-least-once delivery, idempotent consumer"],
    "files": ["src/producer.rs"],
    "agent": "assistant",
    "…": "…"
  },
  "about": { "id": "01a1d2a7-2ad7-72b4-93b1-dfd88852d1ec", "name": "Billing" },
  "checkpoints_of_this_task": 1,
  "changed_since": [
    { "op": "created", "labels": ["Memory"], "what": "The invoices queue keeps messages for 7 days." }
  ],
  "more_changes": false
}
```

`resume` without a task returns the latest checkpoint of any; `about` or `agent` narrow it. When nothing matches, it lists the tasks that have checkpoints.

## Facts over time: `contradictions` and `timeline`

With a [constraint](../gq/constraints.md) such as one employer per person, recording that Ana works at Globex from 2024 ended the Acme fact on that date. `contradictions` lists such clashes, newest first, and what was done (the earlier fact ended, the new one refused, or both kept and flagged):

```json
{"name": "contradictions", "arguments": {"node": "01a1d2a7-2ad1-747a-8de7-291978bd0c57"}}
```

```json
{
  "contradictions": [
    {
      "constraint": "one_employer",
      "action": "invalidated",
      "ends_at": "2024-01-15",
      "new": { "text": "Ana Torres works_at Globex", "valid_from": "2024-01-15", "…": "…" },
      "old": { "text": "Ana Torres works_at Acme", "valid_from": "2021-03-01", "…": "…" },
      "at": "2026-11-13",
      "by": "assistant"
    }
  ]
}
```

`timeline` tells how a node changed, oldest first: its facts beginning and ending, when each was recorded, earlier values of its properties, merges and contradictions.

```json
{"name": "timeline", "arguments": {"id": "01a1d2a7-2ad1-747a-8de7-291978bd0c57"}}
```

```json
{
  "name": "Ana Torres",
  "timeline": [
    { "at": "2021-03-01", "kind": "fact_began", "text": "began: Ana Torres works_at Acme" },
    { "at": "2024-01-15", "kind": "fact_began", "text": "began: Ana Torres works_at Globex" },
    { "at": "2024-01-15", "kind": "fact_ended", "text": "ended: Ana Torres works_at Acme" },
    { "at": "2026-11-13", "kind": "created", "text": "Ana Torres was recorded", "by": "assistant" },
    { "at": "2026-11-13", "kind": "contradiction", "text": "Ana Torres works_at Globex contradicted Ana Torres works_at Acme under one_employer (invalidated)" },
    { "at": "2026-11-13", "kind": "fact_recorded", "text": "recorded: “Billing runbook > Escalate” mentions Ana Torres" }
  ]
}
```

(Some `fact_recorded` moments are left out above.)

## Keeping memory in shape: `feedback` and `maintain`

`feedback` says how a memory or fact turned out. Nothing is deleted, and the verdict stays on the memory (`feedback`, `feedback_note`):

| `verdict` | A memory | A fact |
| --- | --- | --- |
| `useful` | gains importance (0.1), and an access | — |
| `obsolete` | is archived: kept, left out of recall | ends now (invalidated) |
| `wrong` | is archived with no importance | is retracted as a mistake |

```json
{"name": "feedback", "arguments": {"id": "01a1d2a7-2ad3-71b1-9f3c-632ced0d2469", "verdict": "obsolete", "note": "Ana left Acme"}}
```

```json
{ "result": "archived: kept, but left out of recall", "verdict": "obsolete", "…": "…" }
```

`maintain` reviews the memory without changing it: its size, the [wear of its vector graphs](../vectors/sizing.md), the contradictions on record, likely duplicates, fading memories and groups of older memories to summarize with `consolidate`. With `"check": true` it also checks every record and index (it reads them all).

```json
{
  "health": { "nodes": 11, "edges": 16, "texts": 10, "contradictions": 1, "vector_graphs": [] },
  "duplicates": [],
  "weak": [],
  "consolidation": [],
  "hint": "…"
}
```

## Fence an agent

```bash
grafeno mcp --db agent.redb --namespace me \
  --allow me,shared-* --read-only
```

| Option | Effect |
| --- | --- |
| `--allow vault,team-*` | Limit the namespaces the agent may use. |
| `--read-only` | Offer only reading tools (`recall` records no accesses; `ingest`, `checkpoint`, `feedback` and every other writing tool are left out). |
| `--as NAME` | Save `NAME` in `@recorded_by` for the agent's writes, and as the agent of its checkpoints. |
| `--own-only` | With `--as`, only allow changes to records written by that actor. |

Several agents sharing one memory, each with its own permissions, use the HTTP API with [accounts and roles](access.md) instead: one server, one file, and a key per agent.

:::warning Database ownership
The MCP process opens its database file directly. It cannot share that file with `grafeno serve` or another MCP process. Use different files for separate agents unless they reach the memory through the HTTP API.
:::
