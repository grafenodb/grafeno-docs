---
title: GQ reference
description: A compact reference to Grafeno's graph query language.
---

# GQ reference

GQ is Grafeno's query language. It resembles Cypher but adds bitemporal facts, memory fields, access statements, and Grafeno-specific procedures.

## Read

```cypher
MATCH (p:Person)-[r:works_at]->(o:Organization)
WHERE p.city = $city AND r.since >= 2020
RETURN p.name AS person, o.name AS organization
ORDER BY person
LIMIT 25;
```

Patterns may be directed or undirected. `OPTIONAL MATCH`, `WITH`, `UNWIND`, `UNION`, subqueries, aggregation, and variable-length paths are supported.

## Write

```cypher
CREATE (p:Person {name: 'Ana'})
SET p.city = 'Quito'
RETURN p.@id;
```

Use `MERGE` for an idempotent pattern and `DELETE` or `DETACH DELETE` to remove records. Every created node needs at least one label.

## Query time

```cypher
MATCH (p:Person)-[r:works_at]->(o)
VALID AT '2025-01-01'
KNOWN AT '2025-02-01'
RETURN p.name, o.name, r.@recorded_at;
```

`VALID AT` filters when facts were true; `KNOWN AT` filters what had been recorded at that point.

## Pseudo-properties

| Node | Relationship |
| --- | --- |
| `@id`, `@labels`, `@text`, `@embedding`, `@sources` | `@id`, `@label`, `@from`, `@to`, `@sources` |
| `@importance`, `@accesses`, `@last_access` | `@valid_from`, `@valid_to`, `@recorded_at`, `@expired_at`, `@recorded_by` |

Pseudo-properties are engine fields. Regular properties are JSON values and do not begin with `@`.

## Plan and measure

Prefix a query with `EXPLAIN` to see its plan without running it, or `PROFILE` to run it with row and read counts.

```cypher
EXPLAIN MATCH (p:Person {email: $email}) RETURN p;
```

Create property, text, vector, and fuzzy indexes through GQ. Parameters use `$name`; parameterize values rather than building query strings.

## Important differences from Cypher

- Every node must have a label.
- IDs are UUIDs, not integers.
- A variable-length traversal reaches each end node once by its shortest matching path.
- GQ is not the Bolt protocol, so Neo4j drivers do not connect to Grafeno.
- Unsupported syntax is rejected; compatibility with all of Cypher or GQL is not a goal.
