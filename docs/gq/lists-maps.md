---
title: Lists and maps
description: Build, index, slice and transform lists, use list comprehensions and reduce, and work with maps and map projections.
---

# Lists and maps

A **list** is an ordered sequence in square brackets: `[1, 2, 3]`. A **map** is a set of keys and values in braces: `{name: 'Ana', age: 34}`. Both can be property values, and both can nest.

## Lists

```text run title="Example"
RETURN [1, 2, 3] AS list, size([1, 2, 3]) AS size, range(1, 5) AS one_to_five, range(0, 10, 5) AS step_5;
```

```text result title="Result"
 list      | size | one_to_five     | step_5
-----------+------+-----------------+------------
 [1, 2, 3] | 3    | [1, 2, 3, 4, 5] | [0, 5, 10]
(1 row)
```

## Index and slice

Indexes start at 0; negative ones count from the end. `[from..to]` takes a slice (the end is left out):

```text run title="Example"
WITH ['a', 'b', 'c', 'd', 'e'] AS l
RETURN l[0] AS first, l[-1] AS last, l[1..3] AS middle, l[..2] AS start, l[3..] AS rest;
```

```text result title="Result"
 first | last | middle | start  | rest
-------+------+--------+--------+--------
 a     | e    | [b, c] | [a, b] | [d, e]
(1 row)
```

## Functions on lists

```text run title="Example"
WITH [3, 1, 2] AS l
RETURN head(l) AS head, last(l) AS last, tail(l) AS tail, reverse(l) AS reversed,
       l + [4] AS appended, 2 IN l AS has_two, isEmpty([]) AS empty;
```

```text result title="Result"
 head | last | tail   | reversed  | appended     | has_two | empty
------+------+--------+-----------+--------------+---------+-------
 3    | 2    | [1, 2] | [2, 1, 3] | [3, 1, 2, 4] | true    | true
(1 row)
```

## List comprehension

`[x IN list WHERE condition | expression]` filters and transforms in one go:

```text run title="Example"
RETURN [x IN range(1, 10) WHERE x % 2 = 0 | x * x] AS even_squares,
       [x IN ['a', 'b'] | upper(x)] AS upper;
```

```text result title="Result"
 even_squares         | upper
----------------------+--------
 [4, 16, 36, 64, 100] | [A, B]
(1 row)
```

## Quantifiers

`all`, `any`, `none` and `single` test the items of a list:

```text run title="Example"
WITH [45, 60, 72] AS scores
RETURN all(s IN scores WHERE s > 40) AS all_pass, any(s IN scores WHERE s > 70) AS any_high,
       none(s IN scores WHERE s > 90) AS none_top, single(s IN scores WHERE s > 70) AS one_high;
```

```text result title="Result"
 all_pass | any_high | none_top | one_high
----------+----------+----------+----------
 true     | true     | true     | true
(1 row)
```

## reduce

`reduce` walks a list carrying a value along, here a sum and a joined text:

```text run title="Example"
RETURN reduce(total = 0, x IN [1, 2, 3, 4] | total + x) AS sum,
       reduce(s = '', w IN ['graph', 'memory'] | s + w + ' ') AS joined;
```

```text result title="Result"
 sum | joined
-----+---------------
 10  | graph memory
(1 row)
```

## Maps

Read a key with `.key`; `keys` lists them:

```text run title="Example"
WITH {name: 'Ana', langs: ['es', 'en'], address: {city: 'Lima'}} AS m
RETURN m.name, m.langs[1], m.address.city, keys(m) AS keys;
```

```text result title="Result"
 m.name | m.langs[1] | m.address.city | keys
--------+------------+----------------+------------------------
 Ana    | en         | Lima           | [address, langs, name]
(1 row)
```

## Map projection

`node {.key, …}` builds a map from a node's properties, with extra keys as you like. `{.*}` takes them all:

```text run title="Example"
CREATE (:Person {name: 'Ana', age: 34, city: 'Lima'});
MATCH (p:Person {name: 'Ana'})
RETURN p {.name, .city, decade: p.age / 10 * 10} AS card, p {.*} AS all;
```

```text result title="Result"
1 node created
 card                                     | all
------------------------------------------+---------------------------------------
 {"city":"Lima","decade":30,"name":"Ana"} | {"age":34,"city":"Lima","name":"Ana"}
(1 row)
```

## Lists as property values

Lists are stored in properties and searched with `IN` or `UNWIND`:

```text run title="Example"
CREATE (:Book {title: 'Graphs', tags: ['math', 'cs']}), (:Book {title: 'Poems', tags: ['art']});
MATCH (b:Book) WHERE 'cs' IN b.tags RETURN b.title;
```

```text result title="Result"
2 nodes created
 b.title
---------
 Graphs
(1 row)
```
