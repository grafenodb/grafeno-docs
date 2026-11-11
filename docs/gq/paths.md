---
title: Paths
description: Follow edges several hops at once, keep whole paths, and find shortest paths between nodes.
---

# Paths

A pattern can follow a chain of edges of any length, keep the whole path in a variable, and find the shortest way between two nodes.

## Syntax

```text
(a)-[:LABEL*1..3]->(b)                       // 1 to 3 hops
p = (a)-[:LABEL*]->(b)                       // keep the path in p
p = shortestPath((a)-[:LABEL*]-(b))          // the shortest one
```

## The example data

```text run title="Example"
CREATE (ana:Person {name: 'Ana', age: 34, city: 'Lima'}),
       (bruno:Person {name: 'Bruno', age: 28, city: 'Quito'}),
       (carla:Person {name: 'Carla', age: 45, city: 'Lima'}),
       (diego:Person {name: 'Diego', age: 39, city: 'Bogotá'}),
       (eva:Person {name: 'Eva', age: 23, city: 'Quito'}),
       (acme:Company {name: 'Acme', sector: 'robotics'}),
       (orbit:Company {name: 'Orbit', sector: 'software'}),
       (ana)-[:works_at {since: 2019}]->(acme),
       (carla)-[:works_at {since: 2015}]->(acme),
       (bruno)-[:works_at {since: 2022}]->(orbit),
       (diego)-[:works_at {since: 2020}]->(orbit),
       (ana)-[:knows]->(bruno), (ana)-[:knows]->(carla),
       (bruno)-[:knows]->(diego), (carla)-[:knows]->(diego),
       (diego)-[:knows]->(eva);
```

```text result title="Result"
7 nodes created, 9 edges created
```

## Several hops

| Pattern | Hops |
| --- | --- |
| `-[:knows*2]->` | exactly 2 |
| `-[:knows*1..3]->` | 1 to 3 |
| `-[:knows*..3]->` | up to 3 |
| `-[:knows*]->` | 1 to 32 |

Everyone Ana reaches through `knows`, up to three hops away:

```text run title="Example"
MATCH (:Person {name: 'Ana'})-[:knows*1..3]->(p)
RETURN p.name ORDER BY p.name;
```

```text result title="Result"
 p.name
--------
 Bruno
 Carla
 Diego
 Eva
(4 rows)
```

Exactly two hops away:

```text run title="Example"
MATCH (:Person {name: 'Ana'})-[:knows*2]->(p) RETURN p.name;
```

```text result title="Result"
 p.name
--------
 Diego
(1 row)
```

## Each end once, at its shortest distance

A variable-length pattern reaches each end node **once**, by its shortest way. Diego can be reached through Bruno or through Carla, and appears once:

```text run title="Example"
MATCH (:Person {name: 'Ana'})-[:knows*]->(p)
RETURN p.name, count(*) AS times ORDER BY p.name;
```

```text result title="Result"
 p.name | times
--------+-------
 Bruno  | 1
 Carla  | 1
 Diego  | 1
 Eva    | 1
(4 rows)
```

## Keep the path

`p = …` binds the whole path. `nodes(p)`, `relationships(p)` and `length(p)` take it apart:

```text run title="Example"
MATCH p = (:Person {name: 'Ana'})-[:knows*]->(:Person {name: 'Eva'})
RETURN [n IN nodes(p) | n.name] AS route, length(p) AS hops;
```

```text result title="Result"
 route                    | hops
--------------------------+------
 [Ana, Bruno, Diego, Eva] | 3
(1 row)
```

## shortestPath

The shortest path between two nodes, here following `knows` in either direction:

```text run title="Example"
MATCH (e:Person {name: 'Eva'}), (c:Person {name: 'Carla'})
MATCH p = shortestPath((e)-[:knows*]-(c))
RETURN [n IN nodes(p) | n.name] AS route, length(p) AS hops;
```

```text result title="Result"
 route               | hops
---------------------+------
 [Eva, Diego, Carla] | 2
(1 row)
```

`allShortestPaths` is accepted too and, like every variable-length pattern in GQ, gives one shortest path per end node. To list **every** path of the cheapest length between two nodes, or the k cheapest ones, use [`algo.allShortestPaths` and `algo.kShortestPaths`](../algorithms/paths.md).

## Mixing labels

A path may follow several labels: the companies Ana reaches in up to two hops, at her own company or through someone she knows:

```text run title="Example"
MATCH p = (:Person {name: 'Ana'})-[:knows|works_at*1..2]->(x:Company)
RETURN x.name, [n IN nodes(p) | n.name] AS route;
```

```text result title="Result"
 x.name | route
--------+---------------------
 Acme   | [Ana, Acme]
 Orbit  | [Ana, Bruno, Orbit]
(2 rows)
```

:::tip Weighted paths
`shortestPath` counts hops. To find the cheapest route by a property such as distance or cost, use [`algo.shortestPath`](../algorithms/paths.md) with `weight`.
:::
