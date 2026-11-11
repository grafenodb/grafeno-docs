---
title: Modelo de datos
description: Nodos, relaciones, namespaces, tiempo, procedencia, texto y vectores.
---

# Modelo de datos

Grafeno almacena un grafo de propiedades. Los nodos representan entidades, documentos, episodios u otros registros. Las relaciones dirigidas representan hechos entre ellos.

## Nodos y relaciones

Cada nodo tiene al menos una etiqueta y un identificador UUID v7. También puede contener propiedades JSON, texto indexable, un embedding, fuentes y metadatos de memoria como importancia y cantidad de accesos.

Una relación tiene etiqueta, nodo de origen, nodo de destino, propiedades opcionales, fuentes y campos temporales.

```text
CREATE (p:Person {name: 'Ana', city: 'Quito'})
CREATE (d:Document {title: 'Entrevista', @text: 'Ana ingresó al hospital.'})
CREATE (d)-[:mentions]->(p);
```

Los campos que comienzan con `@` son pseudopropiedades, no propiedades JSON del usuario. Algunos ejemplos son `@id`, `@text`, `@embedding`, `@valid_from`, `@valid_to`, `@recorded_at` y `@recorded_by`.

## Namespaces

Cada registro pertenece a un namespace. Úsalos para tenants, personas, equipos, agentes o ambientes. Las consultas permanecen dentro de uno, salvo que una operación administrativa se dirija explícitamente a varios.

## Dos ejes de tiempo

Grafeno distingue:

| Tiempo | Campos | Significado |
| --- | --- | --- |
| Tiempo válido | `valid_from`, `valid_to` | Cuándo el hecho era cierto en el mundo. |
| Tiempo de registro | `recorded_at`, `expired_at` | Cuándo Grafeno conocía el hecho. |

`VALID AT` reconstruye el mundo en un momento. `KNOWN AT` reconstruye lo que la base sabía entonces. Invalidar una relación indica que el mundo cambió; retractarla indica que el hecho registrado era incorrecto.

```text
MATCH (p:Person)-[:works_at]->(o)
VALID AT '2024-06-01'
RETURN p.name, o.name;
```

## Procedencia y recuperación

Los `sources` de un nodo o relación apuntan a los registros de los cuales se derivaron. Grafeno puede combinar búsqueda BM25, búsqueda vectorial HNSW y expansión del grafo. El cliente proporciona los embeddings; el motor los almacena y busca, pero no llama a un modelo de embeddings.
