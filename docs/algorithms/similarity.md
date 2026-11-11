---
title: Similarity and link prediction
description: Find similar nodes by shared neighbors with nodeSimilarity, by embedding with knn, predict missing edges with linkPrediction, and score pairs with neighbor functions.
---

# Similarity and link prediction

Two nodes are alike when they connect to the same things, or when their embeddings point the same way. These algorithms find such pairs, and predict the edges that are likely missing.

| Algorithm | Compares by |
| --- | --- |
| `algo.nodeSimilarity` | shared neighbors (Jaccard, overlap or cosine) |
| `algo.knn` | embeddings (cosine), from the vector index |
| `algo.linkPrediction(node)` | neighbors of neighbors: who `node` is likely to link to next |
| `algo.jaccard(a, b)` and other functions | one pair at a time, inside any expression |

## The example data

People and the topics they like:

```text run title="Example"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}), (carla:Person {name: 'Carla'}),
       (diego:Person {name: 'Diego'}),
       (graphs:Topic {name: 'graphs'}), (rust:Topic {name: 'rust'}), (search:Topic {name: 'search'}),
       (cooking:Topic {name: 'cooking'}), (hiking:Topic {name: 'hiking'}),
       (ana)-[:likes]->(graphs), (ana)-[:likes]->(rust), (ana)-[:likes]->(search),
       (bruno)-[:likes]->(graphs), (bruno)-[:likes]->(rust),
       (carla)-[:likes]->(cooking), (carla)-[:likes]->(hiking), (carla)-[:likes]->(search),
       (diego)-[:likes]->(hiking), (diego)-[:likes]->(cooking);
```

```text result title="Result"
9 nodes created, 10 edges created
```

## algo.nodeSimilarity

For each node, the nodes that share the most neighbors with it. With `direction: 'out'` (default), "neighbors" are what a person likes, so people who like the same things are similar.

**Syntax:** `algo.nodeSimilarity({metric: 'jaccard' | 'overlap' | 'cosine', topK: 10, cutoff: 0, node, direction: 'out', …})` yields `node`, `other`, `score`.

```text run title="Example"
CALL algo.nodeSimilarity({labels: ['Person', 'Topic']}) YIELD node, other, score
WHERE node.name < other.name
RETURN node.name, other.name, round(score, 3) AS jaccard ORDER BY jaccard DESC;
```

```text result title="Result"
 node.name | other.name | jaccard
-----------+------------+---------
 Ana       | Bruno      | 0.667
 Carla     | Diego      | 0.667
 Ana       | Carla      | 0.2
(3 rows)
```

Jaccard is shared neighbors over all neighbors of both: Ana and Bruno share 2 of 3 topics.

| `metric` | Score |
| --- | --- |
| `jaccard` (default) | shared / all of both |
| `overlap` | shared / the smaller set: 1 when one's likes are inside the other's |
| `cosine` | shared / √(size × size) |

One node only, with `node`:

```text run title="Example"
MATCH (b:Person {name: 'Bruno'})
CALL algo.nodeSimilarity({labels: ['Person', 'Topic'], node: b, metric: 'overlap'}) YIELD other, score
RETURN other.name, round(score, 3) AS overlap;
```

```text result title="Result"
 other.name | overlap
------------+---------
 Ana        | 1.0
(1 row)
```

**Use it for:** "people who like this also like", similar customers, duplicate records that link to the same things.

## algo.linkPrediction

For one node, the nodes two hops away that it is most likely to link to, scored by how they are connected. Edges count in both directions.

**Syntax:** `algo.linkPrediction(node, {metric: 'adamicAdar', limit: 10, …})` yields `other`, `score`.

Who should Bruno meet? People two hops away, through the topics they share:

```text run title="Example"
MATCH (b:Person {name: 'Bruno'})
CALL algo.linkPrediction(b, {labels: ['Person', 'Topic']}) YIELD other, score
RETURN other.name, round(score, 3) AS score;
```

```text result title="Result"
 other.name | score
------------+-------
 Ana        | 2.885
(1 row)
```

| `metric` | Counts |
| --- | --- |
| `adamicAdar` (default) | shared neighbors, each weighted by 1 / log(its degree): a rare shared interest counts more |
| `resourceAllocation` | shared neighbors weighted by 1 / degree |
| `commonNeighbors` | shared neighbors |
| `jaccard` | shared / all neighbors of both |
| `preferentialAttachment` | degree × degree: busy nodes link to busy nodes |
| `totalNeighbors` | all neighbors of both |

**Use it for:** recommending connections, finding facts that are probably missing from a knowledge graph.

## Pair functions

The same measures as functions, for one pair, anywhere in a query:

```text run title="Example"
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}), (c:Person {name: 'Carla'})
RETURN algo.commonNeighbors(a, b) AS common_ab, round(algo.jaccard(a, b), 3) AS jaccard_ab,
       round(algo.adamicAdar(a, c), 3) AS adamic_ac, algo.preferentialAttachment(a, c) AS pref_ac;
```

```text result title="Result"
 common_ab | jaccard_ab | adamic_ac | pref_ac
-----------+------------+-----------+---------
 2.0       | 0.667      | 1.443     | 9.0
(1 row)
```

| Function | |
| --- | --- |
| `algo.commonNeighbors(a, b)` | shared neighbors |
| `algo.adamicAdar(a, b)` | shared neighbors weighted by 1 / log(degree) |
| `algo.resourceAllocation(a, b)` | shared neighbors weighted by 1 / degree |
| `algo.preferentialAttachment(a, b)` | degree × degree |
| `algo.totalNeighbors(a, b)` | neighbors of either |
| `algo.jaccard(a, b)`, `algo.overlap(a, b)` | shared over all, shared over the smaller |
| `algo.cosine(list, list)` | the cosine of two vectors |

## algo.knn

The nearest neighbors of every node **by embedding**, from the vector index (cosine).

**Syntax:** `algo.knn({topK: 10, cutoff: 0, node, labels})` yields `node`, `other`, `score`.

Give the topics embeddings (3 dimensions here: technical, outdoors, home):

```text run title="Example"
MATCH (t:Topic {name: 'graphs'})  SET t.@embedding = [0.9, 0.0, 0.1];
MATCH (t:Topic {name: 'rust'})    SET t.@embedding = [1.0, 0.1, 0.0];
MATCH (t:Topic {name: 'search'})  SET t.@embedding = [0.8, 0.0, 0.3];
MATCH (t:Topic {name: 'cooking'}) SET t.@embedding = [0.0, 0.2, 0.9];
MATCH (t:Topic {name: 'hiking'})  SET t.@embedding = [0.0, 1.0, 0.2];
CALL algo.knn({topK: 1}) YIELD node, other, score
RETURN node.name, other.name AS nearest, round(score, 3) AS score ORDER BY node.name;
```

```text result title="Result"
1 property set
1 property set
1 property set
1 property set
1 property set
 node.name | nearest | score
-----------+---------+-------
 cooking   | hiking  | 0.404
 graphs    | rust    | 0.989
 hiking    | cooking | 0.404
 rust      | graphs  | 0.989
 search    | graphs  | 0.969
(5 rows)
```

`cutoff` drops pairs below a score; `node` limits it to one node.

**Use it for:** a similarity graph from embeddings (then communities on it), deduplication by meaning.

:::tip Write a similarity graph
Turn pairs into edges, then run other algorithms on them:

```text
CALL algo.nodeSimilarity({labels: ['Person', 'Topic'], cutoff: 0.3}) YIELD node, other, score
WHERE node.name < other.name
CREATE (node)-[:similar {score: score}]->(other);
```
:::
