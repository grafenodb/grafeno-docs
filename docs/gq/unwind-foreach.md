---
title: UNWIND and FOREACH
description: Turn lists into rows with UNWIND, and repeat writes for each item with FOREACH.
---

# UNWIND and FOREACH

`UNWIND` turns a list into rows, one per item. `FOREACH` runs writes once per item of a list, without making rows.

## Syntax

```text
UNWIND list AS item
FOREACH (item IN list | write clauses)
```

## UNWIND a list

```text run title="Example"
UNWIND [1, 2, 3] AS x RETURN x, x * 10 AS times_ten;
```

```text result title="Result"
 x | times_ten
---+-----------
 1 | 10
 2 | 20
 3 | 30
(3 rows)
```

## Create many nodes from a list

A list of maps is the usual way to load several records in one statement:

```text run title="Example"
UNWIND [{name: 'Ana', langs: ['es', 'en']},
        {name: 'Bruno', langs: ['es']},
        {name: 'Carla', langs: ['en', 'pt', 'es']}] AS row
CREATE (p:Person {name: row.name, langs: row.langs})
RETURN count(p) AS created;
```

```text result title="Result"
 created
---------
 3
(1 row)
3 nodes created
```

## UNWIND a property

Count the people who speak each language:

```text run title="Example"
MATCH (p:Person)
UNWIND p.langs AS lang
RETURN lang, count(*) AS speakers, collect(p.name) AS who
ORDER BY speakers DESC, lang;
```

```text result title="Result"
 lang | speakers | who
------+----------+---------------------
 es   | 3        | [Ana, Bruno, Carla]
 en   | 2        | [Ana, Carla]
 pt   | 1        | [Carla]
(3 rows)
```

## Empty lists and null

An empty list or `null` gives no rows, so the row disappears:

```text run title="Example"
UNWIND [] AS x RETURN count(*) AS rows;
```

```text result title="Result"
 rows
------
 0
(1 row)
```

## FOREACH

`FOREACH` repeats writes for each item. Here Ana gets a `likes` edge to each topic, merged so topics are not duplicated:

```text run title="Example"
MATCH (a:Person {name: 'Ana'})
FOREACH (topic IN ['graphs', 'rust', 'search'] |
  MERGE (t:Topic {name: topic})
  CREATE (a)-[:likes]->(t));
MATCH (:Person {name: 'Ana'})-[:likes]->(t) RETURN t.name ORDER BY t.name;
```

```text result title="Result"
3 nodes created, 3 edges created
 t.name
--------
 graphs
 rust
 search
(3 rows)
```

## UNWIND or FOREACH?

| Use | When |
| --- | --- |
| `UNWIND` | you need rows: to return, aggregate or match from each item |
| `FOREACH` | you only write, and want the rest of the query to keep its rows as they were |

`FOREACH` accepts `CREATE`, `MERGE`, `SET`, `REMOVE`, `DELETE`, `RETRACT` and nested `FOREACH`.
