---
title: DELETE
description: Delete nodes and edges, with DETACH DELETE for nodes that still have edges, and RETRACT for facts recorded by mistake.
---

# DELETE

`DELETE` removes nodes and edges. Deleting a node also deletes its edges; `DETACH DELETE` is the same, written explicitly.

## Syntax

```text
MATCH … DELETE n           // a node (with its edges), or an edge
MATCH … DETACH DELETE n    // the same for a node, said explicitly
```

## The example data

```text run title="Example"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}),
       (carla:Person {name: 'Carla'}), (tmp:Draft {title: 'old'}),
       (ana)-[:knows]->(bruno), (bruno)-[:knows]->(carla);
```

```text result title="Result"
4 nodes created, 2 edges created
```

## Delete a node

Match it, then delete it:

```text run title="Example"
MATCH (d:Draft) DELETE d;
```

```text result title="Result"
1 node deleted
```

## A node with edges

A node is never left with edges pointing nowhere: deleting it deletes its edges too. `DETACH DELETE` says so explicitly and does the same:

```text run title="Example"
MATCH (b:Person {name: 'Bruno'}) DETACH DELETE b;
MATCH (p:Person) RETURN p.name ORDER BY p.name;
MATCH ()-[k:knows]->() RETURN count(k) AS knows_edges;
```

```text result title="Result"
1 node deleted
 p.name
--------
 Ana
 Carla
(2 rows)
 knows_edges
-------------
 0
(1 row)
```

## Delete an edge

Match the edge with a variable and delete it; the nodes stay:

```text run title="Example"
MATCH (a:Person {name: 'Ana'}), (c:Person {name: 'Carla'})
CREATE (a)-[:knows]->(c);
MATCH (:Person {name: 'Ana'})-[k:knows]->(:Person {name: 'Carla'}) DELETE k;
MATCH ()-[k:knows]->() RETURN count(k) AS knows_edges;
```

```text result title="Result"
1 edge created
1 edge deleted
 knows_edges
-------------
 0
(1 row)
```

## Delete everything with a label

```text run title="Example"
MATCH (p:Person) DETACH DELETE p;
MATCH (n) RETURN count(n) AS nodes;
```

```text result title="Result"
2 nodes deleted
 nodes
-------
 0
(1 row)
```

## Deleting a fact, or ending it

A fact that **was true** and stopped being true should not be deleted: give it an end with `SET r.@valid_to`, and its history stays for [time travel](time-travel.md). A fact **recorded by mistake** can be retracted with `RETRACT r`: it disappears from current answers, and `KNOWN AT` an earlier time still shows what was believed then.

| You want to say | Write |
| --- | --- |
| it is no longer true | `SET r.@valid_to = '2025-06-30'` |
| it was never true (a mistake) | `RETRACT r` |
| forget it entirely | `DELETE r` |
