---
title: Sizing vectors
description: How much disk and memory vectors take by dimension, what m and ef cost, which caches to set, and how fast inserts and searches are — measured.
---

# Sizing vectors

Vectors are usually the largest thing in a Grafeno database: a 768-dimension embedding is 3 KB of numbers, against a few hundred bytes for a typical node. This page helps you choose a dimension, estimate disk and memory, and set the caches. Every number comes from a measurement of the engine.

## What one vector costs

For each vector, Grafeno stores:

| Part | Size | Why |
| --- | --- | --- |
| The exact vector | 4 bytes × dimension | `f32` numbers, used to rescore the best candidates |
| An 8-bit copy | 1 byte × dimension + 4 | searches walk the graph with these quarter-size copies |
| HNSW links | about 30 × 16 bytes with `m` = 16 | the neighbor lists of the search graph (up to `2·m` per node at the base layer) |
| Keys | about 100 bytes | table keys for the three tables |

So, with the default `m` of 16, the tables hold about **5 × dimension + 600 bytes** per vector:

| Dimension | Per vector (tables) | 100 000 vectors | 1 000 000 vectors |
| --- | --- | --- | --- |
| 128 | 1.2 KB | 120 MB | 1.2 GB |
| 384 | 2.5 KB | 250 MB | 2.5 GB |
| 768 | 4.4 KB | 440 MB | 4.4 GB |
| 1 024 | 5.7 KB | 570 MB | 5.7 GB |
| 1 536 | 8.3 KB | 830 MB | 8.3 GB |

Measured: 20 000 vectors of 128 dimensions take 10.5 MiB of exact vectors, 3.1 MiB of 8-bit copies and 8.7 MiB of links, 1.17 KB per vector.

### The file is larger than the tables

The database file also holds pages that are not full and pages freed by earlier writes. Measured at 384 dimensions, 5 000 nodes:

| Stored as | File per node |
| --- | --- |
| no vector | 0.4 KB |
| the node's `@embedding` | 6.3 KB |
| a property in a [vector index](vector-indexes.md) | 13.1 KB |

A vector index costs about twice as much because the property itself stays in the node record, written as text (about 10 bytes per number), besides the index's own copies. When you do not need several vector spaces in a namespace, the node's `@embedding` is the compact choice.

:::tip Plan for the file, not the tables
Estimate disk as **2.5 × the table size** for a freshly loaded database. Backups (`grafeno backup`) write only what is used.
:::

## Choosing a dimension

The embedding model decides the dimension. When you can choose:

- **Disk and memory grow linearly** with the dimension: 1 536 dimensions cost four times 384.
- **Distance computations grow linearly too**: each step of a search compares the query with the candidates' 8-bit copies.
- **The links do not depend on the dimension**: at 128 dimensions they are about 40% of the size, at 1 536 about 6%.
- Small models (384 dimensions) are often enough for search over notes and documents; compare recall on your own questions before paying for 1 536.

## Memory

Three caches matter, in `[memory]` of the [settings](../reference/configuration.md):

| Setting | Default | For vectors |
| --- | --- | --- |
| `cache_mb` | 256 | pages of the file; searches read 8-bit copies and links from here |
| `vector_cache_mb` | 128 | vectors decoded while inserting: a larger cache makes bulk inserts much faster |
| `projection_cache_mb` | 256 | graphs for algorithms; not used by vector search |

A search touches a few hundred nodes' links and 8-bit copies, not the whole index. Measured with **1 000 000 vectors of 128 dimensions**: a search takes about **5 ms** with **140 MiB** resident, and fits in a 512 MiB container (3.5 to 4.2 ms per search there, with the 8-bit copies).

For steady low latency, give `cache_mb` room for the 8-bit copies and the links: about `(dimension + 500) bytes × vectors`. For one million 384-dimension vectors, that is about 900 MB.

## Inserts

Each insert searches the graph to find its neighbors, so inserts get slower as the index grows and the file outgrows the page cache. Measured on a laptop, 128 dimensions:

| Vectors | Insert time |
| --- | --- |
| the first 100 000 | 96 s |
| the last 100 000 of a million | 809 s |
| 300 000, `vector_cache_mb = 128` | 539 s |
| 300 000, `vector_cache_mb = 1024` | 284 s |

For a large first load, raise `vector_cache_mb` for the load, write in transactions of a few thousand nodes, and consider `background: true` on a [vector index](vector-indexes.md#build-in-the-background) so writes go on while it fills.

## Recall and speed: m and ef

HNSW is approximate: it may miss some of the true nearest vectors. Three settings trade quality for cost:

| Setting | Default | Raise it for | It costs |
| --- | --- | --- | --- |
| `m` | 16 | better recall on hard data | links grow with `m` (about 30 × 16 bytes at 16); slower inserts |
| `ef_construction` | 100 | a better graph | slower inserts only |
| `ef_search` / `ef` | 64 | better recall per search | slower searches |

Measured on 20 000 vectors of 128 dimensions in 64 clusters:

| `ef` | recall@10 | p50 | p99 |
| --- | --- | --- | --- |
| 16 | 0.956 | 0.32 ms | 0.61 ms |
| 32 | 0.996 | 0.41 ms | 0.72 ms |
| 64 (default) | 1.000 | 0.51 ms | 0.98 ms |
| 128 | 1.000 | 0.79 ms | 1.56 ms |
| 256 | 1.000 | 1.14 ms | 2.09 ms |

recall@10 is the share of the true 10 nearest that a search finds. It stays at 0.99 or more at `ef` 64 as vectors are deleted, inserted back and moved. A search can raise `ef` for itself: `db.searchVector(v, {index: 'docs', ef: 200})`. `grafeno check --recall 100` estimates the recall of your own index.

## Events with vectors

An [event subscription](../gq/events.md) `WITH VECTORS` copies each new vector into the change log. Measured with 384-dimension vectors: the log grew from 5.7 MiB to 190 MiB for the same writes. Keep the change log's window small (`[changes] max_entries`, `max_age_days`) when you use it.

## A worked example

One million documents, 768-dimension embeddings, as `@embedding`:

| | Estimate |
| --- | --- |
| Tables | 1 000 000 × 4.4 KB ≈ 4.4 GB |
| File after loading | ≈ 2.5 × 4.4 GB ≈ 11 GB |
| `cache_mb` for steady searches | (768 + 500) × 1 000 000 ≈ 1.3 GB |
| `vector_cache_mb` while loading | 1 024 or more |
| A search | a few milliseconds with the hot pages cached |

## Measure your own

```text run title="Example"
CREATE (:Doc {title: 'a', @embedding: [0.1, 0.2, 0.3]}), (:Doc {title: 'b', @embedding: [0.3, 0.2, 0.1]});
CALL db.stats() YIELD nodes, vectors, dimension;
```

```text result title="Result"
2 nodes created
 nodes | vectors | dimension
-------+---------+-----------
 2     | 2       | 3
(1 row)
```

`grafeno doctor` reports the file's free disk space and layout, `GET /v1/metrics` the server's counters, and `grafeno check` verifies the vector index against the records.
