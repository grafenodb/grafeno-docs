---
title: CREATE
description: Create nodes and edges with GQ, with labels, properties, text and dates.
---

# CREATE

`CREATE` adds nodes and edges to the graph.

## Syntax

```text
CREATE (variable:Label {key: value, …})
CREATE (a)-[:LABEL {key: value, …}]->(b)
```

## Create a node

A node needs at least one label. Properties are optional:

```text run title="Example"
CREATE (:Person {name: 'Ana', age: 34});
```

```text result title="Result"
1 node created
```

Without `RETURN`, a writing statement says what it changed.

## Create several nodes at once

Separate the patterns with commas. They are created in one transaction:

```text run title="Example"
CREATE (:Person {name: 'Bruno', age: 28}),
       (:Person {name: 'Carla', age: 45}),
       (:Company {name: 'Acme'});
```

```text result title="Result"
3 nodes created
```

## Return what you created

Add `RETURN` to see the new records. `@id` is the id Grafeno gave the node:

```text run title="Example"
CREATE (p:Person {name: 'Diego', city: 'Bogotá'})
RETURN p.name, p.city, size(p.@id) AS id_length;
```

```text result title="Result"
 p.name | p.city | id_length
--------+--------+-----------
 Diego  | Bogotá | 36
(1 row)
1 node created
```

## Several labels

A node may have several labels. A pattern with `:Person:Admin` matches nodes that have both:

```text run title="Example"
CREATE (e:Person:Admin {name: 'Eva'}) RETURN labels(e);
```

```text result title="Result"
 labels(e)
-----------------
 [Admin, Person]
(1 row)
1 node created
```

## Create an edge between new nodes

Write the whole pattern. Variables (`a`, `b`) name the nodes so the edge can join them:

```text run title="Example"
CREATE (a:City {name: 'Lima'})-[:road {km: 1100}]->(b:City {name: 'Arequipa'});
```

```text result title="Result"
2 nodes created, 1 edge created
```

## Create an edge between existing nodes

Find the nodes with `MATCH`, then create the edge between them:

```text run title="Example"
MATCH (ana:Person {name: 'Ana'}), (acme:Company {name: 'Acme'})
CREATE (ana)-[w:works_at {since: 2019}]->(acme)
RETURN ana.name, type(w), acme.name;
```

```text result title="Result"
 ana.name | type(w)  | acme.name
----------+----------+-----------
 Ana      | works_at | Acme
(1 row)
1 edge created
```

An edge has exactly one label and one direction. To say that both people know each other, create two edges, or create one and match it in either direction (`(a)-[:knows]-(b)`).

## Text, dates and sources

Beyond properties, a node can carry a **text** that full-text search reads, and an edge can say **when** the fact was true:

```text run title="Example"
MATCH (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'})
CREATE (ana)-[:knows {@valid_from: '2022-03-01'}]->(bruno),
       (n:Note {title: 'Kickoff', @text: 'Ana and Bruno met at the kickoff meeting.'})
RETURN n.title, n.@text;
```

```text result title="Result"
 n.title | n.@text
---------+-------------------------------------------
 Kickoff | Ana and Bruno met at the kickoff meeting.
(1 row)
1 node created, 1 edge created
```

| Pseudo-property | On | Meaning |
| --- | --- | --- |
| `@text` | nodes | a text indexed for [full-text search](full-text.md) |
| `@embedding` | nodes | a vector, see [Vectors](../vectors/index.md) |
| `@valid_from`, `@valid_to` | edges | when the fact started and stopped being true, see [Time travel](time-travel.md) |
| `@sources` | both | the ids of the nodes this record came from |

## Values a property can hold

Strings, integers, floats, booleans, `null`, lists and maps:

```text run title="Example"
CREATE (t:Thing {name: 'sample', count: 3, ratio: 0.25, active: true,
                 tags: ['a', 'b'], size: {w: 2, h: 3}, note: null})
RETURN t.count + 1, t.tags[0], t.size.h, t.note;
```

```text result title="Result"
 t.count + 1 | t.tags[0] | t.size.h | t.note
-------------+-----------+----------+--------
 4           | a         | 3        | null
(1 row)
1 node created
```

:::tip Good to know
- A node without a label is refused: `CREATE ({name: 'x'})` fails.
- `CREATE` always creates. To create something only when it does not exist yet, use [MERGE](merge.md).
:::

```text run title="Example"
CREATE ({name: 'no label'});
```

```text result title="Result"
error: CREATE and MERGE need at least one label for each new node
```
