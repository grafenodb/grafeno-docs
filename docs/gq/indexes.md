---
title: Indexes
description: Make lookups by property fast with indexes on one or several properties, on edges and over several labels, and see when the planner uses them.
---

# Indexes

Without an index, finding `Person` nodes by `email` reads every `Person`. An **index** on the label and property goes straight to the matching nodes. Grafeno keeps every index up to date in the same transaction as the write.

## Syntax

```text
CREATE INDEX [name] [IF NOT EXISTS] FOR (n:Label) ON (n.key [, n.other …])
CREATE INDEX [name] FOR ()-[r:LABEL]-() ON (r.key)
CREATE INDEX [name] FOR (n:Label|Other) ON (n.key)
SHOW INDEXES
DROP INDEX name [IF EXISTS]
```

## The example data

```text run title="Example"
UNWIND range(1, 2000) AS i
CREATE (:Person {id: i, name: 'person ' + toString(i), age: 18 + i % 60,
                 city: CASE i % 4 WHEN 0 THEN 'Lima' WHEN 1 THEN 'Quito' WHEN 2 THEN 'Bogotá' ELSE 'Cusco' END});
```

```text result title="Result"
2000 nodes created
```

## Without an index

`EXPLAIN` shows the plan without running it. Here it must scan every `Person`:

```text run title="Example"
EXPLAIN MATCH (p:Person {id: 1234}) RETURN p.name;
```

```text result title="Result"
 step | operation | details                                                | rows   | cost
------+-----------+--------------------------------------------------------+--------+--------
 1    | MATCH     | start at (p:Person {id}) (scan of :Person, 2000 nodes) | 2000.0 | 2000.0
 2    | RETURN    | p.name                                                 | 2000.0 | 8000.0
(2 rows)
```

## Create an index

Without a name, Grafeno names it `Label_property`:

```text run title="Example"
CREATE INDEX FOR (p:Person) ON (p.id);
EXPLAIN MATCH (p:Person {id: 1234}) RETURN p.name;
```

```text result title="Result"
 name      | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-----------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_id | Person | id       | false  | 2000    | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+------
 1    | MATCH     | start at (p:Person {id}) (index Person_id: id = …, ~1 nodes) | 1.0  | 1.0
 2    | RETURN    | p.name                                                       | 1.0  | 4.0
(2 rows)
```

The plan now starts from the index and expects one node.

## Several properties

An index on `(city, age)` serves `city = …`, and `city = … AND age …`, but not `age` alone: properties are used in order:

```text run title="Example"
CREATE INDEX by_city_age FOR (p:Person) ON (p.city, p.age);
EXPLAIN MATCH (p:Person) WHERE p.city = 'Lima' AND p.age < 20 RETURN p.name;
```

```text result title="Result"
 name        | label  | property  | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+-----------+--------+---------+-------+-------+-------+-------+--------
 by_city_age | Person | city, age | false  | 2000    | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+--------
 1    | MATCH     | start at (p:Person) (index by_city_age: city = …, age < …, … | 31.0 | 1250.0
 2    | RETURN    | p.name                                                       | 31.0 | 1344.0
(2 rows)
```

## What an index serves

Equality, `IN`, `STARTS WITH` and ranges (`<`, `<=`, `>`, `>=`):

```text run title="Example"
CREATE INDEX FOR (p:Person) ON (p.age);
EXPLAIN MATCH (p:Person) WHERE p.age >= 70 RETURN count(p);
```

```text result title="Result"
 name       | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_age | Person | age      | false  | 2000    | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows  | cost
------+-----------+--------------------------------------------------------------+-------+--------
 1    | MATCH     | start at (p:Person) (index Person_age: … <= age, ~266 nodes… | 133.0 | 1328.0
 2    | RETURN    | count(p); aggregates                                         | 1.0   | 1727.0
(2 rows)
```

```text run title="Example"
MATCH (p:Person) WHERE p.age >= 76 RETURN p.age, count(*) AS people ORDER BY p.age;
```

```text result title="Result"
 p.age | people
-------+--------
 76    | 33
 77    | 33
(2 rows)
```

## Indexes on edges

```text run title="Example"
MATCH (a:Person {id: 1}), (b:Person {id: 2}), (c:Person {id: 3})
CREATE (a)-[:rated {stars: 5}]->(b), (a)-[:rated {stars: 2}]->(c);
CREATE INDEX FOR ()-[r:rated]-() ON (r.stars);
MATCH (a)-[r:rated {stars: 5}]->(b) RETURN a.id, b.id, r.stars;
```

```text result title="Result"
2 edges created
 name        | label | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------+-------+----------+--------+---------+-------+-------+-------+-------+--------
 rated_stars | rated | stars    | false  | 2       | false | edges | false | value | online
(1 row)
 a.id | b.id | r.stars
------+------+---------
 1    | 2    | 5
(1 row)
```

## List and drop

```text run title="Example"
SHOW INDEXES;
```

```text result title="Result"
 name        | label  | property  | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+-----------+--------+---------+-------+-------+-------+-------+--------
 Person_age  | Person | age       | false  | 2000    | false | nodes | false | value | online
 Person_id   | Person | id        | false  | 2000    | false | nodes | false | value | online
 by_city_age | Person | city, age | false  | 2000    | false | nodes | false | value | online
 rated_stars | rated  | stars     | false  | 2       | false | edges | false | value | online
(4 rows)
```

```text run title="Example"
DROP INDEX by_city_age;
DROP INDEX by_city_age IF EXISTS;
```

```text result title="Result"
 name        | label  | property  | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+-----------+--------+---------+-------+-------+-------+-------+--------
 by_city_age | Person | city, age | false  | 0       | false | nodes | false | value | online
(1 row)
 name | label | property | unique | entries | fuzzy | on | key | kind | state
------+-------+----------+--------+---------+-------+----+-----+------+-------
(0 rows)
```

## Unique values

A **unique constraint** is an index that refuses a second node with the same value. See [Constraints](constraints.md):

```text run title="Example"
CREATE CONSTRAINT FOR (p:Person) REQUIRE p.name IS UNIQUE;
CREATE (:Person {name: 'person 7'});
```

```text result title="Result"
 name               | kind   | label  | property | rule | on    | entries
--------------------+--------+--------+----------+------+-------+---------
 Person_name_unique | unique | Person | name     | null | nodes | 2000
(1 row)
error: invalid input: name must be unique among :Person(name): node 01a1cb1f-3c86-7376-bf3b-c466c0d98bd4 already has "person 7"
```

:::tip Good to know
- An index holds numbers, strings and booleans. Lists, maps and `null` are not indexed.
- Numbers compare as numbers: an index on `id` finds `7.0` when you look for `7`.
- The planner picks the cheapest start for each pattern from statistics it keeps in memory. `CALL db.analyze()` shows them.
- Text search has its own [full-text indexes](full-text.md), similar names [fuzzy indexes](similar-text.md#fuzzy-indexes), and vectors [vector indexes](../vectors/vector-indexes.md).
:::
