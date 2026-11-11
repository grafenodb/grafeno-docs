---
title: MATCH
description: Find nodes and edges by the shape they form, with labels, properties, directions and optional parts.
---

# MATCH

`MATCH` finds the parts of the graph that fit a pattern. Each match becomes a **row**, and the variables of the pattern hold what was found.

## Syntax

```text
MATCH pattern [, pattern …]
[WHERE condition]
RETURN …
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

## Nodes with a label

```text run title="Example"
MATCH (c:Company) RETURN c.name, c.sector;
```

```text result title="Result"
 c.name | c.sector
--------+----------
 Acme   | robotics
 Orbit  | software
(2 rows)
```

## Nodes with property values

Properties written in the pattern must be equal:

```text run title="Example"
MATCH (p:Person {city: 'Lima'}) RETURN p.name, p.age;
```

```text result title="Result"
 p.name | p.age
--------+-------
 Ana    | 34
 Carla  | 45
(2 rows)
```

## Follow an edge

An arrow follows edges in their direction. Each row is one `works_at` edge with its two ends:

```text run title="Example"
MATCH (p:Person)-[w:works_at]->(c:Company)
RETURN p.name, w.since, c.name
ORDER BY w.since;
```

```text result title="Result"
 p.name | w.since | c.name
--------+---------+--------
 Carla  | 2015    | Acme
 Ana    | 2019    | Acme
 Diego  | 2020    | Orbit
 Bruno  | 2022    | Orbit
(4 rows)
```

## Directions

| Pattern | Matches |
| --- | --- |
| `(a)-[:knows]->(b)` | edges from `a` to `b` |
| `(a)<-[:knows]-(b)` | edges from `b` to `a` |
| `(a)-[:knows]-(b)` | edges either way |

Who knows Diego? The arrow points at him:

```text run title="Example"
MATCH (p:Person)-[:knows]->(d:Person {name: 'Diego'}) RETURN p.name;
```

```text result title="Result"
 p.name
--------
 Bruno
 Carla
(2 rows)
```

Everyone connected to Diego by `knows`, in either direction:

```text run title="Example"
MATCH (d:Person {name: 'Diego'})-[:knows]-(p) RETURN p.name ORDER BY p.name;
```

```text result title="Result"
 p.name
--------
 Bruno
 Carla
 Eva
(3 rows)
```

## Any edge label, or several

Leave the label out to follow any edge, or list several with `|`:

```text run title="Example"
MATCH (:Person {name: 'Ana'})-[r]->(x) RETURN type(r), x.name ORDER BY x.name;
```

```text result title="Result"
 type(r)  | x.name
----------+--------
 works_at | Acme
 knows    | Bruno
 knows    | Carla
(3 rows)
```

```text run title="Example"
MATCH (:Person {name: 'Bruno'})-[r:knows|works_at]->(x) RETURN type(r), x.name;
```

```text result title="Result"
 type(r)  | x.name
----------+--------
 knows    | Diego
 works_at | Orbit
(2 rows)
```

## Chains

Patterns chain: the friends of Ana's friends, and where they work:

```text run title="Example"
MATCH (:Person {name: 'Ana'})-[:knows]->(f)-[:knows]->(ff)-[:works_at]->(c)
RETURN f.name, ff.name, c.name;
```

```text result title="Result"
 f.name | ff.name | c.name
--------+---------+--------
 Bruno  | Diego   | Orbit
 Carla  | Diego   | Orbit
(2 rows)
```

## Several patterns

Separate patterns with commas. When they share a variable they are joined through it. Here, people who work at the same company as someone they know:

```text run title="Example"
MATCH (a:Person)-[:knows]->(b:Person),
      (a)-[:works_at]->(c:Company)<-[:works_at]-(b)
RETURN a.name, b.name, c.name;
```

```text result title="Result"
 a.name | b.name | c.name
--------+--------+--------
 Ana    | Carla  | Acme
 Bruno  | Diego  | Orbit
(2 rows)
```

## OPTIONAL MATCH

`OPTIONAL MATCH` keeps the row even when its pattern finds nothing; its variables are then `null`. Eva works nowhere, and still appears:

```text run title="Example"
MATCH (p:Person)
OPTIONAL MATCH (p)-[:works_at]->(c)
RETURN p.name, c.name
ORDER BY p.name;
```

```text result title="Result"
 p.name | c.name
--------+--------
 Ana    | Acme
 Bruno  | Orbit
 Carla  | Acme
 Diego  | Orbit
 Eva    | null
(5 rows)
```

## Find a node by its id

`{@id: '…'}` in a pattern is a direct lookup, the fastest way to reach a node you already know. Here the id comes from an earlier clause:

```text run title="Example"
MATCH (a:Person {name: 'Ana'})
WITH a.@id AS id
MATCH (p {@id: id})
RETURN p.name;
```

```text result title="Result"
 p.name
--------
 Ana
(1 row)
```

:::tip Good to know
- A pattern uses each edge at most once in a match.
- Several `MATCH` clauses can follow each other; each one extends the rows of the previous one.
- To filter with anything other than equality, use [WHERE](where.md).
:::
