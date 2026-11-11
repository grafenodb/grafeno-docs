---
title: WITH
description: Chain the steps of a query, filter aggregates and limit rows in the middle of a query.
---

# WITH

`WITH` is a `RETURN` in the middle of a query. It passes rows to the next clause, and only the names it lists stay in scope. With it you can filter an aggregate, sort and limit before going on, or compute a value once and reuse it.

## Syntax

```text
MATCH …
WITH expression [AS name], …  [ORDER BY …] [SKIP n] [LIMIT n]
[WHERE condition]
MATCH … | RETURN …
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

## Filter an aggregate

Count each person's friends, then keep those with more than one (SQL calls this `HAVING`):

```text run title="Example"
MATCH (p:Person)-[:knows]->(f)
WITH p, count(f) AS friends
WHERE friends > 1
RETURN p.name, friends;
```

```text result title="Result"
 p.name | friends
--------+---------
 Ana    | 2
(1 row)
```

## Sort and limit, then continue

The two oldest people, then where they work:

```text run title="Example"
MATCH (p:Person)
WITH p ORDER BY p.age DESC LIMIT 2
MATCH (p)-[:works_at]->(c)
RETURN p.name, p.age, c.name;
```

```text result title="Result"
 p.name | p.age | c.name
--------+-------+--------
 Carla  | 45    | Acme
 Diego  | 39    | Orbit
(2 rows)
```

## Compute once, use later

```text run title="Example"
MATCH (p:Person)
WITH avg(p.age) AS average
MATCH (q:Person) WHERE q.age > average
RETURN q.name, q.age, round(average, 1) AS average;
```

```text result title="Result"
 q.name | q.age | average
--------+-------+---------
 Ana    | 34    | 33.8
 Carla  | 45    | 33.8
 Diego  | 39    | 33.8
(3 rows)
```

## Aggregate of aggregates

The average number of friends, counting people with none (`OPTIONAL MATCH`):

```text run title="Example"
MATCH (p:Person)
OPTIONAL MATCH (p)-[:knows]->(f)
WITH p, count(f) AS friends
RETURN avg(friends) AS average_friends, max(friends) AS most;
```

```text result title="Result"
 average_friends | most
-----------------+------
 1.0             | 2
(1 row)
```

## Only listed names stay

After `WITH`, a variable that was not listed is gone, so this query fails:

```text run title="Example"
MATCH (p:Person {name: 'Ana'})-[:works_at]->(c)
WITH c
RETURN p.name;
```

```text result title="Result"
error: unknown variable `p`
```

`WITH *` keeps every variable, and can add new ones:

```text run title="Example"
MATCH (p:Person {name: 'Ana'})-[:works_at]->(c)
WITH *, c.name AS company
RETURN p.name, company;
```

```text result title="Result"
 p.name | company
--------+---------
 Ana    | Acme
(1 row)
```

:::tip Good to know
Expressions in `WITH` other than plain variables need a name: `WITH p.age * 2 AS double`.
:::
