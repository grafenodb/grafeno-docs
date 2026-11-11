---
title: Walks and embeddings
description: Generate reproducible random walks with algo.randomWalks, and structural node embeddings with algo.fastRP to compare and group nodes by their position in the graph.
---

# Walks and embeddings

Two algorithms turn the graph into material for statistics and machine learning: sequences of nodes (walks), and vectors that describe each node's position (embeddings).

| Algorithm | Gives |
| --- | --- |
| `algo.randomWalks(starts)` | walks from nodes, each step chosen by edge weight |
| `algo.fastRP()` | a vector per node: nodes in similar positions get similar vectors |

## The example data

Two small groups of people, joined by one friendship:

```text run title="Example"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}), (carla:Person {name: 'Carla'}),
       (diego:Person {name: 'Diego'}), (eva:Person {name: 'Eva'}), (fabio:Person {name: 'Fabio'}),
       (ana)-[:knows {strength: 3}]->(bruno), (bruno)-[:knows {strength: 1}]->(carla),
       (carla)-[:knows {strength: 2}]->(ana), (carla)-[:knows {strength: 1}]->(diego),
       (diego)-[:knows {strength: 2}]->(eva), (eva)-[:knows {strength: 2}]->(fabio),
       (fabio)-[:knows {strength: 1}]->(diego);
```

```text result title="Result"
6 nodes created, 7 edges created
```

## algo.randomWalks

From each start, `walks` walks of up to `length` steps. Each step goes to a neighbor chosen at random, more often along heavier edges when `weight` is given. The same `seed` gives the same walks.

**Syntax:** `algo.randomWalks(starts | null, {length: 10, walks: 1, seed: 42, direction, weight, …})` yields `start`, `walk`.

Three walks of five steps from Ana, following friendships both ways:

```text run title="Example"
MATCH (a:Person {name: 'Ana'})
CALL algo.randomWalks(a, {length: 5, walks: 3, direction: 'both'}) YIELD walk
RETURN [n IN walk | n.name] AS walk;
```

```text result title="Result"
 walk
------------------------------------------
 [Ana, Carla, Ana, Bruno, Carla, Ana]
 [Ana, Carla, Ana, Carla, Diego, Carla]
 [Ana, Bruno, Carla, Diego, Carla, Diego]
(3 rows)
```

With `weight`, strong friendships are followed more often:

```text run title="Example"
MATCH (a:Person {name: 'Ana'})
CALL algo.randomWalks(a, {length: 5, walks: 3, direction: 'both', weight: 'strength', seed: 7}) YIELD walk
RETURN [n IN walk | n.name] AS walk;
```

```text result title="Result"
 walk
----------------------------------------
 [Ana, Bruno, Carla, Bruno, Ana, Bruno]
 [Ana, Bruno, Ana, Bruno, Carla, Ana]
 [Ana, Bruno, Ana, Carla, Bruno, Ana]
(3 rows)
```

`null` starts from every node:

```text run title="Example"
CALL algo.randomWalks(null, {length: 3, direction: 'both'}) YIELD start, walk
RETURN start.name, [n IN walk | n.name] AS walk ORDER BY start.name;
```

```text result title="Result"
 start.name | walk
------------+----------------------------
 Ana        | [Ana, Carla, Ana, Bruno]
 Bruno      | [Bruno, Carla, Ana, Carla]
 Carla      | [Carla, Ana, Carla, Diego]
 Diego      | [Diego, Carla, Ana, Bruno]
 Eva        | [Eva, Diego, Carla, Diego]
 Fabio      | [Fabio, Diego, Eva, Fabio]
(6 rows)
```

**Use it for:** sampling a large graph, training sequence models on graph structure, estimating how often a walk reaches a place (a cheap stand-in for visit probabilities).

## algo.fastRP

Fast random projection: each node gets a vector built from random vectors of its neighbors, neighbors of neighbors, and so on. Nodes in similar positions, with similar surroundings, get similar vectors. No training. Each node's random vector comes from the `seed` and the node's id, so the same graph gives the same vectors every time; a graph created again (with new ids) gets different numbers, and similarities between nodes that are close but not identical.

**Syntax:** `algo.fastRP({dimension: 128, iterationWeights: [0, 1, 1], selfInfluence: 0, normalizationStrength: 0, seed: 42, …})` yields `node`, `embedding`.

```text run title="Example"
CALL algo.fastRP({dimension: 8, direction: 'both'}) YIELD node, embedding
RETURN node.name, [x IN embedding | round(x, 2)] AS embedding ORDER BY node.name;
```

```text result title="Result"
 node.name | embedding
-----------+-----------------------------------------------------
 Ana       | [0.43, -0.27, 0.4, -0.27, -0.2, 0.43, -0.32, 0.43]
 Bruno     | [0.4, -0.26, 0.45, -0.26, -0.19, 0.4, -0.38, 0.4]
 Carla     | [0.43, -0.33, 0.41, -0.32, -0.11, 0.43, -0.2, 0.43]
 Diego     | [0.19, -0.6, 0.37, -0.6, -0.11, 0.19, 0.12, 0.19]
 Eva       | [0.16, -0.64, 0.31, -0.58, 0.01, 0.16, 0.28, 0.16]
 Fabio     | [0.16, -0.58, 0.37, -0.63, -0.04, 0.16, 0.22, 0.16]
(6 rows)
```

Compare the vectors: people in the same group are closer to each other than to the other group:

```text run title="Example"
CALL algo.fastRP({dimension: 64, direction: 'both'}) YIELD node, embedding
WITH collect({name: node.name, v: embedding}) AS all
UNWIND all AS a
UNWIND all AS b
WITH a, b WHERE a.name < b.name
RETURN a.name, b.name, round(algo.cosine(a.v, b.v), 2) AS similarity
ORDER BY similarity DESC LIMIT 5;
```

```text result title="Result"
 a.name | b.name | similarity
--------+--------+------------
 Ana    | Bruno  | 0.99
 Eva    | Fabio  | 0.99
 Ana    | Carla  | 0.97
 Bruno  | Carla  | 0.97
 Diego  | Fabio  | 0.97
(5 rows)
```

### Store the vectors and search them

Write them as each node's embedding, then use [vector search](../vectors/index.md) on structure:

```text run title="Example"
CALL algo.fastRP({dimension: 16, direction: 'both', write: '@embedding'});
MATCH (a:Person {name: 'Ana'})
CALL db.similar(a, 2) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 property   | column    | nodes
------------+-----------+-------
 @embedding | embedding | 6
(1 row)
6 properties set
 node.name | score
-----------+-------
 Bruno     | 0.987
 Carla     | 0.966
(2 rows)
```

| Setting | Default | Effect |
| --- | --- | --- |
| `dimension` | 128 | length of the vectors |
| `iterationWeights` | `[0, 1, 1]` | how much each hop counts: the node itself, its neighbors, theirs… |
| `selfInfluence` | 0 | weight of the node's own random vector |
| `normalizationStrength` | 0 | negative values favor low-degree neighbors, positive high-degree ones |
| `seed` | 42 | the random vectors, together with each node's id |

**Use it for:** features for classifiers, similar nodes by position (roles, not just neighbors), grouping with [knn](similarity.md#algoknn) and [Louvain](communities.md#algolouvain).
