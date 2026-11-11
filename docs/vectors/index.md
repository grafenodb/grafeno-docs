---
title: Vectors and embeddings
description: What embeddings are, how to store a vector on a node, and how to find the nearest nodes by meaning with db.searchVector and db.similar.
---

# Vectors and embeddings

An **embedding** is a list of numbers that stands for the meaning of something: a text, an image, a product. Texts about the same topic get vectors that point in similar directions, so "nearest vectors" means "most similar meaning". Grafeno stores vectors on nodes and finds the nearest ones quickly, with an HNSW index.

Grafeno does not compute embeddings: your application, or a model it runs, does, and stores the result. Grafeno keeps them, indexes them, and searches them together with the graph and the text.

## Two ways to store vectors

| | The node's embedding | A vector index |
| --- | --- | --- |
| Where | `@embedding`, one per node | a property (`d.embedding`) of chosen labels |
| How many per namespace | one space, one dimension | as many indexes as you like, each with its own dimension |
| Similarity | cosine | cosine, dot product or Euclidean |
| Set up | nothing | `CREATE VECTOR INDEX` |
| Search | `db.searchVector(v)` | `db.searchVector(v, {index: 'name'})` |

This page covers the node's embedding. [Vector indexes](vector-indexes.md) covers named indexes, [Hybrid search](hybrid-search.md) mixes vectors with text, and [Sizing](sizing.md) helps you choose dimensions and memory.

## The example data

Real embeddings have hundreds of dimensions. These have three, so you can read them: the first number stands for "about animals", the second for "about vehicles", the third for "about food":

```text run title="Example"
CREATE (:Doc {title: 'Cats and dogs',      @embedding: [0.9, 0.1, 0.1]}),
       (:Doc {title: 'Wolves in winter',   @embedding: [0.8, 0.2, 0.0]}),
       (:Doc {title: 'Electric cars',      @embedding: [0.1, 0.9, 0.1]}),
       (:Doc {title: 'Trains of Europe',   @embedding: [0.0, 0.8, 0.3]}),
       (:Doc {title: 'Bread at home',      @embedding: [0.1, 0.0, 0.9]}),
       (:Doc {title: 'Feeding a puppy',    @embedding: [0.6, 0.0, 0.6]});
```

```text result title="Result"
6 nodes created
```

## Find the nearest nodes

`db.searchVector(vector, limit)` yields the nearest nodes and their similarity, from 1 (the same direction) down:

```text run title="Example"
CALL db.searchVector([1.0, 0.0, 0.0], 3) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title       | score
------------------+-------
 Cats and dogs    | 0.988
 Wolves in winter | 0.97
 Feeding a puppy  | 0.707
(3 rows)
```

A query vector "about vehicles":

```text run title="Example"
CALL db.searchVector([0.0, 1.0, 0.1], 2) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title       | score
------------------+-------
 Electric cars    | 0.994
 Trains of Europe | 0.967
(2 rows)
```

## Similar to a node

`db.similar(node, limit)` uses a node's own vector and leaves the node out:

```text run title="Example"
MATCH (d:Doc {title: 'Feeding a puppy'})
CALL db.similar(d, 3) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title       | score
------------------+-------
 Bread at home    | 0.781
 Cats and dogs    | 0.776
 Wolves in winter | 0.686
(3 rows)
```

## Read and change a vector

The node's embedding is kept **normalized** (scaled to length 1), since cosine similarity only looks at the direction. Reading it back gives the same direction, not the same numbers:

```text run title="Example"
MATCH (d:Doc {title: 'Bread at home'}) RETURN [x IN d.@embedding | round(x, 3)] AS embedding;
```

```text result title="Result"
 embedding
--------------------
 [0.11, 0.0, 0.994]
(1 row)
```

```text run title="Example"
MATCH (d:Doc {title: 'Bread at home'}) SET d.@embedding = [0.2, 0.0, 0.8];
MATCH (d:Doc {title: 'Bread at home'}) RETURN [x IN d.@embedding | round(x, 3)] AS embedding;
```

```text result title="Result"
1 property set
 embedding
--------------------
 [0.243, 0.0, 0.97]
(1 row)
```

If you need the numbers exactly as given, use a [vector index](vector-indexes.md): it reads vectors from a property, and the property keeps what you wrote.

`SET d.@embedding = null` removes it.

## Compare two vectors

`algo.cosine(a, b)` compares any two lists of numbers:

```text run title="Example"
MATCH (a:Doc {title: 'Cats and dogs'}), (b:Doc)
WHERE a <> b
RETURN b.title, round(algo.cosine(a.@embedding, b.@embedding), 3) AS cosine
ORDER BY cosine DESC LIMIT 3;
```

```text result title="Result"
 b.title          | cosine
------------------+--------
 Wolves in winter | 0.985
 Feeding a puppy  | 0.776
 Bread at home    | 0.346
(3 rows)
```

## Search, then use the graph

The search yields nodes, so the query goes on from them. Here each document's neighbors in meaning, then a filter:

```text run title="Example"
CALL db.searchVector([0.7, 0.1, 0.4], 5) YIELD node, score
WHERE score > 0.8
RETURN node.title, round(score, 3) AS score;
```

```text result title="Result"
 node.title       | score
------------------+-------
 Feeding a puppy  | 0.957
 Cats and dogs    | 0.919
 Wolves in winter | 0.866
(3 rows)
```

## One dimension per namespace

The first `@embedding` fixes the namespace's dimension. A vector of another length is refused:

```text run title="Example"
CALL db.stats() YIELD vectors, dimension;
CREATE (:Doc {title: 'Wrong size', @embedding: [0.1, 0.2]});
```

```text result title="Result"
 vectors | dimension
---------+-----------
 6       | 3
(1 row)
error: invalid input: namespace "demo" stores vectors of dimension 3, got 2
```

To keep vectors of several models or sizes in one namespace, use [vector indexes](vector-indexes.md).

:::tip Good to know
- Cosine similarity ignores length: `[1, 0, 0]` and `[5, 0, 0]` are the same direction.
- Writes keep the vector index up to date in the same transaction.
- `algo.knn` finds the nearest neighbors of every node at once, see [Similarity algorithms](../algorithms/similarity.md).
:::
