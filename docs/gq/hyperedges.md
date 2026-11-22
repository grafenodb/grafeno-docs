---
title: Hyperedges
description: "Facts that relate two or more nodes at once, each in a role: create, find, merge, change, time, indexes and rules."
---

# Hyperedges

An edge relates two nodes. Some facts relate more: a decision has who proposed it, who reviewed it, the task it is about and the evidence behind it. A **hyperedge** is one such fact, stored as a record of its own: a label, its **participants** (two or more nodes, each in a **role**), properties and the same valid and record times edges have.

Hyperedges are not edges: ordinary patterns `(a)-[r]->(b)`, paths and graph algorithms do not see them. GQ reads and writes them with clauses of their own: `MATCH HYPEREDGE`, `CREATE HYPEREDGE` and `MERGE HYPEREDGE`. They need engine 0.5 or later.

## The example data

```text run title="Example"
CREATE (:Agent {name: 'Ana'}), (:Agent {name: 'Bruno'}), (:Agent {name: 'Carla'}),
       (:Task {key: 'T-1', title: 'Billing queue'}),
       (:Task {key: 'T-2', title: 'Search cache'}),
       (:Report {title: 'Load test of the queue'});
```

```text result title="Result"
6 nodes created
```

## CREATE HYPEREDGE

The participants are nodes bound by an earlier clause, by their variables, each optionally `AS` a role:

```text run title="Example"
MATCH (a:Agent {name: 'Ana'}), (b:Agent {name: 'Bruno'}),
      (t:Task {key: 'T-1'}), (r:Report)
CREATE HYPEREDGE h:decision {summary: 'Use a message queue', status: 'proposed'}
       [(a) AS proposer, (b) AS reviewer, (t) AS subject, (r) AS evidence]
RETURN h.summary, size(participants(h));
```

```text result title="Result"
 h.summary           | size(participants(h))
---------------------+-----------------------
 Use a message queue | 4
(1 row)
1 hyperedge created, 2 properties set
```

A hyperedge needs at least two distinct nodes, and each (node, role) pair once. A node may take part twice in different roles:

```text run title="Example"
MATCH (c:Agent {name: 'Carla'}), (b:Agent {name: 'Bruno'}), (t:Task {key: 'T-2'})
CREATE HYPEREDGE :review [(c) AS author, (c) AS reviewer, (b), (t) AS subject];
```

```text result title="Result"
1 hyperedge created
```

```text run title="Example"
MATCH (a:Agent {name: 'Ana'}), (b:Agent {name: 'Bruno'})
CREATE HYPEREDGE :pair [(a), (a)];
```

```text result title="Result"
error: invalid input: node 01a20533-0b66-72ae-97d5-9be4f74b3caa takes part twice without a role
```

## MATCH HYPEREDGE

Members bind the participants, by role or not; each match is a row:

```text run title="Example"
MATCH HYPEREDGE h:decision [(p) AS proposer, (t:Task) AS subject]
RETURN h.summary, p.name, t.key;
```

```text result title="Result"
 h.summary           | p.name | t.key
---------------------+--------+-------
 Use a message queue | Ana    | T-1
(1 row)
```

A member without a role takes any participant, and members never share one, so two members give every pair:

```text run title="Example"
MATCH HYPEREDGE h:review [(x:Agent), (y:Agent)]
RETURN x.name, y.name ORDER BY x.name, y.name;
```

```text result title="Result"
 x.name | y.name
--------+--------
 Bruno  | Carla
 Carla  | Bruno
 Carla  | Carla
(3 rows)
```

`participants(h)` lists them all: each a map with the node and its role:

```text run title="Example"
MATCH HYPEREDGE h:decision
UNWIND participants(h) AS p
RETURN p.role, coalesce(p.node.name, p.node.key, p.node.title) AS who ORDER BY p.role;
```

```text result title="Result"
 p.role   | who
----------+------------------------
 evidence | Load test of the queue
 proposer | Ana
 reviewer | Bruno
 subject  | T-1
(4 rows)
```

### From a node

A node bound earlier is the fastest way in: the match reads its hyperedges, not every one.

```text run title="Example"
MATCH (b:Agent {name: 'Bruno'})
MATCH HYPEREDGE h [(b) AS role_of_bruno]
RETURN type(h), h.summary;
```

