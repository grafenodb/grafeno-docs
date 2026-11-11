---
title: Caminos
description: Sigue aristas varios saltos a la vez, guarda caminos completos y encuentra los caminos más cortos entre nodos.
---

# Caminos

Un patrón puede seguir una cadena de aristas de cualquier largo, guardar el camino completo en una variable y encontrar la forma más corta entre dos nodos.

## Sintaxis

```text
(a)-[:ETIQUETA*1..3]->(b)                    // de 1 a 3 saltos
p = (a)-[:ETIQUETA*]->(b)                    // guarda el camino en p
p = shortestPath((a)-[:ETIQUETA*]-(b))       // el más corto
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

## Varios saltos

| Patrón | Saltos |
| --- | --- |
| `-[:knows*2]->` | exactamente 2 |
| `-[:knows*1..3]->` | de 1 a 3 |
| `-[:knows*..3]->` | hasta 3 |
| `-[:knows*]->` | de 1 a 32 |

Todos a quienes Ana llega por `knows`, hasta tres saltos:

```text run title="Ejemplo"
MATCH (:Person {name: 'Ana'})-[:knows*1..3]->(p)
RETURN p.name ORDER BY p.name;
```

```text result title="Resultado"
 p.name
--------
 Bruno
 Carla
 Diego
 Eva
(4 rows)
```

Exactamente a dos saltos:

```text run title="Ejemplo"
MATCH (:Person {name: 'Ana'})-[:knows*2]->(p) RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Diego
(1 row)
```

## Cada destino una vez, a su menor distancia

Un patrón de largo variable llega a cada nodo destino **una vez**, por su camino más corto. A Diego se llega por Bruno o por Carla, y aparece una vez:

```text run title="Ejemplo"
MATCH (:Person {name: 'Ana'})-[:knows*]->(p)
RETURN p.name, count(*) AS times ORDER BY p.name;
```

```text result title="Resultado"
 p.name | times
--------+-------
 Bruno  | 1
 Carla  | 1
 Diego  | 1
 Eva    | 1
(4 rows)
```

## Guardar el camino

`p = …` guarda el camino completo. `nodes(p)`, `relationships(p)` y `length(p)` lo desarman:

```text run title="Ejemplo"
MATCH p = (:Person {name: 'Ana'})-[:knows*]->(:Person {name: 'Eva'})
RETURN [n IN nodes(p) | n.name] AS route, length(p) AS hops;
```

```text result title="Resultado"
 route                    | hops
--------------------------+------
 [Ana, Bruno, Diego, Eva] | 3
(1 row)
```

## shortestPath

El camino más corto entre dos nodos, aquí siguiendo `knows` en cualquier dirección:

```text run title="Ejemplo"
MATCH (e:Person {name: 'Eva'}), (c:Person {name: 'Carla'})
MATCH p = shortestPath((e)-[:knows*]-(c))
RETURN [n IN nodes(p) | n.name] AS route, length(p) AS hops;
```

```text result title="Resultado"
 route               | hops
---------------------+------
 [Eva, Diego, Carla] | 2
(1 row)
```

`allShortestPaths` también se acepta y, como todo patrón de largo variable en GQ, da un camino más corto por cada destino. Para listar **todos** los caminos del menor costo entre dos nodos, o los k más baratos, usa [`algo.allShortestPaths` y `algo.kShortestPaths`](../algorithms/paths.md).

## Mezclar etiquetas

Un camino puede seguir varias etiquetas: las empresas a las que Ana llega en hasta dos saltos, la suya o a través de alguien que conoce:

```text run title="Ejemplo"
MATCH p = (:Person {name: 'Ana'})-[:knows|works_at*1..2]->(x:Company)
RETURN x.name, [n IN nodes(p) | n.name] AS route;
```

```text result title="Resultado"
 x.name | route
--------+---------------------
 Acme   | [Ana, Acme]
 Orbit  | [Ana, Bruno, Orbit]
(2 rows)
```

:::tip Caminos con peso
`shortestPath` cuenta saltos. Para encontrar la ruta más barata según una propiedad como distancia o costo, usa [`algo.shortestPath`](../algorithms/paths.md) con `weight`.
:::
