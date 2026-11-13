---
title: Dimensionamiento de vectores
description: Cuánto disco y memoria ocupan los vectores según su dimensión, qué cuestan m y ef, qué cachés configurar y qué tan rápidas son las inserciones y búsquedas, medido.
---

# Dimensionamiento de vectores

Los vectores suelen ser lo más grande de una base de Grafeno: un embedding de 768 dimensiones son 3 KB de números, frente a unos cientos de bytes de un nodo típico. Esta página te ayuda a elegir una dimensión, estimar disco y memoria y configurar las cachés. Cada número sale de una medición del motor.

## Cuánto cuesta un vector

Por cada vector, Grafeno guarda:

| Parte | Tamaño | Para qué |
| --- | --- | --- |
| El vector exacto | 4 bytes × dimensión | números `f32`, para volver a puntuar los mejores candidatos |
| Una copia de 8 bits | 1 byte × dimensión + 4 | las búsquedas recorren el grafo con estas copias de un cuarto del tamaño |
| Enlaces HNSW | unos 30 × 16 bytes con `m` = 16 | las listas de vecinos del grafo de búsqueda (hasta `2·m` por nodo en la capa base) |
| Claves | unos 100 bytes | claves de las tres tablas |

Así, con el `m` por defecto de 16, las tablas ocupan unos **5 × dimensión + 600 bytes** por vector:

| Dimensión | Por vector (tablas) | 100 000 vectores | 1 000 000 vectores |
| --- | --- | --- | --- |
| 128 | 1,2 KB | 120 MB | 1,2 GB |
| 384 | 2,5 KB | 250 MB | 2,5 GB |
| 768 | 4,4 KB | 440 MB | 4,4 GB |
| 1 024 | 5,7 KB | 570 MB | 5,7 GB |
| 1 536 | 8,3 KB | 830 MB | 8,3 GB |

Medido: 20 000 vectores de 128 dimensiones ocupan 10,5 MiB de vectores exactos, 3,1 MiB de copias de 8 bits y 8,7 MiB de enlaces, 1,17 KB por vector.

### El archivo es más grande que las tablas

El archivo de la base también guarda páginas no llenas y páginas liberadas por escrituras anteriores. Medido con 384 dimensiones y 5 000 nodos:

| Guardado como | Archivo por nodo |
| --- | --- |
| sin vector | 0,4 KB |
| el `@embedding` del nodo | 6,3 KB |
| una propiedad en un [índice vectorial](vector-indexes.md) | 13,1 KB |

Un índice vectorial cuesta cerca del doble porque la propiedad misma queda en el registro del nodo, escrita como texto (unos 10 bytes por número), además de las copias propias del índice. Cuando no necesitas varios espacios vectoriales en un namespace, el `@embedding` del nodo es la opción compacta.

:::tip Calcula el archivo, no las tablas
Estima el disco como **2,5 × el tamaño de las tablas** para una base recién cargada. Los respaldos (`grafeno backup`) escriben solo lo que se usa.
:::

## Elegir una dimensión

El modelo de embeddings decide la dimensión. Cuando puedes elegir:

- **El disco y la memoria crecen en proporción** a la dimensión: 1 536 dimensiones cuestan cuatro veces 384.
- **Los cálculos de distancia también**: cada paso de una búsqueda compara la consulta con las copias de 8 bits de los candidatos.
- **Los enlaces no dependen de la dimensión**: con 128 dimensiones son cerca del 40 % del tamaño, con 1 536 cerca del 6 %.
- Los modelos chicos (384 dimensiones) suelen bastar para buscar en notas y documentos; compara el recall con tus propias preguntas antes de pagar por 1 536.

## Memoria

Tres cachés importan, en `[memory]` de la [configuración](../reference/configuration.md):

| Opción | Por defecto | Para vectores |
| --- | --- | --- |
| `cache_mb` | 256 | páginas del archivo; las búsquedas leen de aquí las copias de 8 bits y los enlaces |
| `vector_cache_mb` | 128 | vectores decodificados al insertar: una caché más grande acelera mucho las cargas masivas |
| `projection_cache_mb` | 256 | grafos para algoritmos; la búsqueda vectorial no la usa |

Una búsqueda toca los enlaces y copias de 8 bits de unos cientos de nodos, no del índice entero. Medido con **1 000 000 de vectores de 128 dimensiones**: una búsqueda tarda unos **5 ms** con **140 MiB** residentes, y cabe en un contenedor de 512 MiB (de 3,5 a 4,2 ms por búsqueda ahí, con las copias de 8 bits).

Para una latencia baja y estable, dale a `cache_mb` espacio para las copias de 8 bits y los enlaces: unos `(dimensión + 500) bytes × vectores`. Para un millón de vectores de 384 dimensiones, son unos 900 MB.

## Inserciones

Cada inserción busca en el grafo para encontrar sus vecinos, así que las inserciones se hacen más lentas a medida que crece el índice y el archivo supera la caché de páginas. Medido en un portátil, 128 dimensiones:

