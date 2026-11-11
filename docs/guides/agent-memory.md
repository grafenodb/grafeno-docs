---
title: Memory for agents
description: Keep an agent's memory in shape — store episodes with their sources, find duplicates and merge them, stop facts from contradicting each other, and consolidate.
sidebar_position: 2
---

# Memory for agents

A memory that only grows becomes noise: the same person under three spellings, an old job next to the new one, a hundred near-identical notes. This guide shows what Grafeno does about each, with examples you can run in the console (`grafeno shell`) or over HTTP. Grafeno does all of it with rules, statistics and graph algorithms on the CPU; it never calls a language model. An agent that has one can still send its own results (extracted entities, a summary), and they are stored with their provenance like any other write.

## Store what happened, and where it came from

Keep the raw material (an episode, a message, a document) as a node with its text, and point derived facts at it with `@sources`. Then every fact can say where it came from.

```text
CREATE (e:Episode {at: '2026-11-03', @text: 'Ana said she starts at Orbit Labs next month.'});

MATCH (e:Episode {at: '2026-11-03'}), (a:Person {name: 'Ana Torres'}), (o:Company {name: 'Orbit Labs'})
CREATE (a)-[:works_at {@valid_from: '2025-02-01', @sources: [e.@id]}]->(o);
```

Writing from an application or a pipeline? Two tools avoid duplicates on the way in:

- **Your own ids.** Send a node with the `id` your system already has (`POST /v1/{ns}/nodes` with `"id": "…"`) and writing it again updates it instead of creating another.
- **Keys in a stream.** `POST /v1/{ns}/ingest` takes one JSON object per line, each with a `key`; ends of edges can name other lines' keys. Sending the same lines again writes nothing:

```json
{"key": "ana",  "node": {"labels": ["Person"],  "props": {"name": "Ana Torres"}}}
{"key": "acme", "node": {"labels": ["Company"], "props": {"name": "Acme Robotics"}}}
{"key": "job1", "edge": {"from": "$ana", "label": "works_at", "to": "$acme"}}
```

```text
first time:   {"lines":3,"nodes":2,"edges":1,"duplicates":0,"failed":0}
second time:  {"lines":3,"nodes":0,"edges":0,"duplicates":3,"failed":0}
```

## Find the same thing under different names

"Ana Torres", "Ana Torrez" and "A. Torres" may be one person. Grafeno has three tools, from quick to thorough.

**Similar text.** A fuzzy index finds names that look alike — typos, accents, case, word order — without comparing with every node:

```text
CREATE FUZZY INDEX FOR (p:Person) ON (p.name);
CALL db.searchFuzzy('Person', 'name', 'ana torres', 5) YIELD node, score RETURN node.name, score;
```

```text
 node.name  | score
------------+--------------------
 Ana Torres | 1.0
 Ana Torrez | 0.8181818181818182
(2 rows)
```

Similarity functions are there for your own rules: `text.jaroWinkler('Ana Torres', 'Ana Torrez')` is `0.96`; `text.phonetic` compares how names sound (Spanish or English).

**Match rules.** Deciding that two records are the same takes more than a name: two different people can both be called Ana Torres. A match rule, declared per label, weighs several fields and gives two thresholds — above `same` it is the same entity, between `review` and `same` a person should look:

```bash
curl -X PUT http://127.0.0.1:7810/v1/demo/match-rules/Person -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{
    "fields": [
      {"key": "name",    "measure": "jaro_winkler", "weight": 2},
      {"key": "born_on", "measure": "date",         "weight": 2},
      {"key": "city",    "measure": "exact",        "weight": 0.5}
    ],
    "same": 0.85, "review": 0.7}'
```

With two people named Ana Torres in the graph — one born in 1990 in Lima, the other in 1985 in Quito — a new record with a typo finds the right one and rules out her namesake:

```text
CALL db.match('Person', {name: 'Ana Torrez', born_on: '1990-04-12', city: 'Lima'}, 3)
YIELD node, score, decision RETURN node.city, score, decision;
```

```text
 node.city | score              | decision
-----------+--------------------+-----------
 Lima      | 0.9822222222222222 | same
 Quito     | 0.4266666666666666 | different
(2 rows)
```

**Likely duplicates.** `GET /v1/{ns}/duplicates` lists pairs that may be one entity, best first, with the reasons. A strong key decides: the same email (case aside) means the same person, a different one means namesakes:

```bash
curl "http://127.0.0.1:7810/v1/demo/duplicates?label=Person&strong_keys=email" -H "Authorization: Bearer $TOKEN"
```

