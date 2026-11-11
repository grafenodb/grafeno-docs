---
title: MERGE
description: Encuentra un patrón o créalo cuando no existe, con ON CREATE y ON MATCH.
---

# MERGE

`MERGE` encuentra un patrón y lo crea cuando nada coincide. Ejecuta el mismo `MERGE` dos veces y la segunda no crea nada: es la forma de escribir datos de manera **idempotente**.

## Sintaxis

```text
MERGE patrón
[ON CREATE SET …]
[ON MATCH SET …]
```

## Crear una sola vez

La primera ejecución crea la etiqueta:

```text run title="Ejemplo"
MERGE (t:Tag {name: 'graphs'}) RETURN t.name;
```

```text result title="Resultado"
 t.name
--------
 graphs
(1 row)
1 node created
```

La misma sentencia otra vez la encuentra y no crea nada:

```text run title="Ejemplo"
MERGE (t:Tag {name: 'graphs'}) RETURN t.name;
MATCH (t:Tag) RETURN count(t) AS tags;
```

```text result title="Resultado"
 t.name
--------
 graphs
(1 row)
 tags
------
 1
(1 row)
```

## ON CREATE y ON MATCH

Haz algo distinto cuando el nodo es nuevo y cuando ya existía. Aquí, un contador de usos:

```text run title="Ejemplo"
MERGE (t:Tag {name: 'rust'})
ON CREATE SET t.uses = 1
ON MATCH SET t.uses = t.uses + 1
RETURN t.name, t.uses;
```

```text result title="Resultado"
 t.name | t.uses
--------+--------
 rust   | 1
(1 row)
1 node created, 1 property set
```

```text run title="Ejemplo"
MERGE (t:Tag {name: 'rust'})
ON CREATE SET t.uses = 1
ON MATCH SET t.uses = t.uses + 1
RETURN t.name, t.uses;
```

```text result title="Resultado"
 t.name | t.uses
--------+--------
 rust   | 2
(1 row)
1 property set
```

## Una arista entre nodos conocidos

Encuentra primero ambos extremos y luego haz `MERGE` de la arista. Se crea una sola vez:

```text run title="Ejemplo"
CREATE (:Person {name: 'Ana'}), (:Person {name: 'Bruno'});
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}) MERGE (a)-[:knows]->(b);
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}) MERGE (a)-[:knows]->(b);
MATCH (:Person)-[k:knows]->(:Person) RETURN count(k) AS edges;
```

```text result title="Resultado"
2 nodes created
1 edge created
No changes.
 edges
-------
 1
(1 row)
```

## Cuenta el patrón completo

`MERGE` busca el patrón **completo**. Si falta alguna parte, crea todas las partes que no están ligadas a una variable. Aquí Carla todavía no existe, así que se crea el camino entero, incluida una segunda `Ana`:

```text run title="Ejemplo"
MERGE (:Person {name: 'Ana'})-[:knows]->(:Person {name: 'Carla'});
MATCH (p:Person {name: 'Ana'}) RETURN count(p) AS anas;
```

```text result title="Resultado"
2 nodes created, 1 edge created
 anas
------
 2
(1 row)
```

:::tip Primero los nodos
Para unir nodos existentes, haz `MERGE` (o `MATCH`) de cada nodo por separado y luego `MERGE` de la arista entre las variables, como arriba.
:::

## Muchos a la vez

Con `UNWIND`, una sentencia hace `MERGE` de una lista entera. Cada fila ve lo que fusionaron las anteriores, así que un valor repetido se crea una vez:

```text run title="Ejemplo"
UNWIND ['graphs', 'memory', 'graphs', 'search'] AS name
MERGE (t:Tag {name: name})
RETURN count(*) AS rows;
MATCH (t:Tag) RETURN t.name ORDER BY t.name;
```

```text result title="Resultado"
 rows
------
 4
(1 row)
2 nodes created
 t.name
--------
 graphs
 memory
 rust
 search
(4 rows)
```
