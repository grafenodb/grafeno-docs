---
title: Time travel
description: Give facts a period with @valid_from and @valid_to, ask what was true with VALID AT, what was known with KNOWN AT, and keep property history.
---

# Time travel

Every edge (fact) in Grafeno has two times: **when it was true in the world** (valid time, yours to set) and **when Grafeno knew it** (record time, set by Grafeno). You can ask a question at any moment on either. The [Time concept](../concepts/time.md) explains the idea; this page shows the statements.

## Syntax

```text
CREATE (a)-[:LABEL {@valid_from: '2021-03-01', @valid_to: '2024-01-31'}]->(b)
MATCH … VALID AT '2022-06-01' …     // what was true then
MATCH … KNOWN AT t …                // what Grafeno knew then
SET r.@valid_to = '2025-01-31'      // the fact stopped being true
RETRACT r                           // the fact was a mistake
```

## The example data

Ana worked at Acme from 2019 to January 2024, then moved to Orbit. Bruno joined Orbit in 2022:

```text run title="Example"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}),
       (acme:Company {name: 'Acme'}), (orbit:Company {name: 'Orbit'}),
       (ana)-[:works_at {@valid_from: '2019-04-01', @valid_to: '2024-01-31'}]->(acme),
       (ana)-[:works_at {@valid_from: '2024-02-01'}]->(orbit),
       (bruno)-[:works_at {@valid_from: '2022-06-15'}]->(orbit);
```

```text result title="Result"
4 nodes created, 3 edges created
```

## Every fact, with its period

Without `VALID AT`, `MATCH` sees every fact, past and present. A fact still true has no `@valid_to`:

```text run title="Example"
MATCH (p:Person)-[w:works_at]->(c)
RETURN p.name, c.name, date(w.@valid_from) AS from, date(w.@valid_to) AS to
ORDER BY from;
```

```text result title="Result"
 p.name | c.name | from       | to
--------+--------+------------+------------
 Ana    | Acme   | 2019-04-01 | 2024-01-31
 Bruno  | Orbit  | 2022-06-15 | null
 Ana    | Orbit  | 2024-02-01 | null
(3 rows)
```

## VALID AT: what was true at a moment

```text run title="Example"
MATCH (p:Person)-[:works_at]->(c) VALID AT '2023-01-01' RETURN p.name, c.name ORDER BY p.name;
```

```text result title="Result"
 p.name | c.name
--------+--------
 Ana    | Acme
 Bruno  | Orbit
(2 rows)
```

```text run title="Example"
MATCH (p:Person)-[:works_at]->(c) VALID AT datetime() RETURN p.name, c.name ORDER BY p.name;
```

```text result title="Result"
 p.name | c.name
--------+--------
 Ana    | Orbit
 Bruno  | Orbit
(2 rows)
```

## End a fact

Bruno leaves Orbit at the end of June 2025. The fact stays, now with an end:

```text run title="Example"
MATCH (:Person {name: 'Bruno'})-[w:works_at]->(:Company {name: 'Orbit'})
SET w.@valid_to = '2025-06-30';
MATCH (:Person {name: 'Bruno'})-[w:works_at]->(c) VALID AT '2025-01-01' RETURN c.name AS in_january;
MATCH (:Person {name: 'Bruno'})-[w:works_at]->(c) VALID AT '2025-08-01' RETURN c.name AS in_august;
```

```text result title="Result"
1 property set
 in_january
------------
 Orbit
(1 row)
 in_august
-----------
(0 rows)
```

## A timeline

`temporal.series` gives one moment per step, and `VALID AT` can use it: Orbit's headcount every half year:

```text run title="Example"
CALL temporal.series('2022-01-01', '2025-07-01', 'P6M') YIELD at
OPTIONAL MATCH (p:Person)-[:works_at]->(:Company {name: 'Orbit'}) VALID AT at
RETURN date(at) AS moment, count(p) AS people ORDER BY moment;
```

```text result title="Result"
 moment     | people
------------+--------
 2022-01-01 | 0
 2022-07-01 | 1
 2023-01-01 | 1
 2023-07-01 | 1
 2024-01-01 | 1
 2024-07-01 | 2
 2025-01-01 | 2
 2025-07-01 | 1
(8 rows)
```

## RETRACT and KNOWN AT

Someone records that Ana lives in Cusco. It was a mistake, so it is **retracted**, not ended. We note the moment between the two writes in a node, to ask about it later:

```text run title="Example"
MATCH (ana:Person {name: 'Ana'}) CREATE (ana)-[:lives_in]->(:City {name: 'Cusco'});
CREATE (:Moment {name: 'before the fix', at: datetime()});
MATCH (:Person {name: 'Ana'})-[r:lives_in]->() RETRACT r;
```

```text result title="Result"
1 node created, 1 edge created
1 node created
1 edge retracted
```

Now the fact is gone from current answers:

```text run title="Example"
MATCH (:Person {name: 'Ana'})-[:lives_in]->(c) RETURN c.name;
```

```text result title="Result"
 c.name
--------
(0 rows)
```

But `KNOWN AT` the earlier moment shows what Grafeno believed then:

```text run title="Example"
MATCH (m:Moment {name: 'before the fix'})
MATCH (:Person {name: 'Ana'})-[r:lives_in]->(c) KNOWN AT m.at
RETURN c.name, r.@expired_at IS NOT NULL AS corrected_later;
```

```text result title="Result"
 c.name | corrected_later
--------+-----------------
 Cusco  | true
(1 row)
```

## History of a property

A property declared **functional** keeps its earlier values; `history(n, key)` lists them:

```text run title="Example"
CREATE CONSTRAINT FOR (p:Person) REQUIRE p.city IS FUNCTIONAL;
MATCH (p:Person {name: 'Ana'}) SET p.city = 'Lima';
MATCH (p:Person {name: 'Ana'}) SET p.city = 'Quito';
MATCH (p:Person {name: 'Ana'}) RETURN p.city AS now, [h IN history(p, 'city') | h.value] AS before;
```

```text result title="Result"
 name                   | kind       | label  | property | rule                                   | on    | contradictions
------------------------+------------+--------+----------+----------------------------------------+-------+----------------
 Person_city_functional | functional | Person | city     | one value at a time, earlier ones kept | nodes | 0
(1 row)
1 property set
1 property set
 now   | before
-------+--------
 Quito | [Lima]
(1 row)
```

## Pseudo-properties of time

| On edges | Meaning |
| --- | --- |
| `@valid_from`, `@valid_to` | when the fact was true in the world (yours to set) |
| `@recorded_at` | when Grafeno recorded this version |
| `@expired_at` | when that version stopped being current (a correction, a retraction) |

| On nodes | Meaning |
| --- | --- |
| `@created_at`, `@updated_at` | when the node was created and last changed |

:::tip Which to use
`SET r.@valid_to` when the world changed; `RETRACT r` when the record was wrong; `DELETE r` only when the data must be forgotten.
:::
