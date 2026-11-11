---
title: Vector indexes
description: Named vector indexes on a property of chosen labels, with cosine, dot or Euclidean similarity, HNSW settings, filters, several queries at once and background builds.
---

# Vector indexes

A **vector index** holds a property of the nodes with chosen labels, a list of numbers of a fixed dimension, and finds the nearest ones. A namespace can have several: one per model, per kind of content, or per size.

## Syntax

```text
CREATE VECTOR INDEX name [IF NOT EXISTS] FOR (n:Label|Other) ON (n.property)
  OPTIONS {dimension: 768, similarity: 'cosine' | 'dot' | 'euclidean',
           m: 16, ef_construction: 100, ef_search: 64, background: false}
CALL db.searchVector(vector, {index: 'name', limit: 10, labels: [...], where: {...}, ef: 64})
CALL db.searchVectors([vector, …], {index: 'name', limit: 5})
CALL db.similar(node, {index: 'name', limit: 10})
DROP INDEX name
```

## Create an index

Product descriptions with 4-dimension embeddings, compared by cosine:

```text run title="Example"
CREATE VECTOR INDEX products FOR (p:Product) ON (p.embedding)
  OPTIONS {dimension: 4, similarity: 'cosine'};
```

```text result title="Result"
 name     | label   | property  | unique | entries | fuzzy | on    | key   | kind   | state
----------+---------+-----------+--------+---------+-------+-------+-------+--------+--------
 products | Product | embedding | false  | 0       | false | nodes | false | vector | online
(1 row)
```

## The example data

Write vectors as a property. Nodes with the label and a list of the right length are in the index:

```text run title="Example"
CREATE (:Product {name: 'Trail shoes',    category: 'shoes',  price: 120, embedding: [0.9, 0.1, 0.0, 0.2]}),
       (:Product {name: 'Road shoes',     category: 'shoes',  price: 90,  embedding: [0.8, 0.2, 0.1, 0.1]}),
       (:Product {name: 'Rain jacket',    category: 'jacket', price: 150, embedding: [0.2, 0.9, 0.1, 0.0]}),
       (:Product {name: 'Wool jacket',    category: 'jacket', price: 200, embedding: [0.1, 0.8, 0.3, 0.1]}),
       (:Product {name: 'Hiking socks',   category: 'socks',  price: 15,  embedding: [0.6, 0.1, 0.0, 0.7]}),
       (:Product {name: 'Camp stove',     category: 'gear',   price: 60,  embedding: [0.1, 0.1, 0.9, 0.2]});
```

```text result title="Result"
6 nodes created
```

## Search

```text run title="Example"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 3}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 node.name    | score
--------------+-------
 Trail shoes  | 0.992
 Road shoes   | 0.95
 Hiking socks | 0.837
(3 rows)
```

## Filter while searching

`labels` and `where` keep only matching nodes. The filter is applied **during** the search, so you still get `limit` results even when few nodes match:

```text run title="Example"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 3, where: {category: 'jacket'}})
YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 node.name   | score
-------------+-------
 Rain jacket | 0.207
 Wool jacket | 0.144
(2 rows)
```

Conditions that are not equalities go after the search, in `WHERE`:

```text run title="Example"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 6}) YIELD node, score
WHERE node.price < 100
RETURN node.name, node.price, round(score, 3) AS score;
```

```text result title="Result"
 node.name    | node.price | score
--------------+------------+-------
 Road shoes   | 90         | 0.95
 Hiking socks | 15         | 0.837
 Camp stove   | 60         | 0.164
(3 rows)
```

## Several queries at once

`db.searchVectors` takes a list of vectors; `query` says which one each row answers:

```text run title="Example"
CALL db.searchVectors([[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]], {index: 'products', limit: 2})
YIELD query, node, score
RETURN query, node.name, round(score, 3) AS score;
```

```text result title="Result"
 query | node.name   | score
-------+-------------+-------
 0     | Trail shoes | 0.97
 0     | Road shoes  | 0.956
 1     | Rain jacket | 0.97
 1     | Wool jacket | 0.924
(4 rows)
```

## Similar products

```text run title="Example"
MATCH (p:Product {name: 'Trail shoes'})
CALL db.similar(p, {index: 'products', limit: 3}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 node.name    | score
--------------+-------
 Road shoes   | 0.98
 Hiking socks | 0.802
 Rain jacket  | 0.314
(3 rows)
```