```json
[{"a": {"props": {"name": "Ana Torres", "email": "ana@acme.example"}, "…": "…"},
  "b": {"props": {"name": "A. Torres", "email": "ANA@acme.example"}, "…": "…"},
  "score": 1.0,
  "reasons": ["same email \"ana@acme.example\"", "\"a torres\" and \"ana torres\" share 1 word(s)"],
  "conflicts": []}]
```

## Merge them — and undo it if it was wrong

`POST /v1/{ns}/merge` folds one node into another: its facts move to the kept node, its properties fill the gaps. Try it first with `dry_run`, which reports conflicts (facts the two disagree on) and changes nothing:

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/merge -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"keep": "<id of Ana Torres>", "merge": "<id of A. Torres>", "dry_run": true}'
```

Without `dry_run` it merges and returns a record: `{"id": "…", "kept": "…", "merged": "…", "edges_moved": 0, "conflicts": []}`. Every merge is kept (`GET /v1/{ns}/merges`), and `POST /v1/{ns}/merges/{id}/undo` puts both nodes back as they were. Merges that would join different people (different strong keys, a `distinct_from` fact between them) are refused unless forced.

## Keep facts from contradicting each other

A person works at one company at a time. Say so once, with a constraint, and a new fact ends the old one in valid time instead of leaving two "current" employers:

```text
CREATE CONSTRAINT FOR ()-[r:works_at]->() REQUIRE ONE PER SOURCE;

MATCH (a:Person {name: 'Ana Torres'}), (c:Company {name: 'Acme Robotics'})
CREATE (a)-[:works_at {@valid_from: '2021-03-01'}]->(c);
MATCH (a:Person {name: 'Ana Torres'}), (c:Company {name: 'Orbit Labs'})
CREATE (a)-[:works_at {@valid_from: '2025-02-01'}]->(c);

MATCH (:Person {name: 'Ana Torres'})-[w:works_at]->(c)
RETURN c.name, date(w.@valid_from) AS since, date(w.@valid_to) AS until ORDER BY since;
```

```text
 c.name        | since      | until
---------------+------------+------------
 Acme Robotics | 2021-03-01 | 2025-02-01
 Orbit Labs    | 2025-02-01 | null
(2 rows)
```

Nothing was deleted: the old job ended where the new one starts, and the change is recorded (`GET /v1/{ns}/contradictions` lists every one). Other rules:

| Constraint | Means |
| --- | --- |
| `REQUIRE ONE PER SOURCE` | one current fact per node it starts from (one employer per person) |
| `REQUIRE ONE PER TARGET` | one per node it ends at (one person per seat) |
| `REQUIRE ONE PER PAIR` | one between any two nodes (one rating of a film by a person) |
| `ON CONFLICT FLAG` | keep both, and record the contradiction for review |
| `ON CONFLICT REJECT` | refuse the new fact |
| `REQUIRE p.city IS FUNCTIONAL` | one value of a property at a time, earlier ones kept |

`SHOW CONSTRAINTS` lists them, `DROP CONSTRAINT name` removes one.

## Let memories fade, and consolidate them

Every node has an **importance** (0 to 1, `SET n.@importance = 0.9`) and remembers when it was last used (recall counts it). Recall ranks important and recent memories higher, and what is old, unimportant and unused fades:

- `GET /v1/{ns}/weak?half_life_days=30` lists the weakest memories; `POST /v1/{ns}/archive` archives them (they leave recall, but stay).
- **Summaries** replace many small memories with one: `POST /v1/{ns}/summaries` with your text and the nodes it summarizes (`"sources": [...]`, `"archive_sources": true`). The summary points at its sources, so nothing is lost.

## Summaries of what belongs together

`POST /v1/{ns}/communities/refresh` finds groups of densely connected nodes (communities, in levels) and writes a summary node for each — their central members, frequent terms and main facts — kept fresh as the graph changes when `[background]` asks for it. `GET /v1/{ns}/communities?q=robotics` searches them, and [context](../concepts/search-and-recall.md#context) can include the matching ones, which gives an agent the big picture before the details.

## Mentions in texts

`POST /v1/{ns}/extract` reads new and changed texts and links what they mention — names already in the graph, emails, URLs, handles, dates, amounts, and new names that keep coming up — so episodes connect to the entities they talk about without a model. Doubtful links wait in a review queue (`GET /v1/{ns}/review`).

## Through MCP

An agent connected over [MCP](./mcp.md) has all of this as tools: `remember`, `relate`, `forget`, `find_matches`, `merge`, `undo_merge`, `extract`, `maintain` (duplicates, weak memories and groups ready to consolidate, in one report), `consolidate`, `summarize_communities`.
