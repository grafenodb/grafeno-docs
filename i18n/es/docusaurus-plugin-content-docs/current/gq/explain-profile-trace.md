---
title: EXPLAIN, PROFILE y TRACE
description: Mira el plan de una sentencia, mide cada paso y registra cómo recorre el grafo, evento por evento.
---

# EXPLAIN, PROFILE y TRACE

Tres prefijos te dicen qué hace una sentencia:

| Prefijo | ¿Ejecuta la sentencia? | Muestra |
| --- | --- | --- |
| `EXPLAIN` | no | el plan: dónde empieza cada patrón, las filas y el costo estimados |
| `PROFILE` | sí | el plan con las filas, registros leídos y milisegundos de cada paso |
| `TRACE` | sí | el recorrido: cada nodo encontrado, arista seguida, fila conservada o descartada, en orden |

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

## EXPLAIN

El plan, sin ejecutar nada. Úsalo para revisar que una consulta empieza donde esperas, desde un índice y no recorriendo todo:

```text run title="Ejemplo"
EXPLAIN MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Resultado"
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+------
 1    | MATCH     | start at (p:Person {name}) (scan of :Person, 5 nodes), expa… | 3.0  | 36.0
 2    | RETURN    | f.name                                                       | 3.0  | 46.0
(2 rows)
```

Con un índice sobre `name`, el inicio cambia:

```text run title="Ejemplo"
CREATE INDEX FOR (p:Person) ON (p.name);
EXPLAIN MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Resultado"
 name        | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_name | Person | name     | false  | 5       | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+------
 1    | MATCH     | start at (p:Person {name}) (index Person_name: name = …, ~1… | 1.0  | 7.0
 2    | RETURN    | f.name                                                       | 1.0  | 9.0
(2 rows)
```

`EXPLAIN` de una escritura no escribe nada. También dice cuándo una sentencia sería rechazada por falta de permisos.

## PROFILE

Ejecuta la sentencia, devuelve sus filas y luego una tabla con lo que hizo cada paso. `reads` cuenta nodos, aristas y entradas de índice leídos; `ms` es cuánto tardó el paso:

```text run title="Ejemplo"
PROFILE MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Resultado"
 f.name
--------
 Carla
(1 row)

 step | operation | rows | reads | ms   | details
------+-----------+------+-------+------+--------------------------------------------------------------
 1    | MATCH     | 1    | 6     | 0.16 | start at (p:Person {name}) (index Person_name: name = …, ~1…
 2    | RETURN    | 1    | 0     | 0.01 | f.name
(2 rows)
```

## TRACE

Ejecuta la sentencia y registra su recorrido. Cada evento tiene un número de orden, el paso del plan (la cláusula) y un tipo:

```text run title="Ejemplo"
TRACE MATCH (p:Person {name: 'Ana'})-[:knows]->(f) WHERE f.age > 30 RETURN f.name;
```

```text result title="Resultado"
 f.name
--------
 Carla
(1 row)

 seq | step | event  | what
-----+------+--------+--------------------------------
 0   | 1    | anchor | 65aa5fff via index Person_name
 1   | 1    | expand | 65aa5fff -> e1aa4bfb
 2   | 1    | keep   | e1aa4bfb
 3   | 1    | expand | 65aa5fff -> 4e3eacc5
 4   | 1    | keep   | 4e3eacc5
 5   | 1    | drop   | row: f.age > 30
 6   | 2    | row    | row 0
(7 rows)
```

| Evento | Qué pasó |
| --- | --- |
| `anchor` | un patrón empieza en un nodo, encontrado por un índice, una etiqueta, un id o un recorrido completo |
| `expand` | se siguió una arista, de un nodo a otro |
| `keep` | el nodo al final de la arista encaja en el patrón |
| `drop` | se descartó un nodo o una fila, con el motivo (el patrón, o la condición) |
| `row` | una fila del resultado |

Aquí: Ana es el ancla, encontrada por el índice; se siguen dos aristas `knows`, a Bruno y a Carla; la fila con Bruno se descarta por `age > 30`; se devuelve la fila de Carla. La consola muestra los últimos ocho caracteres de cada id; por HTTP (`trace: true` en `POST /v1/{ns}/query`) cada evento trae los ids completos, así que un cliente puede reproducir el recorrido paso a paso sobre un dibujo del grafo. En la consola, `\trace on` traza cada sentencia hasta `\trace off`.

:::tip Bueno saber
- Un trazado guarda como máximo 10 000 eventos o 4 MiB; pasado eso dice `cut: true` y la sentencia igual corre hasta el final.
- Las sentencias que no se trazan no pagan nada por esta función.
- Las escrituras corren normalmente con `PROFILE` y `TRACE`. Las sentencias de índices y restricciones rechazan ambos.
:::
