---
title: Full-text search
description: Search the text of nodes with db.search, and chosen properties with full-text indexes, analyzers, a query language, weights and fragments.
---

# Full-text search

Grafeno searches words, not exact values: "graph" finds "Graphs", results come ranked by relevance (BM25), and a query can ask for phrases, required words, prefixes and typos.

There are two ways to search text:

| | Searches | Set up with |
| --- | --- | --- |
| **The node text** | each node's `@text` | nothing: `@text` is always searchable with `db.search` |
| **A full-text index** | chosen string properties of a label, with weights | `CREATE FULLTEXT INDEX`, searched with `db.searchIndex` |

## The example data

```text run title="Example"
CREATE (:Note {title: 'Graph databases', body: 'Graphs store relationships as edges between nodes.',
               @text: 'Graph databases store relationships as edges between nodes.'}),
       (:Note {title: 'Agent memory', body: 'An agent remembers facts in a graph and recalls them later.',
               @text: 'An agent remembers facts in a graph and recalls them later.'}),
       (:Note {title: 'Cooking rice', body: 'Rinse the rice, then simmer it with twice the water.',
               @text: 'Rinse the rice, then simmer it with twice the water.'}),
       (:Note {title: 'Draft: graph memory', body: 'Unfinished notes on graph memory for agents.',
               @text: 'Unfinished notes on graph memory for agents.', draft: true});
```

```text result title="Result"
4 nodes created
```

## Search the node text

`db.search(text, limit)` yields each matching node and its score, best first:

```text run title="Example"
CALL db.search('graph', 10) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title          | score
---------------------+-------
 Draft: graph memory | 0.377
 Agent memory        | 0.35
 Graph databases     | 0.328
(3 rows)
```

## Create a full-text index

A full-text index covers string properties of one or more labels. `weights` make a field count more; the `english` analyzer reduces words to their stem, so `graphs` and `graph` match:

```text run title="Example"
CREATE FULLTEXT INDEX notes FOR (n:Note) ON EACH [n.title, n.body]
  OPTIONS {analyzer: 'english', weights: {title: 3}};
```

```text result title="Result"
 name  | label | property    | unique | entries | fuzzy | on    | key   | kind     | state
-------+-------+-------------+--------+---------+-------+-------+-------+----------+--------
 notes | Note  | title, body | false  | 31      | false | nodes | false | fulltext | online
(1 row)
```

## Search an index

`db.searchIndex(index, query, limit)` yields the node, its score and the **fragments** that matched:

```text run title="Example"
CALL db.searchIndex('notes', 'graphs', 10) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title          | score
---------------------+-------
 Graph databases     | 1.465
 Draft: graph memory | 1.312
 Agent memory        | 0.344
(3 rows)
```

A title match counts three times a body match, so notes with the word in the title come first.

## The query language

| Query | Finds |
| --- | --- |
| `graph memory` | any of the words; more matching words rank higher |
| `"graph memory"` | the phrase, words in order and together |
| `"agent graph"~3` | all the words within 3 positions of each other |
| `+agent` | notes that **must** contain the word |
| `-draft`, `NOT draft` | notes that must not |
| `graph AND memory`, `rice OR graph` | both, either |
| `mem*` | words starting with `mem` |
| `grahp~1` | words one edit away (a typo); at most `~2` |
| `title:memory` | the word in that field only |

A phrase:

```text run title="Example"
CALL db.searchIndex('notes', '"graph memory"', 10) YIELD node RETURN node.title;
```

```text result title="Result"
 node.title
---------------------
 Draft: graph memory
(1 row)
```

Required and excluded words:

```text run title="Example"
CALL db.searchIndex('notes', '+memory -unfinished', 10) YIELD node RETURN node.title;
```

```text result title="Result"
 node.title
--------------
 Agent memory
(1 row)
```

A prefix and a typo:

```text run title="Example"
CALL db.searchIndex('notes', 'remem* OR simmr~1', 10) YIELD node RETURN node.title;
```

```text result title="Result"
 node.title
--------------
 Agent memory
 Cooking rice
(2 rows)
```

One field only:

```text run title="Example"
CALL db.searchIndex('notes', 'title:memory', 10) YIELD node RETURN node.title;
```

```text result title="Result"
 node.title
---------------------
 Agent memory
 Draft: graph memory
(2 rows)
```

## Fragments

Fragments show where the words matched, to highlight them. `matches` are `[start, end)` positions in the fragment's text:

```text run title="Example"
CALL db.searchIndex('notes', 'rice', {limit: 1, fragments: true}) YIELD node, fragments
UNWIND fragments AS f
RETURN node.title, f.field, f.text, f.matches;
```

```text result title="Result"
 node.title   | f.field | f.text                                               | f.matches
--------------+---------+------------------------------------------------------+------------
 Cooking rice | title   | Cooking rice                                         | [[8, 12]]
 Cooking rice | body    | Rinse the rice, then simmer it with twice the water. | [[10, 14]]
(2 rows)
```

## Combine search with the graph

A search yields nodes, so the query can go on from them like any `MATCH`:

```text run title="Example"
CALL db.searchIndex('notes', 'graph', 10) YIELD node, score
WHERE node.draft IS NULL
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title      | score
-----------------+-------
 Graph databases | 1.465
 Agent memory    | 0.344
(2 rows)
```

## Analyzers

| Analyzer | Does |
| --- | --- |
| `standard` (default) | lowercases, removes accents, leaves out common English and Spanish words |
| `english` | the same, and reduces English words to their stem (`graphs` → `graph`) |
| `spanish` | the same for Spanish (`grafos` → `graf`) |
| `simple` | lowercases and removes accents, keeps every word |

## Text, vector or both

`db.search` also searches by vector, or by both at once (hybrid search, with rank fusion). See [Hybrid search](../vectors/hybrid-search.md).

:::tip Good to know
- A full-text index is kept up to date in the same transaction as every write; `SHOW INDEXES` lists it with kind `fulltext`.
- A field may hold a string or a list of strings.
- A query of only excluded words is refused: there would be nothing to rank.
:::