```text result title="Result"
 type(h) | h.summary
---------+-----------
(0 rows)
```

The member above has a role name nobody uses, so nothing matches. Without a role, Bruno in any role:

```text run title="Example"
MATCH (b:Agent {name: 'Bruno'})
MATCH HYPEREDGE h [(b)]
RETURN type(h) ORDER BY type(h);
```

```text result title="Result"
 type(h)
----------
 decision
 review
(2 rows)
```

### Exactly these nodes

With `EXACT`, the members' nodes must be all the hyperedge's nodes:

```text run title="Example"
MATCH (a:Agent {name: 'Ana'}), (b:Agent {name: 'Bruno'})
OPTIONAL MATCH HYPEREDGE h [(a), (b)] EXACT
RETURN count(h) AS only_ana_and_bruno;
```

```text result title="Result"
 only_ana_and_bruno
--------------------
 0
(1 row)
```

### Properties and WHERE

```text run title="Example"
MATCH HYPEREDGE h:decision {status: 'proposed'}
WHERE h.summary STARTS WITH 'Use'
RETURN h.summary, h.@valid_from, h.@recorded_by;
```

```text result title="Result"
 h.summary           | h.@valid_from | h.@recorded_by
---------------------+---------------+----------------
 Use a message queue | null          | null
(1 row)
```

## Changing one

`SET` and `REMOVE` change properties as on nodes:

```text run title="Example"
MATCH HYPEREDGE h:decision
SET h.status = 'approved', h.votes = 3
RETURN h.status, h.votes;
```

```text result title="Result"
 h.status | h.votes
----------+---------
 approved | 3
(1 row)
2 properties set
```

## MERGE HYPEREDGE

`MERGE HYPEREDGE` finds the hyperedge it names or creates it. It is the same one when it has the label, the properties written in the pattern and exactly the same (node, role) pairs, in any order, and holds now:

```text run title="Example"
MATCH (a:Agent {name: 'Ana'}), (c:Agent {name: 'Carla'}), (t:Task {key: 'T-2'})
MERGE HYPEREDGE m:meeting {key: 'M-1'} [(a) AS host, (c) AS guest, (t) AS subject]
ON CREATE SET m.created = true
ON MATCH SET m.seen = coalesce(m.seen, 0) + 1
RETURN m.created, m.seen;
```

```text result title="Result"
 m.created | m.seen
-----------+--------
 true      | null
(1 row)
1 hyperedge created, 2 properties set
```

Run again, it finds the one it made (`created` is the property set then):

```text run title="Example"
MATCH (a:Agent {name: 'Ana'}), (c:Agent {name: 'Carla'}), (t:Task {key: 'T-2'})
MERGE HYPEREDGE m:meeting {key: 'M-1'} [(t) AS subject, (c) AS guest, (a) AS host]
ON CREATE SET m.created = true
ON MATCH SET m.seen = coalesce(m.seen, 0) + 1
RETURN m.created, m.seen;
```

```text result title="Result"
 m.created | m.seen
-----------+--------
 true      | 1
(1 row)
1 property set
```

Being among the same nodes is not being the same event: two meetings of the same people are two hyperedges. Give events a property that tells them apart (`key` above); a pattern without one matches every meeting of those participants.

## Time: invalidate and retract

As with edges, a `MATCH HYPEREDGE` sees current knowledge whatever the valid time, and `VALID AT` asks what was true at a time. A hyperedge that stopped being true gets an end in valid time and stays as history; one recorded by mistake is retracted, and reads leave it out:

```text run title="Example"
MATCH HYPEREDGE h:review SET h.@valid_to = datetime('2026-06-01T00:00:00Z');
MATCH HYPEREDGE h:review VALID AT datetime('2026-03-01T00:00:00Z') RETURN count(h) AS in_march;
MATCH HYPEREDGE h:review VALID AT datetime('2026-07-01T00:00:00Z') RETURN count(h) AS in_july;
```

```text result title="Result"
1 property set
 in_march
----------
 1
(1 row)
 in_july
---------
 0
(1 row)
```

