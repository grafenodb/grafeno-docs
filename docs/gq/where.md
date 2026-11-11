---
title: WHERE
description: Filter matches with comparisons, logic, lists, text tests, null checks and patterns.
---

# WHERE

`WHERE` keeps the rows whose condition is **true** and drops the rest.

## Syntax

```text
MATCH pattern
WHERE condition
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

## Comparisons

`=`, `<>` (or `!=`), `<`, `<=`, `>`, `>=`:

```text run title="Example"
MATCH (p:Person) WHERE p.age > 30 RETURN p.name, p.age ORDER BY p.age;
```

```text result title="Result"
 p.name | p.age
--------+-------
 Ana    | 34
 Diego  | 39
 Carla  | 45
(3 rows)
```

## AND, OR, NOT, XOR

```text run title="Example"
MATCH (p:Person)
WHERE p.city = 'Quito' OR (p.city = 'Lima' AND p.age < 40)
RETURN p.name, p.city, p.age;
```

```text result title="Result"
 p.name | p.city | p.age
--------+--------+-------
 Ana    | Lima   | 34
 Bruno  | Quito  | 28
 Eva    | Quito  | 23
(3 rows)
```

```text run title="Example"
MATCH (p:Person) WHERE NOT p.city = 'Lima' RETURN p.name;
```

```text result title="Result"
 p.name
--------
 Bruno
 Diego
 Eva
(3 rows)
```

## IN a list

```text run title="Example"
MATCH (p:Person) WHERE p.city IN ['Bogotá', 'Quito'] RETURN p.name, p.city;
```

```text result title="Result"
 p.name | p.city
--------+--------
 Bruno  | Quito
 Diego  | Bogotá
 Eva    | Quito
(3 rows)
```

## Text tests

`STARTS WITH`, `ENDS WITH`, `CONTAINS` and `=~` (a regular expression that must match the whole string; `(?i)` ignores case):

```text run title="Example"
MATCH (p:Person)
WHERE p.name STARTS WITH 'C' OR p.name ENDS WITH 'o' OR p.name CONTAINS 'v'
RETURN p.name;
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

```text run title="Example"
MATCH (p:Person) WHERE p.name =~ '(?i)[ae].*' RETURN p.name;
```

```text result title="Result"
 p.name
--------
 Ana
 Eva
(2 rows)
```

## Ranges

```text run title="Example"
MATCH (p:Person) WHERE 25 <= p.age AND p.age <= 35 RETURN p.name, p.age;
```

```text result title="Result"
 p.name | p.age
--------+-------
 Ana    | 34
 Bruno  | 28
(2 rows)
```

## Missing values: IS NULL

Give Carla an email; nobody else has one. `IS NULL` is true when a property is missing or `null`, `IS NOT NULL` when it holds a value:

```text run title="Example"
MATCH (c:Person {name: 'Carla'}) SET c.email = 'carla@example.org';
MATCH (p:Person) WHERE p.email IS NOT NULL RETURN p.name, p.email;
MATCH (p:Person) WHERE p.email IS NULL RETURN count(p) AS without_email;
```

```text result title="Result"
1 property set
 p.name | p.email
--------+-------------------
 Carla  | carla@example.org
(1 row)
 without_email
---------------
 4
(1 row)
```

:::note Three-valued logic
A comparison with `null` is neither true nor false but **unknown**, and `WHERE` keeps only true rows. `p.email = null` therefore keeps nothing: write `p.email IS NULL`.
:::

```text run title="Example"
MATCH (p:Person) WHERE p.email = null RETURN count(p) AS found;
```

```text result title="Result"
 found
-------
 0
(1 row)
```

## Filter on edges

Conditions can use the edge's properties too:

```text run title="Example"
MATCH (p:Person)-[w:works_at]->(c) WHERE w.since >= 2020 RETURN p.name, c.name, w.since;
```

```text result title="Result"
 p.name | c.name | w.since
--------+--------+---------
 Bruno  | Orbit  | 2022
 Diego  | Orbit  | 2020
(2 rows)
```

## Patterns as conditions

A pattern in `WHERE` asks whether it matches from the row. People who know someone, and people nobody knows:

```text run title="Example"
MATCH (p:Person) WHERE (p)-[:knows]->() RETURN p.name ORDER BY p.name;
```

```text result title="Result"
 p.name
--------
 Ana
 Bruno
 Carla
 Diego
(4 rows)
```

```text run title="Example"
MATCH (p:Person) WHERE NOT (p)<-[:knows]-() RETURN p.name;
```

```text result title="Result"
 p.name
--------
 Ana
(1 row)
```

`EXISTS { … }` takes a whole `MATCH` with its own `WHERE`: people who know someone older than 40:

```text run title="Example"
MATCH (p:Person)
WHERE EXISTS { MATCH (p)-[:knows]->(f) WHERE f.age > 40 }
RETURN p.name;
```

```text result title="Result"
 p.name
--------
 Ana
(1 row)
```

## Label tests

`n:Label` is true when the node has the label:

```text run title="Example"
MATCH (n) WHERE n:Company RETURN n.name;
```

```text result title="Result"
 n.name
--------
 Acme
 Orbit
(2 rows)
```