## Choose a similarity

| Similarity | Score | Use when |
| --- | --- | --- |
| `cosine` (default) | the cosine of the angle, up to 1 | the model's vectors are compared by direction (most text models) |
| `dot` | the dot product, unbounded | the model says to use the inner product, or lengths carry meaning |
| `euclidean` | `1 / (1 + distance)` | points in space: positions, measurements |

The same points under each:

```text run title="Example"
CREATE VECTOR INDEX places FOR (s:Spot) ON (s.xy) OPTIONS {dimension: 2, similarity: 'euclidean'};
CREATE (:Spot {name: 'near', xy: [1.0, 1.0]}), (:Spot {name: 'far, same direction', xy: [10.0, 10.0]}),
       (:Spot {name: 'other side', xy: [-1.0, 1.0]});
CALL db.searchVector([1.0, 1.2], {index: 'places', limit: 3}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 name   | label | property | unique | entries | fuzzy | on    | key   | kind   | state
--------+-------+----------+--------+---------+-------+-------+-------+--------+--------
 places | Spot  | xy       | false  | 0       | false | nodes | false | vector | online
(1 row)
3 nodes created
 node.name           | score
---------------------+-------
 near                | 0.833
 other side          | 0.332
 far, same direction | 0.074
(3 rows)
```

By Euclidean distance, "near" wins and "far" is last; by cosine, "near" and "far" would tie, since they point the same way.

## Wrong dimensions

A list of another length is refused; a value that is not a list of numbers is simply not indexed:

```text run title="Example"
CREATE (:Product {name: 'Broken', embedding: [0.1, 0.2]});
```

```text result title="Result"
error: invalid input: products holds vectors of dimension 4: node 01a1cb1f-4457-74e4-8fcb-fc28eda4ee81 has 2 values in embedding
```

## Tune the index

| Option | Default | Higher means |
| --- | --- | --- |
| `m` | 16 | more links per node: better recall, more memory and slower inserts (2 to 128) |
| `ef_construction` | 100 | more candidates while inserting: a better graph, slower inserts |
| `ef_search` | 64 | more candidates while searching: better recall, slower searches; a search can pass its own `ef` |

```text run title="Example"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 2, ef: 200}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 node.name   | score
-------------+-------
 Trail shoes | 0.992
 Road shoes  | 0.95
(2 rows)
```

[Sizing](sizing.md) shows what these cost in memory and time.

## Build in the background

On a large label, `background: true` creates the index empty and fills it a chunk at a time while writes go on. `SHOW INDEXES` says `building`, then `online`:

```text run title="Example"
UNWIND range(1, 500) AS i
CREATE (:Review {stars: i % 5 + 1, embedding: [toFloat(i % 7), toFloat(i % 11), toFloat(i % 13), 1.0]});
CREATE VECTOR INDEX reviews FOR (r:Review) ON (r.embedding)
  OPTIONS {dimension: 4, background: true};
```

```text result title="Result"
500 nodes created
 name    | label  | property  | unique | entries | fuzzy | on    | key   | kind   | state
---------+--------+-----------+--------+---------+-------+-------+-------+--------+----------
 reviews | Review | embedding | false  | 0       | false | nodes | false | vector | building
(1 row)
```

A property can be in one vector index only: a second index on `Product.embedding` is refused.

## List and drop

```text run title="Example"
SHOW INDEXES;
```

```text result title="Result"
 name     | label   | property  | unique | entries | fuzzy | on    | key   | kind   | state
----------+---------+-----------+--------+---------+-------+-------+-------+--------+----------
 places   | Spot    | xy        | false  | 3       | false | nodes | false | vector | online
 products | Product | embedding | false  | 6       | false | nodes | false | vector | online
 reviews  | Review  | embedding | false  | 0       | false | nodes | false | vector | building
(3 rows)
```

```text run title="Example"
DROP INDEX reviews;
```

```text result title="Result"
 name    | label  | property  | unique | entries | fuzzy | on    | key   | kind   | state
---------+--------+-----------+--------+---------+-------+-------+-------+--------+----------
 reviews | Review | embedding | false  | 0       | false | nodes | false | vector | building
(1 row)
```

:::tip Good to know
- The index is kept in the same transaction as each write, exported, replicated and dropped like any index.
- A node with several labels of an index is indexed once.
- When at most 4 096 nodes pass a `labels` filter, those are scored exactly instead of walking the graph.
:::
