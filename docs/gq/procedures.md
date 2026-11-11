---
title: Procedures
description: Call built-in procedures with CALL and YIELD to list labels, properties and indexes, count a namespace, search and explore.
---

# Procedures

A procedure is a built-in operation that yields rows. `CALL` runs it; `YIELD` picks and renames its columns; the query goes on from them like from a `MATCH`.

## Syntax

```text
CALL procedure(arguments) [YIELD column [AS name], … [WHERE condition]]
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

## What is in a namespace

```text run title="Example"
CALL db.labels();
```

```text result title="Result"
 label   | count
---------+-------
 Company | 2
 Person  | 5
(2 rows)
```

```text run title="Example"
CALL db.edgeLabels();
```

```text result title="Result"
 label    | count
----------+-------
 knows    | 5
 works_at | 4
(2 rows)
```

```text run title="Example"
CALL db.propertyKeys() YIELD key RETURN key ORDER BY key;
```

```text result title="Result"
 key
--------
 age
 city
 name
 sector
 since
(5 rows)
```

```text run title="Example"
CALL db.stats();
```

```text result title="Result"
 nodes | edges | texts | vectors | dimension
-------+-------+-------+---------+-----------
 7     | 9     | 0     | 0       | null
(1 row)
```

## YIELD, rename and filter

```text run title="Example"
CALL db.labels() YIELD label, count AS nodes WHERE nodes > 2 RETURN label, nodes;
```

```text result title="Result"
 label  | nodes
--------+-------
 Person | 5
(1 row)
```

## Planner statistics

`db.analyze()` rebuilds the statistics the planner uses to choose where a pattern starts, and lists them:

```text run title="Example"
CREATE INDEX FOR (p:Person) ON (p.city);
CALL db.analyze() YIELD kind, name, count, distinct RETURN kind, name, count, distinct;
```

```text result title="Result"
 name        | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_city | Person | city     | false  | 5       | false | nodes | false | value | online
(1 row)
 kind  | name        | count | distinct
-------+-------------+-------+----------
 index | Person_city | 5     | 3
 edge  | knows       | 5     | null
 edge  | works_at    | 4     | null
(3 rows)
```

## All procedures

`dbms.procedures()` lists every procedure with its arguments and columns; here the first few of the `db` family:

```text run title="Example"
CALL dbms.procedures() YIELD name, arguments
WHERE name STARTS WITH 'db.'
RETURN name, arguments ORDER BY name LIMIT 6;
```

```text result title="Result"
 name          | arguments
---------------+-------------------------------
 db.analyze    |
 db.audit      | since = 0, limit = 1000
 db.edgeLabels |
 db.indexes    |
 db.labels     |
 db.match      | label, properties, limit = 10
(6 rows)
```

## The procedures

| Procedure | Yields | |
| --- | --- | --- |
| `db.labels()` | `label`, `count` | node labels and their counts |
| `db.edgeLabels()` | `label`, `count` | edge labels and their counts |
| `db.propertyKeys()` | `key` | property names in use |
| `db.stats()` | `nodes`, `edges`, `texts`, `vectors`, `dimension` | counts of the namespace |
| `db.indexes()` | index rows | the same as `SHOW INDEXES` |
| `db.analyze()` | statistics | rebuilds and lists the planner's statistics |
| `db.search(text, …)` | `node`, `score` | text, vector or hybrid search: [Full-text search](full-text.md), [Hybrid search](../vectors/hybrid-search.md) |
| `db.searchIndex(index, query, …)` | `node`, `score`, `fragments` | a full-text index |
| `db.searchFuzzy(label, key, text, …)` | `node`, `score` | look-alike text: [Similar text](similar-text.md) |
| `db.match(label, properties, …)` | `node`, `score`, `decision`, `fields` | records that may be the same entity |
| `db.searchVector(vector, …)`, `db.searchVectors`, `db.similar` | `node`, `score` | nearest vectors: [Vectors](../vectors/index.md) |
| `temporal.series(start, end, step)` | `at` | one time per step: [Dates](dates.md#a-series-of-times) |
| `algo.*` | per algorithm | graph algorithms: [Graph algorithms](../algorithms/index.md) |
| `dbms.procedures()` | `name`, `arguments`, `columns`, `description` | this list |

## CALL in the middle of a query

Arguments can use the row's variables, so a `CALL` after a `MATCH` runs once per row:

```text run title="Example"
MATCH (c:Company)
CALL temporal.series('2024-01-01', '2024-03-01', 'P1M') YIELD at
RETURN c.name, count(at) AS months;
```

```text result title="Result"
 c.name | months
--------+--------
 Acme   | 3
 Orbit  | 3
(2 rows)
```
