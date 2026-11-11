---
title: Time
description: Valid time and record time — what was true in the world, and what Grafeno knew — and how to end, correct and query facts.
sidebar_position: 2
---

# Time

Memory goes stale: people change jobs, plans change, a fact recorded last week turns out to be wrong. Grafeno never overwrites a fact. Every fact carries **two times**, and you can ask about any moment on either.

| Time | Fields | Answers |
| --- | --- | --- |
| **Valid time** | `@valid_from`, `@valid_to` | When was it true *in the world*? |
| **Record time** | `@recorded_at`, `@expired_at` | When did Grafeno *know* it? |

Valid time is yours to set (it defaults to "from now on"). Record time is set by Grafeno when it writes, and you cannot change it: it is the database's own history.

## The world changed: end the fact

Ana worked at Acme until January 2025. The fact was true then; it is not true now. End it in valid time:

```text
MATCH (:Person {name: 'Ana Torres'})-[w:works_at]->(:Company {name: 'Acme Robotics'})
SET w.@valid_to = '2025-01-31';
```

The fact stays, with its period. `VALID AT` asks what was true at a moment:

```text
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT '2023-06-01' RETURN c.name;   // Acme Robotics
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT datetime() RETURN c.name;     // Orbit Labs
```

Without `VALID AT`, a `MATCH` sees every fact that was not retracted, whatever its period, so history is easy to list (`date(w.@valid_from)`, `date(w.@valid_to)`).

## The record was wrong: retract it

Someone recorded that Ana lives in Cusco. She never did: it was a mistake. That is not the world changing, so do not end it — **retract** it:

```text
MATCH (:Person {name: 'Ana Torres'})-[r:lives_in]->() RETRACT r;
```

A retracted fact disappears from current knowledge:

```text
MATCH (:Person {name: 'Ana Torres'})-[:lives_in]->(c) RETURN c.name;
```

```text
 c.name
--------
(0 rows)
```

But Grafeno remembers that it believed it. `KNOWN AT` shows what Grafeno knew at a moment, before the correction:

```text
MATCH (:Person {name: 'Ana Torres'})-[r:lives_in]->(c)
KNOWN AT '2026-11-07T15:09:11Z'
RETURN c.name, r.@recorded_at, r.@expired_at;
```

```text
 c.name | r.@recorded_at              | r.@expired_at
--------+-----------------------------+-----------------------------
 Cusco  | 2026-11-07T15:09:10.298538Z | 2026-11-07T15:09:12.890820Z
(1 row)
```

That is what lets an agent explain itself later: "on that day I answered Cusco, because that is what I had been told."

## Which one to use

| What happened | Do | Then |
| --- | --- | --- |
| Something stopped being true | `SET r.@valid_to = '…'` | `VALID AT` before that date still finds it |
| A new fact replaces an old one | let a [constraint](../guides/agent-memory.md#keep-facts-from-contradicting-each-other) end the old one | each fact keeps its own period |
| The fact was never true | `RETRACT r` | only `KNOWN AT` an earlier moment shows it |
| The data must go (privacy, a test) | `DELETE r` | gone, with no history |

## Times you can write

Anywhere a time goes (`@valid_from`, `VALID AT`, `KNOWN AT`), Grafeno takes an ISO 8601 date or date-time (`'2024-05-01'`, `'2024-05-01T10:30:00Z'`, `'2024-05-01T10:30:00-05:00'`), a time value such as `datetime()`, or microseconds since the Unix epoch. Without an offset, UTC is assumed. Durations and date arithmetic (`duration('P1M')`, `date.truncate`) are in the [GQ reference](../reference/gq.md).

## Properties have history too

A node's property can keep its earlier values. Declare it **functional** and every change is remembered:

```text
CREATE CONSTRAINT FOR (p:Person) REQUIRE p.city IS FUNCTIONAL;
```

After `SET p.city = 'Quito'` on someone who lived in Lima, `p.city` is `'Quito'`, and `history(p, 'city')` returns the earlier values as a list of `{value, from, to, by}`, oldest first:

```text
MATCH (p:Person {name: 'Ana'}) RETURN [h IN history(p, 'city') | h.value] AS cities;   // [Lima]
```
