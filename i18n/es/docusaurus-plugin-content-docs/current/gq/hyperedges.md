---
title: Hiperaristas
description: "Hechos que relacionan dos o más nodos a la vez, cada uno con un rol: crear, encontrar, fusionar, cambiar, tiempo, índices y reglas."
---

# Hiperaristas

Una arista relaciona dos nodos. Algunos hechos relacionan más: una decisión tiene quién la propuso, quién la revisó, la tarea de la que trata y la evidencia que la respalda. Una **hiperarista** es un hecho así, guardado como un registro propio: una etiqueta, sus **participantes** (dos o más nodos, cada uno con un **rol**), propiedades y los mismos tiempos de validez y de registro que tienen las aristas.

Las hiperaristas no son aristas: los patrones comunes `(a)-[r]->(b)`, las rutas y los algoritmos de grafos no las ven. GQ las lee y las escribe con cláusulas propias: `MATCH HYPEREDGE`, `CREATE HYPEREDGE` y `MERGE HYPEREDGE`. Necesitan el motor 0.5 o posterior.

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (:Agent {name: 'Ana'}), (:Agent {name: 'Bruno'}), (:Agent {name: 'Carla'}),
       (:Task {key: 'T-1', title: 'Billing queue'}),
       (:Task {key: 'T-2', title: 'Search cache'}),
       (:Report {title: 'Load test of the queue'});
```

```text result title="Resultado"
6 nodes created
```

## CREATE HYPEREDGE

Los participantes son nodos ligados por una cláusula anterior, por sus variables, cada uno opcionalmente `AS` un rol:

```text run title="Ejemplo"
MATCH (a:Agent {name: 'Ana'}), (b:Agent {name: 'Bruno'}),
      (t:Task {key: 'T-1'}), (r:Report)
CREATE HYPEREDGE h:decision {summary: 'Use a message queue', status: 'proposed'}
       [(a) AS proposer, (b) AS reviewer, (t) AS subject, (r) AS evidence]
RETURN h.summary, size(participants(h));
```

```text result title="Resultado"
 h.summary           | size(participants(h))
---------------------+-----------------------
 Use a message queue | 4
(1 row)
1 hyperedge created, 2 properties set
```

Una hiperarista necesita al menos dos nodos distintos, y cada par (nodo, rol) una sola vez. Un nodo puede participar dos veces con roles distintos:

```text run title="Ejemplo"
MATCH (c:Agent {name: 'Carla'}), (b:Agent {name: 'Bruno'}), (t:Task {key: 'T-2'})
CREATE HYPEREDGE :review [(c) AS author, (c) AS reviewer, (b), (t) AS subject];
```

```text result title="Resultado"
1 hyperedge created
```

```text run title="Ejemplo"
MATCH (a:Agent {name: 'Ana'}), (b:Agent {name: 'Bruno'})
CREATE HYPEREDGE :pair [(a), (a)];
```

```text result title="Resultado"
error: invalid input: node 01a20534-6a3a-74ed-835c-06fcb887d148 takes part twice without a role
```

## MATCH HYPEREDGE

Los miembros ligan a los participantes, por rol o no; cada coincidencia es una fila:

```text run title="Ejemplo"
MATCH HYPEREDGE h:decision [(p) AS proposer, (t:Task) AS subject]
RETURN h.summary, p.name, t.key;
```

```text result title="Resultado"
 h.summary           | p.name | t.key
---------------------+--------+-------
 Use a message queue | Ana    | T-1
(1 row)
```

Un miembro sin rol toma cualquier participante, y dos miembros nunca comparten uno, así que dos miembros dan todos los pares:

```text run title="Ejemplo"
MATCH HYPEREDGE h:review [(x:Agent), (y:Agent)]
RETURN x.name, y.name ORDER BY x.name, y.name;
```

```text result title="Resultado"
 x.name | y.name
--------+--------
 Bruno  | Carla
 Carla  | Bruno
 Carla  | Carla
(3 rows)
```

`participants(h)` los lista todos: cada uno es un mapa con el nodo y su rol:

```text run title="Ejemplo"
MATCH HYPEREDGE h:decision
UNWIND participants(h) AS p
RETURN p.role, coalesce(p.node.name, p.node.key, p.node.title) AS who ORDER BY p.role;
```

```text result title="Resultado"
 p.role   | who
