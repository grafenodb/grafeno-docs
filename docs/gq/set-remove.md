---
title: SET and REMOVE
description: Change properties and labels, store null, merge or replace all properties, and remove keys and labels.
---

# SET and REMOVE

`SET` changes properties and labels of nodes and edges you matched. `REMOVE` takes them away.

## Syntax

```text
SET n.key = value            // one property
SET n += {key: value, …}     // merge several properties
SET n = {key: value, …}      // replace all properties
SET n:Label                  // add a label
REMOVE n.key, n:Label        // remove a property, a label
```

## The example data

```text run title="Example"
CREATE (:Person {name: 'Ana', age: 34, city: 'Lima'}),
       (:Person {name: 'Bruno', age: 28, city: 'Quito'});
```

```text result title="Result"
2 nodes created
```

## Set one property

Change a value, or add a new property:

```text run title="Example"
MATCH (p:Person {name: 'Ana'})
SET p.age = 35, p.title = 'engineer'
RETURN p.name, p.age, p.title;
```

```text result title="Result"
 p.name | p.age | p.title
--------+-------+----------
 Ana    | 35    | engineer
(1 row)
2 properties set
```

## Compute the new value

The right side is any expression, and can read the old value:

```text run title="Example"
MATCH (p:Person) SET p.age = p.age + 1 RETURN p.name, p.age ORDER BY p.name;
```

```text result title="Result"
 p.name | p.age
--------+-------
 Ana    | 36
 Bruno  | 29
(2 rows)
2 properties set
```

## Merge properties: +=

`+=` sets the keys of the map and leaves the others as they are:

```text run title="Example"
MATCH (p:Person {name: 'Bruno'})
SET p += {city: 'Cuenca', team: 'design'}
RETURN properties(p);
```

```text result title="Result"
 properties(p)
-----------------------------------------------------------
 {"age":29,"city":"Cuenca","name":"Bruno","team":"design"}
(1 row)
2 properties set
```

## Replace all properties: =

`=` with a map replaces everything: keys the map lacks are removed:

```text run title="Example"
MATCH (p:Person {name: 'Bruno'})
SET p = {name: 'Bruno', age: 30}
RETURN properties(p);
```

```text result title="Result"
 properties(p)
---------------------------
 {"age":30,"name":"Bruno"}
(1 row)
2 properties set
```

## Labels

```text run title="Example"
MATCH (p:Person {name: 'Ana'}) SET p:Admin:Mentor RETURN labels(p);
```

```text result title="Result"
 labels(p)
-------------------------
 [Admin, Mentor, Person]
(1 row)
2 labels added
```

```text run title="Example"
MATCH (p:Person {name: 'Ana'}) REMOVE p:Mentor RETURN labels(p);
```

```text result title="Result"
 labels(p)
-----------------
 [Admin, Person]
(1 row)
1 label removed
```

## Remove a property

`REMOVE` deletes the key:

```text run title="Example"
MATCH (p:Person {name: 'Ana'}) REMOVE p.title RETURN keys(p);
```

```text result title="Result"
 keys(p)
-------------------
 [age, city, name]
(1 row)
1 property set
```

## null is a value

Setting a property to `null` **keeps the key** with a `null` value; `REMOVE` deletes it. Reading either gives `null`, and `hasKey` tells them apart:

```text run title="Example"
MATCH (p:Person {name: 'Ana'})
SET p.nickname = null
RETURN p.nickname, hasKey(p, 'nickname') AS has_nickname, hasKey(p, 'title') AS has_title;
```

```text result title="Result"
 p.nickname | has_nickname | has_title
------------+--------------+-----------
 null       | true         | false
(1 row)
1 property set
```

Merging a map with `null` values stores them too:

```text run title="Example"
MATCH (p:Person {name: 'Bruno'}) SET p += {city: null} RETURN properties(p);
```

```text result title="Result"
 properties(p)
---------------------------------------
 {"age":30,"city":null,"name":"Bruno"}
(1 row)
1 property set
```

## Edges

Edges take `SET` and `REMOVE` the same way:

```text run title="Example"
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'})
CREATE (a)-[k:knows {since: 2020}]->(b)
SET k.strength = 'close'
RETURN k.since, k.strength;
```

```text result title="Result"
 k.since | k.strength
---------+------------
 2020    | close
(1 row)
1 edge created, 1 property set
```

## Text, importance and validity

Pseudo-properties are set like properties:

```text run title="Example"
MATCH (p:Person {name: 'Ana'})
SET p.@text = 'Ana leads the robotics team in Lima.', p.@importance = 0.9
RETURN p.@text, p.@importance;
```

```text result title="Result"
 p.@text                              | p.@importance
--------------------------------------+---------------
 Ana leads the robotics team in Lima. | 0.9
(1 row)
2 properties set
```

| Statement | Effect |
| --- | --- |
| `SET n.@text = '…'` | indexes the text for full-text search (`null` removes it) |
| `SET n.@embedding = [...]` | stores the node's vector (`null` removes it) |
| `SET n.@importance = 0.9` | importance from 0 to 1, used by recall |
| `SET r.@valid_to = '2025-01-01'` | the fact stopped being true then; history is kept |
| `REMOVE n.@text` | removes the text |

:::tip Good to know
A statement that writes is one transaction: if any part fails, nothing it wrote stays.
:::
