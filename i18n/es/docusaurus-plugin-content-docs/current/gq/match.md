---
title: MATCH
description: Encuentra nodos y aristas por la forma que tienen, con etiquetas, propiedades, direcciones y partes opcionales.
---

# MATCH

`MATCH` encuentra las partes del grafo que encajan en un patrón. Cada coincidencia es una **fila**, y las variables del patrón guardan lo encontrado.

## Sintaxis

```text
MATCH patrón [, patrón …]
[WHERE condición]
RETURN …
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

## Nodos con una etiqueta

```text run title="Ejemplo"
MATCH (c:Company) RETURN c.name, c.sector;
```

```text result title="Resultado"
 c.name | c.sector
--------+----------
 Acme   | robotics
 Orbit  | software
(2 rows)
```

## Nodos con valores de propiedades

Las propiedades escritas en el patrón deben ser iguales:

```text run title="Ejemplo"
MATCH (p:Person {city: 'Lima'}) RETURN p.name, p.age;
```

```text result title="Resultado"
 p.name | p.age
--------+-------
 Ana    | 34
 Carla  | 45
(2 rows)
```

## Seguir una arista

Una flecha sigue las aristas en su dirección. Cada fila es una arista `works_at` con sus dos extremos:

```text run title="Ejemplo"
MATCH (p:Person)-[w:works_at]->(c:Company)
RETURN p.name, w.since, c.name
ORDER BY w.since;
```

```text result title="Resultado"
 p.name | w.since | c.name
--------+---------+--------
 Carla  | 2015    | Acme
 Ana    | 2019    | Acme
 Diego  | 2020    | Orbit
 Bruno  | 2022    | Orbit
(4 rows)
```

## Direcciones

| Patrón | Encuentra |
| --- | --- |
| `(a)-[:knows]->(b)` | aristas de `a` a `b` |
| `(a)<-[:knows]-(b)` | aristas de `b` a `a` |
| `(a)-[:knows]-(b)` | aristas en cualquier dirección |

¿Quién conoce a Diego? La flecha apunta hacia él:

```text run title="Ejemplo"
MATCH (p:Person)-[:knows]->(d:Person {name: 'Diego'}) RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Bruno
 Carla
(2 rows)
```

Todos los unidos a Diego por `knows`, en cualquier dirección:

```text run title="Ejemplo"
MATCH (d:Person {name: 'Diego'})-[:knows]-(p) RETURN p.name ORDER BY p.name;
```

```text result title="Resultado"
 p.name
--------
 Bruno
 Carla
 Eva
(3 rows)
```

## Cualquier etiqueta de arista, o varias

Omite la etiqueta para seguir cualquier arista, o lista varias con `|`:

```text run title="Ejemplo"
MATCH (:Person {name: 'Ana'})-[r]->(x) RETURN type(r), x.name ORDER BY x.name;
```

```text result title="Resultado"
 type(r)  | x.name
----------+--------
 works_at | Acme
 knows    | Bruno
 knows    | Carla
(3 rows)
```

```text run title="Ejemplo"
MATCH (:Person {name: 'Bruno'})-[r:knows|works_at]->(x) RETURN type(r), x.name;
```

```text result title="Resultado"
 type(r)  | x.name
----------+--------
 knows    | Diego
 works_at | Orbit
(2 rows)
```

## Cadenas

Los patrones se encadenan: los amigos de los amigos de Ana, y dónde trabajan:

```text run title="Ejemplo"
MATCH (:Person {name: 'Ana'})-[:knows]->(f)-[:knows]->(ff)-[:works_at]->(c)
RETURN f.name, ff.name, c.name;
```

```text result title="Resultado"
 f.name | ff.name | c.name
--------+---------+--------
 Bruno  | Diego   | Orbit
 Carla  | Diego   | Orbit
(2 rows)
```

## Varios patrones

Separa los patrones con comas. Cuando comparten una variable, se unen por ella. Aquí, personas que trabajan en la misma empresa que alguien a quien conocen:

```text run title="Ejemplo"
MATCH (a:Person)-[:knows]->(b:Person),
      (a)-[:works_at]->(c:Company)<-[:works_at]-(b)
RETURN a.name, b.name, c.name;
```

```text result title="Resultado"
 a.name | b.name | c.name
--------+--------+--------
 Ana    | Carla  | Acme
 Bruno  | Diego  | Orbit
(2 rows)
```

## OPTIONAL MATCH

`OPTIONAL MATCH` conserva la fila aunque su patrón no encuentre nada; sus variables quedan en `null`. Eva no trabaja en ninguna empresa y aun así aparece:

```text run title="Ejemplo"
MATCH (p:Person)
OPTIONAL MATCH (p)-[:works_at]->(c)
RETURN p.name, c.name
ORDER BY p.name;
```

```text result title="Resultado"
 p.name | c.name
--------+--------
 Ana    | Acme
 Bruno  | Orbit
 Carla  | Acme
 Diego  | Orbit
 Eva    | null
(5 rows)
```

## Encontrar un nodo por su id

`{@id: '…'}` en un patrón es una búsqueda directa, la forma más rápida de llegar a un nodo que ya conoces. Aquí el id viene de una cláusula anterior:

```text run title="Ejemplo"
MATCH (a:Person {name: 'Ana'})
WITH a.@id AS id
MATCH (p {@id: id})
RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Ana
(1 row)
```

:::tip Bueno saber
- Un patrón usa cada arista como máximo una vez por coincidencia.
- Varias cláusulas `MATCH` pueden seguirse; cada una amplía las filas de la anterior.
- Para filtrar con algo distinto de la igualdad, usa [WHERE](where.md).
:::
