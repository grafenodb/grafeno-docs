---
title: Graph algorithms
description: Run graph algorithms with CALL algo.*, choose what part of the graph they see, store or summarize their results, and find the right algorithm for a question.
---

# Graph algorithms

Graph algorithms answer questions about the **shape** of the graph: the cheapest route, who is most central, which groups form, what would break if a node failed, how something spreads. Grafeno has 40 of them, run with `CALL algo.<name>(…)` inside any GQ query.

## Syntax

```text
CALL algo.name([arguments,] {settings})
YIELD column, …
[WHERE …]
RETURN …
```

## A first example

```text run title="Example"
CREATE (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}), (c:Person {name: 'Carla'}),
       (d:Person {name: 'Diego'}), (e:Person {name: 'Eva'}),
       (a)-[:follows]->(b), (c)-[:follows]->(b), (d)-[:follows]->(b),
       (b)-[:follows]->(e), (e)-[:follows]->(b), (a)-[:follows]->(c);
```

```text result title="Result"
5 nodes created, 6 edges created
```

Who is most followed, directly or through others? PageRank:

```text run title="Example"
CALL algo.pageRank() YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 node.name | score
-----------+-------
 Bruno     | 0.462
 Eva       | 0.436
 Carla     | 0.043
 Ana       | 0.03
 Diego     | 0.03
(5 rows)
```

The rows are ordinary rows: sort them, filter them, join them with patterns.

## Choose the part of the graph

Every algorithm runs on a **projection**: an in-memory copy of the graph's structure. These settings choose what it holds:

| Setting | Default | Keeps |
| --- | --- | --- |
| `labels` | every node | nodes with these labels (a string or a list) |
| `edgeLabels` | every edge | edges with these labels |
| `weight` | none (each edge weighs 1) | the edge property used as weight, cost or capacity |
| `direction` | per algorithm | `'out'`, `'in'` or `'both'` |
| `validAt`, `knownAt` | now | facts true at a time, or known at a time, as in [Time travel](../gq/time-travel.md) |

```text run title="Example"
CALL algo.pageRank({labels: 'Person', edgeLabels: 'follows', iterations: 40}) YIELD node, score
RETURN node.name, round(score, 3) AS score LIMIT 2;
```

```text result title="Result"
 node.name | score
-----------+-------
 Bruno     | 0.469
 Eva       | 0.429
(2 rows)
```

A setting the algorithm does not know is an error, so a typo does not pass unnoticed:

```text run title="Example"
CALL algo.pageRank({iteration: 40}) YIELD node, score RETURN count(*);
```

```text result title="Result"
error: algo.pageRank() has no setting iteration (it takes damping, direction, edgeLabels, iterations, knownAt, labels, mode, sources, tolerance, top, validAt, weight, write)
```

Node arguments (a source, a target) are nodes from a `MATCH`, or their ids as strings.

## Modes: stats and write

Two settings work for every algorithm. `mode: 'stats'` summarizes the result instead of streaming it:

```text run title="Example"
CALL algo.pageRank({mode: 'stats'});
```

```text result title="Result"
 column | count | min                 | max                 | mean               | sum
--------+-------+---------------------+---------------------+--------------------+--------------------
 rows   | 5     | null                | null                | null               | null
 score  | 5     | 0.03000000000000001 | 0.46166041050338674 | 0.2000000000000001 | 1.0000000000000004
(2 rows)
```

`write: 'property'` stores the result in each node and yields how many were written:

```text run title="Example"
CALL algo.pageRank({write: 'rank'});
MATCH (p:Person) RETURN p.name, round(p.rank, 3) AS rank ORDER BY rank DESC LIMIT 3;
```

```text result title="Result"
 property | column | nodes
----------+--------+-------
 rank     | score  | 5
(1 row)
5 properties set
 p.name | rank
--------+-------
 Bruno  | 0.462
 Eva    | 0.436
 Carla  | 0.043
(3 rows)
```

An algorithm with several columns writes several properties with a map: `write: {hub: 'hub', authority: 'auth'}`. `mode` and `write` must be written in the statement, not passed as parameters, so whether the statement writes is known before it runs.

Without `write`, `SET` stores what you choose:

```text run title="Example"
CALL algo.degree() YIELD node, score SET node.degree = score;
MATCH (p:Person) RETURN p.name, p.degree ORDER BY p.degree DESC, p.name;
```

```text result title="Result"
5 properties set
 p.name | p.degree
--------+----------
 Bruno  | 5.0
 Ana    | 2.0
 Carla  | 2.0
 Eva    | 2.0
 Diego  | 1.0
(5 rows)
```

## Which algorithm?

| You want to know | Use | Page |
| --- | --- | --- |
| the cheapest or shortest route | `shortestPath`, `astar`, `kShortestPaths`, `allShortestPaths`, `distances` | [Paths](paths.md) |
| who matters most | `degree`, `pageRank`, `betweenness`, `closeness`, `harmonic`, `eigenvector`, `hits` | [Centrality](centrality.md) |
| which groups form | `wcc`, `scc`, `labelPropagation`, `louvain`, `leiden`, `kCore`, `triangles`, `clustering`, `conductance` | [Communities](communities.md) |
| who is alike, what link is missing | `nodeSimilarity`, `knn`, `linkPrediction`, pair functions | [Similarity](similarity.md) |
| what would break, in what order | `articulationPoints`, `bridges`, `spanningTree`, `topologicalOrder`, `cycle` | [Structure](structure.md) |
| how much can flow, who pairs with whom | `maxFlow`, `minCostFlow`, `bipartiteMatching`, `assignment` | [Flows and matching](flows.md) |
| sequences and features for learning | `randomWalks`, `fastRP` | [Walks and embeddings](walks-embeddings.md) |
| how things move and spread | `distanceField`, `influence`, `floodFill`, `diffusion`, `automaton` | [Simulation](simulation.md) |

## Over HTTP

`POST /v1/{ns}/algo/{name}` runs one. The body holds the arguments before the settings (`args`, nodes by id), the `settings`, and either `stats: true` or `write` (with `column`):

```bash
curl -s -X POST http://127.0.0.1:7810/v1/demo/algo/pageRank -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"settings": {"labels": "Person"}, "stats": true}'
```

The TypeScript client has `ns.algorithm(name, options)`.

:::tip Good to know
- The projection is cached until the next write changes the data, so several algorithms on the same part of the graph build it once.
- Algorithms run within the query's limits (time, memory) and see only what the caller may read.
- `top: n` on the centrality algorithms keeps the best `n` rows: on a large graph, it saves reading every node.
- `EXPLAIN` estimates an algorithm's cost before it runs.
:::
