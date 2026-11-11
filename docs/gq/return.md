---
title: RETURN
description: Choose the columns of a result, name them, remove duplicates, sort and page through rows.
---

# RETURN

`RETURN` says what each result row holds. It also sorts, removes duplicates and limits how many rows come back.

## Syntax

```text
RETURN [DISTINCT] expression [AS name], …
[ORDER BY expression [ASC | DESC], …]
[SKIP n]
[LIMIT n]
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

## Properties and expressions

A column can be any expression. Its name is the expression as written:

```text run title="Example"
MATCH (p:Person {name: 'Ana'}) RETURN p.name, p.age, p.age + 10, upper(p.city);
```

```text result title="Result"
 p.name | p.age | p.age + 10 | upper(p.city)
--------+-------+------------+---------------
 Ana    | 34    | 44         | LIMA
(1 row)
```

## AS: name the columns

```text run title="Example"
MATCH (p:Person {name: 'Ana'}) RETURN p.name AS person, p.age + 10 AS age_in_ten_years;
```

```text result title="Result"
 person | age_in_ten_years
--------+------------------
 Ana    | 44
(1 row)
```

## Whole nodes

Returning a variable returns the node. The console draws it as `(name:Label)`; over HTTP it is a JSON object with its id, labels and properties:

```text run title="Example"
MATCH (p:Person {name: 'Ana'})-[r:works_at]->(c) RETURN p, r, c;
```

```text result title="Result"
 p            | r           | c
--------------+-------------+----------------
 (Ana:Person) | [:works_at] | (Acme:Company)
(1 row)
```

## DISTINCT

The cities, each once:

```text run title="Example"
MATCH (p:Person) RETURN DISTINCT p.city ORDER BY p.city;
```

```text result title="Result"
 p.city
--------
 Bogotá
 Lima
 Quito
(3 rows)
```

## ORDER BY

Ascending is the default; `DESC` reverses. Several keys sort in turn:

```text run title="Example"
MATCH (p:Person) RETURN p.city, p.name, p.age ORDER BY p.city, p.age DESC;
```

```text result title="Result"
 p.city | p.name | p.age
--------+--------+-------
 Bogotá | Diego  | 39
 Lima   | Carla  | 45
 Lima   | Ana    | 34
 Quito  | Bruno  | 28
 Quito  | Eva    | 23
(5 rows)
```

`null` sorts last, ascending or descending.

## SKIP and LIMIT

`LIMIT` keeps the first rows; `SKIP` leaves some out first. Together they page through results: here the second page of two rows, by age:

```text run title="Example"
MATCH (p:Person) RETURN p.name, p.age ORDER BY p.age SKIP 2 LIMIT 2;
```

```text result title="Result"
 p.name | p.age
--------+-------
 Ana    | 34
 Diego  | 39
(2 rows)
```

## RETURN without MATCH

`RETURN` alone evaluates expressions, handy to try functions:

```text run title="Example"
RETURN 2 + 3 AS sum, 'graph' + 's' AS text, [1, 2, 3] AS list, {a: 1} AS map;
```

```text result title="Result"
 sum | text   | list      | map
-----+--------+-----------+---------
 5   | graphs | [1, 2, 3] | {"a":1}
(1 row)
```

## RETURN *

Every variable of the row:

```text run title="Example"
MATCH (p:Person {name: 'Eva'}) RETURN *;
```

```text result title="Result"
 p
--------------
 (Eva:Person)
(1 row)
```
