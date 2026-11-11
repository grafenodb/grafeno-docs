---
title: EXPLAIN, PROFILE and TRACE
description: See the plan of a statement, measure each step, and record how a statement walks the graph, event by event.
---

# EXPLAIN, PROFILE and TRACE

Three prefixes tell you what a statement does:

| Prefix | Runs the statement? | Shows |
| --- | --- | --- |
| `EXPLAIN` | no | the plan: where each pattern starts, the estimated rows and cost |
| `PROFILE` | yes | the plan with the rows, records read and milliseconds of each step |
| `TRACE` | yes | the walk: each node found, edge followed, row kept or dropped, in order |

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

## EXPLAIN

The plan, without running anything. Use it to check that a query starts where you expect, from an index rather than a scan:

```text run title="Example"
EXPLAIN MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Result"
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+------
 1    | MATCH     | start at (p:Person {name}) (scan of :Person, 5 nodes), expa… | 3.0  | 36.0
 2    | RETURN    | f.name                                                       | 3.0  | 46.0
(2 rows)
```

With an index on `name`, the start changes:

```text run title="Example"
CREATE INDEX FOR (p:Person) ON (p.name);
EXPLAIN MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Result"
 name        | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_name | Person | name     | false  | 5       | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+------
 1    | MATCH     | start at (p:Person {name}) (index Person_name: name = …, ~1… | 1.0  | 7.0
 2    | RETURN    | f.name                                                       | 1.0  | 9.0
(2 rows)
```

`EXPLAIN` of a write writes nothing. It also tells you when a statement would be refused for lack of rights.

## PROFILE

Runs the statement, returns its rows, then a table with what each step did. `reads` counts nodes, edges and index entries read; `ms` is how long the step took:

```text run title="Example"
PROFILE MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Result"
 f.name
--------
 Carla
(1 row)

 step | operation | rows | reads | ms   | details
------+-----------+------+-------+------+--------------------------------------------------------------
 1    | MATCH     | 1    | 6     | 0.14 | start at (p:Person {name}) (index Person_name: name = …, ~1…
 2    | RETURN    | 1    | 0     | 0.00 | f.name
(2 rows)
```

## TRACE

Runs the statement and records its walk. Each event has a sequence number, the step of the plan (the clause) and a kind:

```text run title="Example"
TRACE MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Result"
 f.name
--------
 Carla
(1 row)

 seq | step | event  | what
-----+------+--------+--------------------------------
 0   | 1    | anchor | 6682380f via index Person_name
 1   | 1    | expand | 6682380f -> 53f2c45b
 2   | 1    | keep   | 53f2c45b
 3   | 1    | expand | 6682380f -> 537f06df
 4   | 1    | keep   | 537f06df
 5   | 1    | drop   | row: f.age > 30
 6   | 2    | row    | row 0
(7 rows)
```

| Event | What happened |
| --- | --- |
| `anchor` | a pattern starts at a node, found through an index, a label, an id or a scan |
| `expand` | an edge was followed, from one node to another |
| `keep` | the node at the end of the edge fits the pattern |
| `drop` | a node or a row was dropped, with the reason (the pattern, or the condition) |
| `row` | a result row |

Here: Ana is the anchor, found through the index; two `knows` edges are followed, to Bruno and to Carla; the row with Bruno is dropped by `age > 30`; Carla's row is returned. The console shows the last eight characters of each id; over HTTP (`trace: true` on `POST /v1/{ns}/query`) each event carries the full ids, so a client can replay the walk step by step on a drawing of the graph. In the console, `\trace on` traces every statement until `\trace off`.

:::tip Good to know
- A trace keeps at most 10 000 events or 4 MiB; past that it says `cut: true` and the statement still runs to its end.
- Statements that are not traced pay nothing for the feature.
- Writes run normally under `PROFILE` and `TRACE`. Index and constraint statements refuse both.
:::