----------+------------------------
 evidence | Load test of the queue
 proposer | Ana
 reviewer | Bruno
 subject  | T-1
(4 rows)
```

### Desde un nodo

Un nodo ligado antes es la entrada más rápida: la coincidencia lee sus hiperaristas, no todas.

```text run title="Ejemplo"
MATCH (b:Agent {name: 'Bruno'})
MATCH HYPEREDGE h [(b) AS role_of_bruno]
RETURN type(h), h.summary;
```

```text result title="Resultado"
 type(h) | h.summary
---------+-----------
(0 rows)
```

El miembro de arriba pide un rol que nadie tiene, así que nada coincide. Sin rol, Bruno en cualquier rol:

```text run title="Ejemplo"
MATCH (b:Agent {name: 'Bruno'})
MATCH HYPEREDGE h [(b)]
RETURN type(h) ORDER BY type(h);
```

```text result title="Resultado"
 type(h)
----------
 decision
 review
(2 rows)
```

### Exactamente estos nodos

Con `EXACT`, los nodos de los miembros deben ser todos los nodos de la hiperarista:

```text run title="Ejemplo"
MATCH (a:Agent {name: 'Ana'}), (b:Agent {name: 'Bruno'})
OPTIONAL MATCH HYPEREDGE h [(a), (b)] EXACT
RETURN count(h) AS only_ana_and_bruno;
```

```text result title="Resultado"
 only_ana_and_bruno
--------------------
 0
(1 row)
```

### Propiedades y WHERE

```text run title="Ejemplo"
MATCH HYPEREDGE h:decision {status: 'proposed'}
WHERE h.summary STARTS WITH 'Use'
RETURN h.summary, h.@valid_from, h.@recorded_by;
```

```text result title="Resultado"
 h.summary           | h.@valid_from | h.@recorded_by
---------------------+---------------+----------------
 Use a message queue | null          | null
(1 row)
```

## Cambiar una

`SET` y `REMOVE` cambian propiedades como en los nodos:

```text run title="Ejemplo"
MATCH HYPEREDGE h:decision
SET h.status = 'approved', h.votes = 3
RETURN h.status, h.votes;
```

```text result title="Resultado"
 h.status | h.votes
----------+---------
 approved | 3
(1 row)
2 properties set
```

## MERGE HYPEREDGE

`MERGE HYPEREDGE` encuentra la hiperarista que nombra o la crea. Es la misma cuando tiene la etiqueta, las propiedades escritas en el patrón y exactamente los mismos pares (nodo, rol), en cualquier orden, y está vigente:

```text run title="Ejemplo"
MATCH (a:Agent {name: 'Ana'}), (c:Agent {name: 'Carla'}), (t:Task {key: 'T-2'})
MERGE HYPEREDGE m:meeting {key: 'M-1'} [(a) AS host, (c) AS guest, (t) AS subject]
ON CREATE SET m.created = true
ON MATCH SET m.seen = coalesce(m.seen, 0) + 1
RETURN m.created, m.seen;
```

```text result title="Resultado"
 m.created | m.seen
-----------+--------
 true      | null
(1 row)
1 hyperedge created, 2 properties set
```

Al repetirla, encuentra la que creó (`created` es la propiedad que se le puso entonces):

```text run title="Ejemplo"
MATCH (a:Agent {name: 'Ana'}), (c:Agent {name: 'Carla'}), (t:Task {key: 'T-2'})
MERGE HYPEREDGE m:meeting {key: 'M-1'} [(t) AS subject, (c) AS guest, (a) AS host]
ON CREATE SET m.created = true
ON MATCH SET m.seen = coalesce(m.seen, 0) + 1
RETURN m.created, m.seen;
```

```text result title="Resultado"
 m.created | m.seen
-----------+--------
 true      | 1
