---
title: Aggregation
description: Count, add up, average, collect and describe groups of rows with count, sum, avg, collect, median, stdev and percentiles.
---

# Aggregation

Aggregate functions turn many rows into one value: how many, the total, the average. The columns of `RETURN` that are **not** aggregates decide the **groups**.

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

## count

`count(*)` counts rows; `count(x)` counts the rows where `x` is not `null`:

```text run title="Example"
MATCH (p:Person) RETURN count(*) AS people;
```

```text result title="Result"
 people
--------
 5
(1 row)
```

## Groups

Here `p.city` is not an aggregate, so there is one row per city:

```text run title="Example"
MATCH (p:Person) RETURN p.city, count(*) AS people ORDER BY people DESC, p.city;
```

```text result title="Result"
 p.city | people
--------+--------
 Lima   | 2
 Quito  | 2
 Bogotá | 1
(3 rows)
```

## sum, avg, min, max

```text run title="Example"
MATCH (p:Person)
RETURN sum(p.age) AS total, avg(p.age) AS average, min(p.age) AS youngest, max(p.age) AS oldest;
```

```text result title="Result"
 total | average | youngest | oldest
-------+---------+----------+--------
 169   | 33.8    | 23       | 45
(1 row)
```

## collect

`collect` gathers values into a list, one per group:

```text run title="Example"
MATCH (p:Person)-[:works_at]->(c:Company)
RETURN c.name, collect(p.name) AS staff, count(p) AS size
ORDER BY c.name;
```

```text result title="Result"
 c.name | staff          | size
--------+----------------+------
 Acme   | [Ana, Carla]   | 2
 Orbit  | [Bruno, Diego] | 2
(2 rows)
```

## DISTINCT inside an aggregate

Count each value once:

```text run title="Example"
MATCH (p:Person) RETURN count(p.city) AS cities_with_repeats, count(DISTINCT p.city) AS cities;
```

```text result title="Result"
 cities_with_repeats | cities
---------------------+--------
 5                   | 3
(1 row)
```

## Statistics

| Function | Gives |
| --- | --- |
| `median(x)` | the middle value |
| `stdev(x)`, `stdevp(x)` | standard deviation of a sample, of a population |
| `variance(x)`, `variancep(x)` | variance of a sample, of a population |
| `percentileCont(x, p)` | the `p` percentile (0 to 1), interpolated |
| `percentileDisc(x, p)` | the `p` percentile, one of the values |
| `mode(x)` | the most frequent value |

```text run title="Example"
MATCH (p:Person)
RETURN median(p.age) AS median, round(stdev(p.age), 2) AS stdev,
       percentileCont(p.age, 0.9) AS p90, percentileDisc(p.age, 0.5) AS p50,
       mode(p.city) AS most_common_city;
```

```text result title="Result"
 median | stdev | p90  | p50 | most_common_city
--------+-------+------+-----+------------------
 34.0   | 8.7   | 42.6 | 34  | Lima
(1 row)
```

## Aggregates over nothing

With no rows, `count` gives 0 and the others give `null`. With grouping columns, there are simply no groups:

```text run title="Example"
MATCH (p:Person) WHERE p.age > 100 RETURN count(p) AS old, avg(p.age) AS average;
```

```text result title="Result"
 old | average
-----+---------
 0   | null
(1 row)
```

:::tip Good to know
- `null` values are skipped by every aggregate.
- To filter on an aggregate (SQL's `HAVING`), aggregate in a [WITH](with.md) and add `WHERE` after it.
- Aggregates give the same result in any order of rows, so a query split across a cluster gives what one server gives.
:::
