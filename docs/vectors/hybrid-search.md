---
title: Hybrid search
description: Search by words and by meaning at once with db.search modes, rank fusion or weighted fusion, and choose the text and vector side.
---

# Hybrid search

Words and vectors miss different things. A text search finds "error 1234" exactly but not "the database will not start"; a vector search finds the meaning but can miss a rare code or name. **Hybrid search** runs both and fuses the two lists.

## Syntax

```text
CALL db.search(text, {mode: 'text' | 'vector' | 'hybrid',
                      embedding: [...],          // for vector and hybrid
                      index: 'fulltext index',   // the text side (default: node text)
                      vector_index: 'name',      // the vector side (default: node embedding)
                      fusion: 'rank' | 'weighted', k: 60, text_weight: 0.5,
                      candidates: 50, limit: 10})
YIELD node, score
```

## The example data

Notes with a text and a 3-dimension embedding (about databases, about cooking, about travel):

```text run title="Example"
CREATE (:Note {title: 'Server will not start',  @text: 'The database server will not start after the upgrade: error 1234.',
               @embedding: [0.9, 0.0, 0.1]}),
       (:Note {title: 'Slow queries',           @text: 'Queries got slow until an index was added on the email column.',
               @embedding: [0.8, 0.1, 0.0]}),
       (:Note {title: 'Error 1234 at the bakery', @text: 'The oven showed error 1234 and the bread burned.',
               @embedding: [0.1, 0.9, 0.0]}),
       (:Note {title: 'Train to Cusco',         @text: 'The train to Cusco leaves at seven; bring warm clothes.',
               @embedding: [0.0, 0.1, 0.9]});
```

```text result title="Result"
4 nodes created
```

## Text only

The words "error 1234" appear in two notes, one of them about an oven:

```text run title="Example"
CALL db.search('error 1234', {mode: 'text', limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title               | score
--------------------------+-------
 Error 1234 at the bakery | 1.491
 Server will not start    | 1.33
(2 rows)
```

## Vector only

A query vector "about databases" (in a real application, the embedding of the question):

```text run title="Example"
CALL db.search('', {mode: 'vector', embedding: [1.0, 0.0, 0.0], limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title               | score
--------------------------+-------
 Server will not start    | 0.994
 Slow queries             | 0.992
 Error 1234 at the bakery | 0.11
(3 rows)
```

## Both: rank fusion

`mode: 'hybrid'` takes the best `candidates` of each list and adds `1 / (k + rank)` from each: a note high in both lists wins, and one strong in either still shows:

```text run title="Example"
CALL db.search('error 1234', {mode: 'hybrid', embedding: [1.0, 0.0, 0.0], limit: 3}) YIELD node, score
RETURN node.title, round(score, 4) AS score;
```

```text result title="Result"
 node.title               | score
--------------------------+--------
 Server will not start    | 0.0325
 Error 1234 at the bakery | 0.0323
 Slow queries             | 0.0161
(3 rows)
```

The database note with the error code comes first: it is first in both lists. The oven note matches the words but not the meaning.

## Both: weighted fusion

`fusion: 'weighted'` scales each list's scores to 0..1 and mixes them: `text × text_weight + vector × (1 − text_weight)`. Lean on the meaning:

```text run title="Example"
CALL db.search('error 1234', {mode: 'hybrid', embedding: [1.0, 0.0, 0.0], fusion: 'weighted',
                              text_weight: 0.3, limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title               | score
--------------------------+-------
 Server will not start    | 0.7
 Slow queries             | 0.699
 Error 1234 at the bakery | 0.378
(3 rows)
```

Lean on the words:

```text run title="Example"
CALL db.search('error 1234', {mode: 'hybrid', embedding: [1.0, 0.0, 0.0], fusion: 'weighted',
                              text_weight: 0.9, limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title               | score
--------------------------+-------
 Error 1234 at the bakery | 0.911
 Server will not start    | 0.1
 Slow queries             | 0.1
(3 rows)
```

## Which to choose

| Fusion | Good for |
| --- | --- |
| `rank` (default) | when the two scores are not comparable; robust, no tuning |
| `weighted` | when you want to control how much each side counts, and have tested `text_weight` on your data |

## With indexes

`index` chooses a [full-text index](../gq/full-text.md) for the text side, and `vector_index` a [vector index](vector-indexes.md) for the vector side:

```text
CALL db.search('graph memory', {mode: 'hybrid', index: 'notes', vector_index: 'docs', embedding: $e});
```

:::tip Recall
`POST /v1/{ns}/recall` (and the MCP `recall` tool) runs this search for agents, then adds what the graph says about the results. It takes the same `mode`, `fusion`, `index` and `vector_index`.
:::
