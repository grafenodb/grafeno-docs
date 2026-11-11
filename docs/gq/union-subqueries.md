---
title: UNION and subqueries
description: Join the results of several queries with UNION, run a query per row with CALL { }, and count or test patterns with COUNT { } and EXISTS { }.
---

# UNION and subqueries

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

## UNION

`UNION` puts the rows of several queries one after another. Each query must return the same column names. Duplicate rows are dropped:

```text run title="Example"
MATCH (p:Person) RETURN p.name AS name, 'person' AS kind
UNION
MATCH (c:Company) RETURN c.name AS name, 'company' AS kind;
```

```text result title="Result"
 name  | kind
-------+---------
 Ana   | person
 Bruno | person
 Carla | person
 Diego | person
 Eva   | person
 Acme  | company
 Orbit | company
(7 rows)
```

## UNION ALL

`UNION ALL` keeps duplicates. The cities of people under 30, then of people over 40, with repeats:

```text run title="Example"
MATCH (p:Person) WHERE p.age < 30 RETURN p.city AS city
UNION ALL
MATCH (p:Person) WHERE p.age > 40 RETURN p.city AS city;
```

```text result title="Result"
 city
-------
 Quito
 Quito
 Lima
(3 rows)
```

## `CALL { … }`: a subquery per row

The clauses inside the braces run once for each row and see its variables (bring them in with `WITH`). What their `RETURN` gives is added to the row:

```text run title="Example"
MATCH (p:Person)
CALL { WITH p MATCH (p)-[:knows]->(f) RETURN count(f) AS friends }
RETURN p.name, friends
ORDER BY friends DESC, p.name;
```

```text result title="Result"
 p.name | friends
--------+---------
 Ana    | 2
 Bruno  | 1
 Carla  | 1
 Diego  | 1
 Eva    | 0
(5 rows)
```

A subquery can sort and limit on its own, per row: each company's most senior employee:

```text run title="Example"
MATCH (c:Company)
CALL {
  WITH c
  MATCH (p:Person)-[w:works_at]->(c)
  RETURN p.name AS senior ORDER BY w.since LIMIT 1
}
RETURN c.name, senior;
```

```text result title="Result"
 c.name | senior
--------+--------
 Acme   | Carla
 Orbit  | Diego
(2 rows)
```

## `COUNT { … }`

Counts the matches of a pattern from the row, without changing the rows:

```text run title="Example"
MATCH (p:Person)
RETURN p.name, COUNT { (p)-[:knows]->() } AS knows, COUNT { (p)<-[:knows]-() } AS known_by
ORDER BY p.name;
```

```text result title="Result"
 p.name | knows | known_by
--------+-------+----------
 Ana    | 2     | 0
 Bruno  | 1     | 1
 Carla  | 1     | 1
 Diego  | 1     | 2
 Eva    | 0     | 1
(5 rows)
```

## `EXISTS { … }`

True when the pattern matches at least once. It may contain a `MATCH` with a `WHERE`:

```text run title="Example"
MATCH (c:Company)
RETURN c.name, EXISTS { MATCH (p:Person)-[:works_at]->(c) WHERE p.age > 40 } AS has_someone_over_40;
```

```text result title="Result"
 c.name | has_someone_over_40
--------+---------------------
 Acme   | true
 Orbit  | false
(2 rows)
```

## Pattern comprehension

A list built from a pattern, inline: each person and the names of those they know:

```text run title="Example"
MATCH (p:Person)
RETURN p.name, [(p)-[:knows]->(f) | f.name] AS knows
ORDER BY p.name;
```

```text result title="Result"
 p.name | knows
--------+----------------
 Ana    | [Bruno, Carla]
 Bruno  | [Diego]
 Carla  | [Diego]
 Diego  | [Eva]
 Eva    | []
(5 rows)
```

:::tip Good to know
- A name returned by a subquery may not already exist outside it.
- A whole statement, subqueries included, is one transaction.
:::