(1 row)
1 property set
```

Estar entre los mismos nodos no es ser el mismo evento: dos reuniones de las mismas personas son dos hiperaristas. Da a los eventos una propiedad que los distinga (`key` arriba); un patrón sin ella coincide con todas las reuniones de esos participantes.

## Tiempo: invalidar y retractar

Como con las aristas, un `MATCH HYPEREDGE` ve el conocimiento actual sea cual sea el tiempo de validez, y `VALID AT` pregunta qué era cierto en un momento. Una hiperarista que dejó de ser cierta recibe un fin en tiempo de validez y queda como historia; una registrada por error se retracta, y las lecturas la dejan fuera:

```text run title="Ejemplo"
MATCH HYPEREDGE h:review SET h.@valid_to = datetime('2026-06-01T00:00:00Z');
MATCH HYPEREDGE h:review VALID AT datetime('2026-03-01T00:00:00Z') RETURN count(h) AS in_march;
MATCH HYPEREDGE h:review VALID AT datetime('2026-07-01T00:00:00Z') RETURN count(h) AS in_july;
```

```text result title="Resultado"
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

```text run title="Ejemplo"
MATCH HYPEREDGE h:meeting RETRACT h;
MATCH HYPEREDGE h:meeting RETURN count(h);
```

```text result title="Resultado"
1 hyperedge retracted
 count(h)
----------
 0
(1 row)
```

## Borrar

`DELETE h` borra una hiperarista. Un nodo que participa en una no se borra con `DELETE n`: `DETACH DELETE n` primero lo saca (y borra la hiperarista que quede con menos de dos nodos):

```text run title="Ejemplo"
MATCH (r:Report) DELETE r;
```

```text result title="Resultado"
error: conflict: node 01a20534-6a3b-722e-a154-984947d2c249 takes part in hyperedges: delete them first, or take it out of them as it goes (GQ DETACH DELETE; over HTTP ?hyperedges=detach, or cascade to delete them; in Rust, delete_node_with)
```

```text run title="Ejemplo"
MATCH (r:Report) DETACH DELETE r;
MATCH HYPEREDGE h:decision RETURN size(participants(h));
```

```text result title="Resultado"
1 node deleted
 size(participants(h))
-----------------------
 3
(1 row)
```

## Índices y reglas

Sin un índice, encontrar una hiperarista por una propiedad lee todas las de su etiqueta. Un índice sobre hiperaristas lee solo lo que encuentra:

```text run title="Ejemplo"
CREATE INDEX FOR HYPEREDGE h:decision ON (h.status);
EXPLAIN MATCH HYPEREDGE h:decision WHERE h.status = 'approved' RETURN h;
```

```text result title="Resultado"
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

Las restricciones únicas y de clave, las reglas de no nulo y de tipo, y las propiedades funcionales (que guardan sus valores anteriores) funcionan en las hiperaristas como en los nodos:

```text run title="Ejemplo"
CREATE CONSTRAINT FOR HYPEREDGE h:decision REQUIRE h.status IS NOT NULL;
CREATE CONSTRAINT FOR HYPEREDGE h:decision REQUIRE h.status IS FUNCTIONAL;
MATCH HYPEREDGE h:decision SET h.status = 'done';
MATCH HYPEREDGE h:decision RETURN [e IN history(h, 'status') | e.value] AS before;
```

```text result title="Resultado"
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

```text run title="Ejemplo"
MATCH HYPEREDGE h:decision REMOVE h.status;
```

```text result title="Resultado"
error: invalid input: decision_status_not_null: hyperedge 01a20534-6a41-7444-8fd1-2e45195b1086 has no status
```

## Contar por fila

Una subconsulta cuenta o comprueba hiperaristas para cada fila:

```text run title="Ejemplo"
MATCH (a:Agent)
CALL { WITH a MATCH HYPEREDGE h [(a)] RETURN count(h) AS taking_part }
RETURN a.name, taking_part ORDER BY a.name;
```

```text result title="Resultado"
 a.name | taking_part
--------+-------------
 Ana    | 1
 Bruno  | 2
 Carla  | 1
(3 rows)
```

## Fuera de GQ

La API HTTP tiene rutas para hiperaristas (`/v1/{ns}/hyperedges`, buscarlas por participantes, las de un nodo), los lotes las aceptan, las exportaciones CSV y GraphML las incluyen y el [cliente de TypeScript](../clients/typescript.md) tiene un método para cada operación. La recuperación de memoria no devuelve hiperaristas: para eventos que un agente deba recordar, un nodo unido a sus participantes por una arista por rol funciona igual de bien.
