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

The server tells the agent how to use it when it connects: call `context` (or `recall`) before answering anything that may depend on what it knows, `remember` new facts and decisions, `relate` nodes, `resume` at the start of ongoing work and `checkpoint` before stopping, and keep the memories of a project together in a room of a palace. Every tool takes an optional `namespace`; without one it uses `--namespace`. Ids are the UUIDs the tools return.

## The tools

| To… | Tools |
| --- | --- |
| Store and connect | `remember` (a memory, a person, a decision, with links), `relate` (a dated fact between two nodes), `update`, `forget` (a fact ends, is taken back, or is deleted) |
| Find and read | `recall` (words, meaning and the graph, each result with why it matched), `context` (memories and facts as text within a token budget), `get_node`, `query` (read-only [GQ](../gq/index.md), 200 rows at most), `overview` (community summaries for broad questions) |
| Store long texts | `ingest` (a document, a conversation or code, cut into chunks) |
| Pick work up again | `checkpoint` (where a task stands), `resume` (its latest checkpoint and what changed since) |
| Arrange memories into places | `palace_create`, `palace_create_room`, `palace_anchor` (an existing memory at a place in a room), `palace_map`, `palace_walk` (from a topic to the memories around it), `palace_enter` (a room's context and its checkpoint), `palace_route` (given relations followed in order, towards a goal), `palace_review` (proposals to arrange it better), `palace_reflect` (what is known, and what is not) |
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

## Kinds, relations and provenance

A memory says what kind it is with a label. These have a meaning: `Fact`, `Decision`, `Experience`, `Task`, `Question`, `Episode` (raw material as it came), `Concept`, `Hypothesis`, `Evidence`, `Constraint` (a rule of the domain) and `Goal`. A fact can have any label; these have a meaning: `related_to`, `depends_on`, `part_of`, `derived_from`, `supported_by`, `contradicts`, `supersedes` and `caused_by`, which `relate` refuses without `sources`, since a cause needs its evidence named.

`remember` and `relate` take `method`, how something was obtained (`agent`, `rule`, `stated`, `imported`); `get_node` answers a `provenance` block with the sources, who recorded it and how, what supports it and what merges brought in. The same current fact is recorded once: `relate` answers `"duplicate": true` with the one there is, and `maintain` lists facts stored twice. A merge keeps what the merged node was and how it was known, in `merged_from`.

## Memories by place: the `palace_*` tools

A mental palace arranges memories that already exist into places, so an agent finds them again by where they are. A **palace** (`Work`) has **rooms**, one per project or subject; a room has **loci**, places inside it (every room has one named `entrance`); and a memory is **anchored** at one or several loci. The memory is not copied or changed and keeps its own relations: an anchor is one more edge. A palace lives in one namespace, and it is ordinary nodes and edges, so it is saved with everything else.

These examples come from another session, with three notes about a storage engine.

A palace and a room are made once; asking again returns the ones there are. A palace or a room is given by its name or its id.

```json
{"name": "palace_create", "arguments": {"name": "Work", "description": "Projects I work on"}}
{"name": "palace_create_room", "arguments": {
  "palace": "Work", "name": "Storage", "topic": "the storage engine", "loci": ["Decisions"]}}
```

```json
{
  "created": true,
  "id": "01a1d4a0-93ba-735b-8a34-93a7400f181d",
  "palace": { "id": "01a1d4a0-93b9-779b-b1c4-754c4993cb46", "name": "Work" },
  "room": {
    "name": "Storage",
    "topic": "the storage engine",
    "memories": 0,
    "loci": [
      { "name": "entrance", "position": 0, "count": 0, "…": "…" },
      { "name": "Decisions", "position": 1, "count": 0, "…": "…" }
    ],
    "…": "…"
  }
}
```

Memories are stored as always, with `remember` and `relate`, and then anchored. A locus that does not exist yet is made; a room is not. Without `locus`, the memory goes to the entrance; with `"remove": true`, the anchor is taken away and the memory stays.

```json
{"name": "palace_anchor", "arguments": {
  "memory": "01a1d4a0-93bc-77f0-bb99-3f87bd487361",
  "room": "Storage", "locus": "Decisions", "note": "why writes are serial"}}
```

```json
{
  "anchored": true,
  "locus_created": false,
  "memory": { "id": "01a1d4a0-93bc-77f0-bb99-3f87bd487361", "name": "Only one transaction writes at a time" },
  "places": [
    {
      "palace_name": "Work",
      "room_name": "Storage",
      "locus_name": "Decisions",
      "note": "why writes are serial",
      "…": "…"
    }
  ],
  "…": "…"
}
```

`palace_map` shows what is where: with no arguments, every palace with its rooms, loci and how many memories each holds; with `palace`, that one; with `room`, the memories at each locus.

`palace_walk` goes from a topic, or from a node (`from`), to the memories around it. It finds the rooms and loci the topic names and the anchored memories that match it, then follows the graph's relations from those, up to `hops` (2 by default, 3 at most). Here two notes are in the room, and the third, anchored nowhere, is one relation away from one of them:

```json
{"name": "palace_walk", "arguments": {"topic": "storage engine"}}
```

```json
{
  "places": [
    { "kind": "Room", "path": "Work / Storage", "…": "…" }
  ],
  "memories": [
    {
      "name": "“The whole database is one file”",
      "hops": 0,
      "places": [{ "room_name": "Storage", "locus_name": "entrance", "…": "…" }],
      "…": "…"
    },
    {
      "name": "“Only one transaction writes at a time”",
      "hops": 0,
      "places": [{ "room_name": "Storage", "locus_name": "Decisions", "note": "why writes are serial", "…": "…" }],
      "…": "…"
    },
    {
      "name": "“A replicated log orders the writes”",
      "hops": 1,
      "origin": "01a1d4a0-93bc-77f0-bb99-3f87bd487361",
      "via": [{ "label": "leads_to", "forward": true, "…": "…" }],
      "…": "…"
    }
  ]
}
```

A walk returns only what is in a palace or reached from it; a memory that matches the topic and is anchored nowhere is `recall`'s to find.

Three more things a walk does:

- **Doors.** A `leads_to` fact from one room to another, recorded with `relate`, is a door. `palace_map` lists a room's doors, and a walk goes through the doors of the rooms it found: what is anchored beyond is one step away, with the door in its `via`.
- **Relevance.** `"order": "relevance"` ranks what the walk reached by how well its words match the topic (whole words), then by distance. A memory reached through relations also inherits half the relevance of the one it was reached from, per relation, so what the best match leads to is not buried under weak matches. Each memory says its `relevance`.
- **A context.** `"budget": 600` also returns the memories reached and the facts that join them as text within that many tokens. A question that needs several memories joined, such as who maintains the service an outage hit, is answered by that text, with the way that joined them in each memory's `via`.
- **Only some relations, or a past time.** `"relations": ["hit", "depends_on", "maintains"]` follows only those labels; `"valid_at": "2025-06-01"` follows only the facts true then, so the walk reaches who maintained the store at that date. A walk `from` an entity is a recall about that entity.
- **How, and on what grounds.** Each memory says how the walk found it (`found_by`, in words, beside `via`) and, apart, what supports it or puts it in doubt (`justification`: its `sources`, how it is `known`, and what it is `supported_by`, `contradicted_by` and `superseded_by`). `recall` answers the same `justification` beside its `why`. The two are kept apart: a score is not evidence.
- **The next part.** `"skip": 20` leaves out what was already read; `recall` and `context` take it too.

`context`, `palace_enter` and a walk's context leave out a memory whose words are nearly those of one already packed, and say how many they left out. They pack memories joined by a fact next to each other, and say their token count is an estimate (`tokens_estimated`). `recall` and `context` scale each search's scores before fusing them, so what the best match is related to can outrank weak matches; `"fusion": "rank"` fuses by rank alone.

A palace changes as the work does:

- `palace_review` proposes how to arrange it better, each proposal with its reason and the call that carries it out, and applies nothing: split a room too full for one context, merge two rooms that hold the same memories, move a memory to the room where its community lives, remove empty rooms and loci, make a room for a community of memories with none, retract a fact recorded twice; and it points at a memory related to none of the others in its room, and at a room whose memories are not related at all. What depends on communities needs `summarize_communities` first.
- `palace_route` follows given relations in order from a node, towards a goal: `"steps": [{"label": "hit"}, {"label": "depends_on", "repeat": true}, {"label": "maintains", "backward": true}]` goes from an incident to the service it hit, everything that depends on, and who maintains the end of the chain. `repeat` follows a relation as far as it goes, `backward` against its arrow, `to` keeps only the routes that end at a node, and `valid_at` follows only the facts true then. A decision's versions are `{"label": "supersedes", "repeat": true}`.
- `get_node` with `"reconstruct": true` rebuilds a memory's, a decision's, an entity's or a room's context in one call: where it is kept in every palace, the facts that hold now, its latest timeline, its versions, what supports it, and a reflection.
- A memory anchored in two palaces is one node: a change made once, by an agent allowed to write, shows in both.
- `forget` on a palace, a room or a locus deletes it with what is under it (rooms, loci, anchors), and never a memory. `"dry_run": true` says what would go first.
- `maintain` lists older memories that a newer one about the same entity may overtake, for the agent to judge; `feedback` `obsolete` archives the older one.
- `consolidate` with `"undo"` and a summary's id deletes the summary and brings back the memories it archived.

Before answering on uncertain ground, an agent can ask what it knows. `palace_reflect` with a `topic`, a `room` or a `node` answers, each item with the record it comes from:

- **known**: the memories and facts found, counted by kind and by how they are known, the verified ones named;
- **uncertain**: what was inferred with no source, or has a low certainty;
- **unsupported**: what was said to be stated or observed with no source behind it;
- **conflicts**: clashes recorded under constraints or with `contradicts`, the unsettled first, each a `change` (the newer fact took the older's place) or a `contradiction` (both stand);
- **stale**: facts that ended, archived or obsolete memories, memories long unused, older ones a newer memory may overtake;
- **gaps**: open questions, things mentioned and never described, empty places, steps left in a checkpoint, and what a kind's expected shape asks for and a memory lacks;
- **next**: what to check, with the call that does it.

Each item's sources are under `sources`, by its id, and `known.by_evidence` counts every record once by what is stored behind it (conflicting, obsolete, verified, supported, or with no source): counts, not probabilities. What a kind of memory should have is its expected shape: `"expected": {"Decision": {"relations": ["supported_by"], "properties": ["reason"]}}` in the call, or declared once as a memory labeled `Shape` with the properties `kind`, `relations` and `properties`. The reflection recommends checks and never searches outside Grafeno.

A topic with nothing stored answers `"nothing": true`, and no unrelated memory in its place. A question is a memory labeled `Question`, open until a memory is related to it with `answers`. The reflection writes nothing and judges nothing: origin and certainty are what agents stated.

`palace_enter` rebuilds a room's context at the start of a session: its memories, the strongest first, and the facts that connect them, as text within a token `budget` (1,500 by default), and the latest checkpoint about the room. Saving that checkpoint is the `checkpoint` tool, with `about` set to the room's id.

```json
{"name": "palace_enter", "arguments": {"room": "Storage"}}
```

```json
{
  "palace": { "id": "01a1d4a0-93b9-779b-b1c4-754c4993cb46", "name": "Work" },
  "room": { "name": "Storage", "memories": 2, "…": "…" },
  "context": "## Memory\n[1] (Note)\nOnly one transaction writes at a time\n\n[2] (Note)\nThe whole database is one file\n\n## Facts\n- “Only one transaction writes at a time” leads_to “A replicated log orders the writes”\n",
  "tokens": 74,
  "memories": [
    { "id": "01a1d4a0-93bc-77f0-bb99-3f87bd487361", "truncated": false, "…": "…" },
    { "id": "01a1d4a0-93bc-77f1-a9b4-99670d911c39", "truncated": false, "…": "…" }
  ],
  "left_out": 0,
  "checkpoint": {
    "task": "Storage design",
    "summary": "One writer settled",
    "next": ["Measure the file"],
    "…": "…"
  }
}
```

Recall, context, community summaries, `maintain` and extraction read memories and leave palaces, rooms and loci out: they answer the same with a palace as without one, and a room named after a project is not taken for the project. To rename or describe a room use `update`; `forget` deletes one, and leaves its loci without a room.

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

`timeline` also answers two questions about time:

- **What changed between two dates.** `"compare": "2023-06-01"` (and `"at"`, now by default) lists the node's facts that **ended**, that **began**, and that **changed**: the same relation from the same end to another node. For Ana Torres, `works_at` changed from Acme to Globex; a fact true at both dates is only counted (`kept`).
- **A decision's history.** A decision that changes is a new memory that `supersedes` the one before, recorded with `relate` and a `reason` (and `sources` for the evidence). `timeline` on any version answers `history`: every version, oldest first, the current one last, each with the reason and evidence of its change. Nothing is deleted; older versions stay readable.

```json
{"name": "relate", "arguments": {
  "from": "<the new decision>", "label": "supersedes", "to": "<the old one>",
  "reason": "one table grew too slow", "sources": ["<the measurement>"]}}
```

`palace_reflect` tells a **change** (under a constraint, a newer fact took an older one's place, as `works_at` above) from a **contradiction** (both stand: flagged under a constraint, or recorded with `contradicts`). Facts from different sources are not taken for contradictions unless recorded as such.

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
| `--read-only` | Offer only reading tools (`recall` records no accesses; `ingest`, `checkpoint`, `feedback`, `palace_create`, `palace_create_room`, `palace_anchor` and every other writing tool are left out). |
| `--as NAME` | Save `NAME` in `@recorded_by` for the agent's writes, and as the agent of its checkpoints. |
| `--own-only` | With `--as`, only allow changes to records written by that actor. |

## Several agents, one memory

Several agents share one memory through one server that owns the file. Give each agent an account of its own with [accounts and roles](access.md) and a key, and let its MCP process run its tools on the server instead of opening a file:

```bash
grafeno mcp --url http://127.0.0.1:7810 --token "$AGENT_KEY" --namespace team
```

The server checks each agent's rights by its key: an agent that may only read a namespace gets the tools that read there and is refused the others; one with no right on a namespace is refused there. A palace in a namespace only one account may use is that agent's own; a palace in a namespace several may read is shared. Each write is recorded as the agent's account, refusals go to the audit log, and the server takes the writes of every agent on its one writer, so they can work at the same time.

The same tools run over HTTP: `GET /v1/{ns}/tools` lists those the caller may use, and `POST /v1/{ns}/tools/{name}` runs one with a JSON object of arguments and answers as MCP does. GQ runs on `POST /v1/{ns}/query`. The tools check rights by namespace: an account with rules on labels, properties or records uses the API's other routes. They are not available on a cluster yet.

## Watch the agent's memory as it writes

The MCP process opens its database file directly, and only one process can open a file: while the agent runs, Grafeno Studio or `grafeno shell --db` cannot open it too, and say it is already open. Let the agent's MCP server also serve the HTTP API on the same database, and connect to that instead:

```bash
grafeno mcp --db agent.redb --namespace me --listen 127.0.0.1:7810 --token "$GRAFENO_TOKEN"
```

In the client's configuration, the same arguments go in `args`. Then connect Grafeno Studio to `http://127.0.0.1:7810` with that token, or a console:

```bash
grafeno shell --url http://127.0.0.1:7810 --token "$GRAFENO_TOKEN"
```

What the agent stores appears there at once, in queries and in the change log the graph view follows, and what you write there the agent recalls. `--listen` takes `--token` (or `GRAFENO_TOKEN`) and `--cors-origins`. Without a token, keep the address on `127.0.0.1`.

:::warning Database ownership
A second process on a file that is open is refused, with a message that says how to connect instead. Use different files for separate agents unless they reach the memory through one server's HTTP API.
:::