| Vectores | Tiempo de inserción |
| --- | --- |
| los primeros 100 000 | 96 s |
| los últimos 100 000 de un millón | 809 s |
| 300 000, `vector_cache_mb = 128` | 539 s |
| 300 000, `vector_cache_mb = 1024` | 284 s |

Para una primera carga grande, sube `vector_cache_mb` durante la carga, escribe en transacciones de unos miles de nodos y considera `background: true` en un [índice vectorial](vector-indexes.md#construir-en-segundo-plano) para que las escrituras sigan mientras se llena.

## Recall y velocidad: m y ef

HNSW es aproximado: puede perder algunos de los vecinos verdaderamente más cercanos. Tres opciones cambian calidad por costo:

| Opción | Por defecto | Súbela para | Cuesta |
| --- | --- | --- | --- |
| `m` | 16 | mejor recall con datos difíciles | los enlaces crecen con `m` (unos 30 × 16 bytes con 16); inserciones más lentas |
| `ef_construction` | 100 | un mejor grafo | solo inserciones más lentas |
| `ef_search` / `ef` | 64 | mejor recall por búsqueda | búsquedas más lentas |

Medido con 20 000 vectores de 128 dimensiones en 64 grupos:

| `ef` | recall@10 | p50 | p99 |
| --- | --- | --- | --- |
| 16 | 0,956 | 0,32 ms | 0,61 ms |
| 32 | 0,996 | 0,41 ms | 0,72 ms |
| 64 (por defecto) | 1,000 | 0,51 ms | 0,98 ms |
| 128 | 1,000 | 0,79 ms | 1,56 ms |
| 256 | 1,000 | 1,14 ms | 2,09 ms |

recall@10 es la parte de los 10 vecinos verdaderamente más cercanos que encuentra una búsqueda. Se mantiene en 0,99 o más con `ef` 64 cuando se borran vectores, se vuelven a insertar y se mueven. Una búsqueda puede subir su propio `ef`: `db.searchVector(v, {index: 'docs', ef: 200})`. `grafeno check --recall 100` estima el recall de tu propio índice.

## Desgaste: eliminaciones y compactación

Eliminar o reemplazar un vector repara los enlaces de sus vecinos en lugar de elegirlos de nuevo. Tras muchas eliminaciones —deduplicación, fusiones, olvido, consolidación— algunos vectores pueden quedar sin ningún enlace que apunte a ellos, y ninguna búsqueda los alcanza. Cada grafo vectorial (el del propio namespace y el de cada índice vectorial) cuenta sus eliminaciones desde que se construyó:

```bash
curl http://127.0.0.1:7810/v1/demo/vectors/health -H "Authorization: Bearer $TOKEN"
```

```json
[{"index": null, "dimension": 128, "vectors": 20000, "removed": 38000, "repaired": 1711815, "churn": 1.9, "building": false}]
```

El servidor compacta (vuelve a construir) un grafo cuando `churn` (eliminaciones sobre vectores) llega a `compact_vectors_at` (0,5) en `[background]`, para grafos de 1 000 a 50 000 vectores. Una compactación retiene al escritor más o menos lo que tardaría insertar de nuevo cada vector (unos 6 s para 20 000 de 128 dimensiones); las búsquedas usan el grafo anterior hasta que confirma. Los grafos más grandes quedan a tu cargo, en un momento tranquilo: `grafeno compact -n NS` (también cada índice vectorial) o `POST /v1/{ns}/compact?index=docs`. Medido en el grafo de arriba tras cinco rondas de cambios: el recall@10 con `ef` 64 pasó de 0,995 a 1,000 y los vectores que ninguna búsqueda alcanzaba, de 8 a 0.

## Eventos con vectores

Una [suscripción a eventos](../gq/events.md) `WITH VECTORS` copia cada vector nuevo al registro de cambios. Medido con vectores de 384 dimensiones: el registro pasó de 5,7 MiB a 190 MiB para las mismas escrituras. Mantén chica la ventana del registro de cambios (`[changes] max_entries`, `max_age_days`) cuando la uses.

## Un ejemplo completo

Un millón de documentos, embeddings de 768 dimensiones, como `@embedding`:

| | Estimación |
| --- | --- |
| Tablas | 1 000 000 × 4,4 KB ≈ 4,4 GB |
| Archivo después de cargar | ≈ 2,5 × 4,4 GB ≈ 11 GB |
| `cache_mb` para búsquedas estables | (768 + 500) × 1 000 000 ≈ 1,3 GB |
| `vector_cache_mb` durante la carga | 1 024 o más |
| Una búsqueda | unos pocos milisegundos con las páginas calientes en caché |

## Mide lo tuyo

```text run title="Ejemplo"
CREATE (:Doc {title: 'a', @embedding: [0.1, 0.2, 0.3]}), (:Doc {title: 'b', @embedding: [0.3, 0.2, 0.1]});
CALL db.stats() YIELD nodes, vectors, dimension;
```

```text result title="Resultado"
2 nodes created
 nodes | vectors | dimension
-------+---------+-----------
 2     | 2       | 3
(1 row)
```

`grafeno doctor` informa el espacio libre en disco y la versión de formato del archivo, `GET /v1/metrics` los contadores del servidor, y `grafeno check` verifica el índice vectorial contra los registros.
