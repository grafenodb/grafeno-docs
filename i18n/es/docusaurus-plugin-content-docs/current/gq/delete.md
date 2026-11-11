---
title: DELETE
description: Borra nodos y aristas, y conoce la diferencia entre borrar, terminar un hecho y retractarlo.
---

# DELETE

`DELETE` quita nodos y aristas. Borrar un nodo borra también sus aristas; `DETACH DELETE` es lo mismo, dicho de forma explícita.

## Sintaxis

```text
MATCH … DELETE n           // un nodo (con sus aristas), o una arista
MATCH … DETACH DELETE n    // lo mismo para un nodo, dicho de forma explícita
```

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}),
       (carla:Person {name: 'Carla'}), (tmp:Draft {title: 'old'}),
       (ana)-[:knows]->(bruno), (bruno)-[:knows]->(carla);
```

```text result title="Resultado"
4 nodes created, 2 edges created
```

## Borrar un nodo

Encuéntralo y bórralo:

```text run title="Ejemplo"
MATCH (d:Draft) DELETE d;
```

```text result title="Resultado"
1 node deleted
```

## Un nodo con aristas

Nunca queda un nodo con aristas que apuntan a la nada: al borrarlo se borran sus aristas. `DETACH DELETE` lo dice explícitamente y hace lo mismo:

```text run title="Ejemplo"
MATCH (b:Person {name: 'Bruno'}) DETACH DELETE b;
MATCH (p:Person) RETURN p.name ORDER BY p.name;
MATCH ()-[k:knows]->() RETURN count(k) AS knows_edges;
```

```text result title="Resultado"
1 node deleted
 p.name
--------
 Ana
 Carla
(2 rows)
 knows_edges
-------------
 0
(1 row)
```

## Borrar una arista

Encuentra la arista con una variable y bórrala; los nodos quedan:

```text run title="Ejemplo"
MATCH (a:Person {name: 'Ana'}), (c:Person {name: 'Carla'})
CREATE (a)-[:knows]->(c);
MATCH (:Person {name: 'Ana'})-[k:knows]->(:Person {name: 'Carla'}) DELETE k;
MATCH ()-[k:knows]->() RETURN count(k) AS knows_edges;
```

```text result title="Resultado"
1 edge created
1 edge deleted
 knows_edges
-------------
 0
(1 row)
```

## Borrar todo lo que tiene una etiqueta

```text run title="Ejemplo"
MATCH (p:Person) DETACH DELETE p;
MATCH (n) RETURN count(n) AS nodes;
```

```text result title="Resultado"
2 nodes deleted
 nodes
-------
 0
(1 row)
```

## Borrar un hecho, o terminarlo

Un hecho que **fue cierto** y dejó de serlo no debería borrarse: dale un fin con `SET r.@valid_to` y su historia queda para el [viaje en el tiempo](time-travel.md). Un hecho **registrado por error** puede retractarse con `RETRACT r`: desaparece de las respuestas actuales, y `KNOWN AT` un momento anterior todavía muestra lo que se creía entonces.

| Quieres decir | Escribe |
| --- | --- |
| ya no es cierto | `SET r.@valid_to = '2025-06-30'` |
| nunca fue cierto (un error) | `RETRACT r` |
| olvidarlo por completo | `DELETE r` |
