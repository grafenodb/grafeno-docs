---
title: Procedimientos
description: Llama procedimientos incluidos con CALL y YIELD para listar etiquetas, propiedades e índices, contar un namespace, buscar y explorar.
---

# Procedimientos

Un procedimiento es una operación incluida que da filas. `CALL` lo ejecuta; `YIELD` elige y renombra sus columnas; la consulta sigue desde ellas como desde un `MATCH`.

## Sintaxis

```text
CALL procedimiento(argumentos) [YIELD columna [AS nombre], … [WHERE condición]]
```

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (ana:Person {name: 'Ana', age: 34, city: 'Lima'}),
       (bruno:Person {name: 'Bruno', age: 28, city: 'Quito'}),
       (carla:Person {name: 'Carla', age: 45, city: 'Lima'}),
       (diego:Person {name: 'Diego', age: 39, city: 'Bogotá'}),
       (eva:Person {name: 'Eva', age: 23, city: 'Quito'}),
       (acme:Company {name: 'Acme', sector: 'robotics'}),
       (orbit:Company {name: 'Orbit', sector: 'software'}),
       (ana)-[:works_at {since: 2019}]->(acme),
       (carla)-[:works_at {since: 2015}]->(acme),
       (bruno)-[:works_at {since: 2022}]->(orbit),
       (diego)-[:works_at {since: 2020}]->(orbit),
       (ana)-[:knows]->(bruno), (ana)-[:knows]->(carla),
       (bruno)-[:knows]->(diego), (carla)-[:knows]->(diego),
       (diego)-[:knows]->(eva);
```

```text result title="Resultado"
7 nodes created, 9 edges created
```

## Qué hay en un namespace

```text run title="Ejemplo"
CALL db.labels();
```

```text result title="Resultado"
 label   | count
---------+-------
 Company | 2
 Person  | 5
(2 rows)
```

```text run title="Ejemplo"
CALL db.edgeLabels();
```

```text result title="Resultado"
 label    | count
----------+-------
 knows    | 5
 works_at | 4
(2 rows)
```

```text run title="Ejemplo"
CALL db.propertyKeys() YIELD key RETURN key ORDER BY key;
```

```text result title="Resultado"
 key
--------
 age
 city
 name
 sector
 since
(5 rows)
```

```text run title="Ejemplo"
CALL db.stats();
```

```text result title="Resultado"
 nodes | edges | texts | vectors | dimension
-------+-------+-------+---------+-----------
 7     | 9     | 0     | 0       | null
(1 row)
```

## YIELD, renombrar y filtrar

```text run title="Ejemplo"
CALL db.labels() YIELD label, count AS nodes WHERE nodes > 2 RETURN label, nodes;
```

```text result title="Resultado"
 label  | nodes
--------+-------
 Person | 5
(1 row)
```

## Estadísticas del planificador

`db.analyze()` reconstruye las estadísticas que usa el planificador para elegir dónde empieza un patrón, y las lista:

```text run title="Ejemplo"
CREATE INDEX FOR (p:Person) ON (p.city);
CALL db.analyze() YIELD kind, name, count, distinct RETURN kind, name, count, distinct;
```

```text result title="Resultado"
 name        | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_city | Person | city     | false  | 5       | false | nodes | false | value | online
(1 row)
 kind  | name        | count | distinct
-------+-------------+-------+----------
 index | Person_city | 5     | 3
 edge  | knows       | 5     | null
 edge  | works_at    | 4     | null
(3 rows)
```

## Todos los procedimientos

`dbms.procedures()` lista cada procedimiento con sus argumentos y columnas; aquí los primeros de la familia `db`:

```text run title="Ejemplo"
CALL dbms.procedures() YIELD name, arguments
WHERE name STARTS WITH 'db.'
RETURN name, arguments ORDER BY name LIMIT 6;
```

```text result title="Resultado"
 name          | arguments
---------------+-------------------------------
 db.analyze    |
 db.audit      | since = 0, limit = 1000
 db.edgeLabels |
 db.indexes    |
 db.labels     |
 db.match      | label, properties, limit = 10
(6 rows)
```

## Los procedimientos

| Procedimiento | Da | |
| --- | --- | --- |
| `db.labels()` | `label`, `count` | etiquetas de nodos y cuántos tienen cada una |
| `db.edgeLabels()` | `label`, `count` | etiquetas de aristas y cuántas hay |
| `db.propertyKeys()` | `key` | nombres de propiedades en uso |
| `db.stats()` | `nodes`, `edges`, `texts`, `vectors`, `dimension` | cuentas del namespace |
| `db.indexes()` | filas de índices | lo mismo que `SHOW INDEXES` |
| `db.analyze()` | estadísticas | reconstruye y lista las estadísticas del planificador |
| `db.search(texto, …)` | `node`, `score` | búsqueda de texto, vectorial o híbrida: [Texto completo](full-text.md), [Búsqueda híbrida](../vectors/hybrid-search.md) |
| `db.searchIndex(índice, consulta, …)` | `node`, `score`, `fragments` | un índice de texto completo |
| `db.searchFuzzy(etiqueta, clave, texto, …)` | `node`, `score` | texto parecido: [Texto parecido](similar-text.md) |
| `db.match(etiqueta, propiedades, …)` | `node`, `score`, `decision`, `fields` | registros que pueden ser la misma entidad |
| `db.searchVector(vector, …)`, `db.searchVectors`, `db.similar` | `node`, `score` | vectores más cercanos: [Vectores](../vectors/index.md) |
| `temporal.series(inicio, fin, paso)` | `at` | un tiempo por paso: [Fechas](dates.md#una-serie-de-tiempos) |
| `algo.*` | según el algoritmo | algoritmos de grafos: [Algoritmos de grafos](../algorithms/index.md) |
| `dbms.procedures()` | `name`, `arguments`, `columns`, `description` | esta lista |

## CALL a mitad de una consulta

Los argumentos pueden usar las variables de la fila, así que un `CALL` después de un `MATCH` se ejecuta una vez por fila:

```text run title="Ejemplo"
MATCH (c:Company)
CALL temporal.series('2024-01-01', '2024-03-01', 'P1M') YIELD at
RETURN c.name, count(at) AS months;
```

```text result title="Resultado"
 c.name | months
--------+--------
 Acme   | 3
 Orbit  | 3
(2 rows)
```
