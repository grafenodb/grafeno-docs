---
title: Data model
description: Nodes, relationships, namespaces, time, provenance, text, and vectors.
---

# Data model

Grafeno stores a property graph. Nodes represent entities, documents, episodes, or any other record. Directed relationships represent facts between them.

## Nodes and relationships

Every node has at least one label and a UUID v7 identifier. It may also contain JSON properties, searchable text, an embedding, sources, and memory metadata such as importance and access count.

A relationship has a label, a source node, a target node, optional properties, sources, and time fields.

```text
CREATE (p:Person {name: 'Ana', city: 'Quito'})
CREATE (d:Document {title: 'Interview', @text: 'Ana joined the hospital.'})
CREATE (d)-[:mentions]->(p);
```

Fields beginning with `@` are pseudo-properties rather than user JSON properties. Common examples are `@id`, `@text`, `@embedding`, `@valid_from`, `@valid_to`, `@recorded_at`, and `@recorded_by`.

## Namespaces

Every record belongs to a namespace. Use them for tenants, people, teams, agents, or environments. Queries stay inside one namespace unless an administrative operation explicitly addresses several.

## Two time axes

Grafeno distinguishes:

| Time | Fields | Meaning |
| --- | --- | --- |
| Valid time | `valid_from`, `valid_to` | When the fact was true in the world. |
| Record time | `recorded_at`, `expired_at` | When Grafeno knew the fact. |

`VALID AT` reconstructs the world at a time. `KNOWN AT` reconstructs what the database knew then. Invalidating a relationship says the world changed; retracting it says the recorded fact was wrong.

```text
MATCH (p:Person)-[:works_at]->(o)
VALID AT '2024-06-01'
RETURN p.name, o.name;
```

## Provenance and retrieval

The `sources` of a node or relationship point to the records from which it was derived. Grafeno can combine BM25 text search, HNSW vector search, and graph expansion. The client supplies embeddings; the engine stores and searches them but does not call an embedding model.
