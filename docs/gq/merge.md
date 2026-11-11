---
title: MERGE
description: Find a pattern or create it when it does not exist, with ON CREATE and ON MATCH.
---

# MERGE

`MERGE` finds a pattern, and creates it when nothing matches. Run the same `MERGE` twice and the second run creates nothing: it is the way to write data **idempotently**.

## Syntax

```text
MERGE pattern
[ON CREATE SET …]
[ON MATCH SET …]
```

## Create once

The first run creates the tag:

```text run title="Example"
MERGE (t:Tag {name: 'graphs'}) RETURN t.name;
```

```text result title="Result"
 t.name
--------
 graphs
(1 row)
1 node created
```

The same statement again finds it and creates nothing:

```text run title="Example"
MERGE (t:Tag {name: 'graphs'}) RETURN t.name;
MATCH (t:Tag) RETURN count(t) AS tags;
```

```text result title="Result"
 t.name
--------
 graphs
(1 row)
 tags
------
 1
(1 row)
```

## ON CREATE and ON MATCH

Do something different when the node is new, and when it was already there. Here a counter of uses:

```text run title="Example"
MERGE (t:Tag {name: 'rust'})
ON CREATE SET t.uses = 1
ON MATCH SET t.uses = t.uses + 1
RETURN t.name, t.uses;
```

```text result title="Result"
 t.name | t.uses
--------+--------
 rust   | 1
(1 row)
1 node created, 1 property set
```

```text run title="Example"
MERGE (t:Tag {name: 'rust'})
ON CREATE SET t.uses = 1
ON MATCH SET t.uses = t.uses + 1
RETURN t.name, t.uses;
```

```text result title="Result"
 t.name | t.uses
--------+--------
 rust   | 2
(1 row)
1 property set
```

## Merge an edge between known nodes

Match both ends first, then merge the edge. It is created only once:

```text run title="Example"
CREATE (:Person {name: 'Ana'}), (:Person {name: 'Bruno'});
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}) MERGE (a)-[:knows]->(b);
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}) MERGE (a)-[:knows]->(b);
MATCH (:Person)-[k:knows]->(:Person) RETURN count(k) AS edges;
```

```text result title="Result"
2 nodes created
1 edge created
No changes.
 edges
-------
 1
(1 row)
```

## The whole pattern counts

`MERGE` matches the **whole** pattern. If any part is missing, it creates every part that is not bound to a variable. Here Carla does not exist yet, so the whole path is created, a second `Ana` included:

```text run title="Example"
MERGE (:Person {name: 'Ana'})-[:knows]->(:Person {name: 'Carla'});
MATCH (p:Person {name: 'Ana'}) RETURN count(p) AS anas;
```

```text result title="Result"
2 nodes created, 1 edge created
 anas
------
 2
(1 row)
```

:::tip Merge the nodes first
To link existing nodes, `MERGE` (or `MATCH`) each node on its own, then `MERGE` the edge between the variables, as above.
:::

## Merge many at once

With `UNWIND`, one statement merges a whole list. Rows see what earlier rows merged, so a repeated value is created once:

```text run title="Example"
UNWIND ['graphs', 'memory', 'graphs', 'search'] AS name
MERGE (t:Tag {name: name})
RETURN count(*) AS rows;
MATCH (t:Tag) RETURN t.name ORDER BY t.name;
```

```text result title="Result"
 rows
------
 4
(1 row)
2 nodes created
 t.name
--------
 graphs
 memory
 rust
 search
(4 rows)
```