```text run title="Example"
MATCH HYPEREDGE h:meeting RETRACT h;
MATCH HYPEREDGE h:meeting RETURN count(h);
```

```text result title="Result"
1 hyperedge retracted
 count(h)
----------
 0
(1 row)
```

## Deleting

`DELETE h` deletes a hyperedge. A node that takes part in one is not deleted by `DELETE n`: `DETACH DELETE n` takes it out first (and deletes a hyperedge left with fewer than two nodes):

```text run title="Example"
MATCH (r:Report) DELETE r;
```

```text result title="Result"
error: conflict: node 01a20533-0b66-72b3-8bc4-9975fd17c86e takes part in hyperedges: delete them first, or take it out of them as it goes (GQ DETACH DELETE; over HTTP ?hyperedges=detach, or cascade to delete them; in Rust, delete_node_with)
```

```text run title="Example"
MATCH (r:Report) DETACH DELETE r;
MATCH HYPEREDGE h:decision RETURN size(participants(h));
```

```text result title="Result"
1 node deleted
 size(participants(h))
-----------------------
 3
(1 row)
```

## Indexes and rules

Without an index, finding a hyperedge by a property reads every one of its label. An index on hyperedges reads only what it finds:

```text run title="Example"
CREATE INDEX FOR HYPEREDGE h:decision ON (h.status);
EXPLAIN MATCH HYPEREDGE h:decision WHERE h.status = 'approved' RETURN h;
```

```text result title="Result"
 name                      | label    | property | unique | entries | fuzzy | on         | key   | kind  | state
---------------------------+----------+----------+--------+---------+-------+------------+-------+-------+--------
 decision_status_hyperedge | decision | status   | false  | 1       | false | hyperedges | false | value | online
(1 row)
 step | operation       | details                                                      | rows | cost
------+-----------------+--------------------------------------------------------------+------+------
 1    | MATCH HYPEREDGE | hyperedges h:decision by index decision_status_hyperedge (p… | 2.0  | 20.0
 2    | RETURN          | h                                                            | 2.0  | 24.0
(2 rows)
```

Unique and key constraints, not null and type rules, and functional properties (which keep their earlier values) work on hyperedges as on nodes:

```text run title="Example"
CREATE CONSTRAINT FOR HYPEREDGE h:decision REQUIRE h.status IS NOT NULL;
CREATE CONSTRAINT FOR HYPEREDGE h:decision REQUIRE h.status IS FUNCTIONAL;
MATCH HYPEREDGE h:decision SET h.status = 'done';
MATCH HYPEREDGE h:decision RETURN [e IN history(h, 'status') | e.value] AS before;
```

```text result title="Result"
 name                     | kind     | label    | property | rule              | on         | contradictions
--------------------------+----------+----------+----------+-------------------+------------+----------------
 decision_status_not_null | not_null | decision | status   | present, not null | hyperedges | 0
(1 row)
 name                       | kind       | label    | property | rule                                   | on         | contradictions
----------------------------+------------+----------+----------+----------------------------------------+------------+----------------
 decision_status_functional | functional | decision | status   | one value at a time, earlier ones kept | hyperedges | 0
(1 row)
1 property set
 before
------------
 [approved]
(1 row)
```

```text run title="Example"
MATCH HYPEREDGE h:decision REMOVE h.status;
```

```text result title="Result"
error: invalid input: decision_status_not_null: hyperedge 01a20533-0b6c-73af-afe6-bc4ae9db7e55 has no status
```

## Counting per row

A subquery counts or tests hyperedges for each row:

```text run title="Example"
MATCH (a:Agent)
CALL { WITH a MATCH HYPEREDGE h [(a)] RETURN count(h) AS taking_part }
RETURN a.name, taking_part ORDER BY a.name;
```

```text result title="Result"
 a.name | taking_part
--------+-------------
 Ana    | 1
 Bruno  | 2
 Carla  | 1
(3 rows)
```

## Outside GQ

The HTTP API has routes for hyperedges (`/v1/{ns}/hyperedges`, finding them by participants, a node's), batches take them, CSV and GraphML exports carry them, and the [TypeScript client](../clients/typescript.md) has methods for each. Memory recall does not return hyperedges: for events an agent should recall, a node joined to its participants by an edge per role works as well.
