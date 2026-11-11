---
title: CREATE
description: Crea nodos y aristas con GQ, con etiquetas, propiedades, texto y fechas.
---

# CREATE

`CREATE` agrega nodos y aristas al grafo.

## Sintaxis

```text
CREATE (variable:Etiqueta {clave: valor, …})
CREATE (a)-[:ETIQUETA {clave: valor, …}]->(b)
```

## Crear un nodo

Un nodo necesita al menos una etiqueta. Las propiedades son opcionales:

```text run title="Ejemplo"
CREATE (:Person {name: 'Ana', age: 34});
```

```text result title="Resultado"
1 node created
```

Sin `RETURN`, una sentencia que escribe dice qué cambió.

## Crear varios nodos a la vez

Separa los patrones con comas. Se crean en una sola transacción:

```text run title="Ejemplo"
CREATE (:Person {name: 'Bruno', age: 28}),
       (:Person {name: 'Carla', age: 45}),
       (:Company {name: 'Acme'});
```

```text result title="Resultado"
3 nodes created
```

## Devolver lo creado

Agrega `RETURN` para ver los registros nuevos. `@id` es el id que Grafeno le dio al nodo:

```text run title="Ejemplo"
CREATE (p:Person {name: 'Diego', city: 'Bogotá'})
RETURN p.name, p.city, size(p.@id) AS id_length;
```

```text result title="Resultado"
 p.name | p.city | id_length
--------+--------+-----------
 Diego  | Bogotá | 36
(1 row)
1 node created
```

## Varias etiquetas

Un nodo puede tener varias etiquetas. Un patrón con `:Person:Admin` encuentra los nodos que tienen ambas:

```text run title="Ejemplo"
CREATE (e:Person:Admin {name: 'Eva'}) RETURN labels(e);
```

```text result title="Resultado"
 labels(e)
-----------------
 [Admin, Person]
(1 row)
1 node created
```

## Crear una arista entre nodos nuevos

Escribe el patrón completo. Las variables (`a`, `b`) nombran los nodos para que la arista los una:

```text run title="Ejemplo"
CREATE (a:City {name: 'Lima'})-[:road {km: 1100}]->(b:City {name: 'Arequipa'});
```

```text result title="Resultado"
2 nodes created, 1 edge created
```

## Crear una arista entre nodos existentes

Encuentra los nodos con `MATCH` y luego crea la arista entre ellos:

```text run title="Ejemplo"
MATCH (ana:Person {name: 'Ana'}), (acme:Company {name: 'Acme'})
CREATE (ana)-[w:works_at {since: 2019}]->(acme)
RETURN ana.name, type(w), acme.name;
```

```text result title="Resultado"
 ana.name | type(w)  | acme.name
----------+----------+-----------
 Ana      | works_at | Acme
(1 row)
1 edge created
```

Una arista tiene exactamente una etiqueta y una dirección. Para decir que dos personas se conocen mutuamente, crea dos aristas, o crea una y búscala en cualquier dirección (`(a)-[:knows]-(b)`).

## Texto, fechas y fuentes

Además de propiedades, un nodo puede llevar un **texto** que lee la búsqueda de texto completo, y una arista puede decir **cuándo** fue cierto el hecho:

```text run title="Ejemplo"
MATCH (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'})
CREATE (ana)-[:knows {@valid_from: '2022-03-01'}]->(bruno),
       (n:Note {title: 'Kickoff', @text: 'Ana and Bruno met at the kickoff meeting.'})
RETURN n.title, n.@text;
```

```text result title="Resultado"
 n.title | n.@text
---------+-------------------------------------------
 Kickoff | Ana and Bruno met at the kickoff meeting.
(1 row)
1 node created, 1 edge created
```

| Pseudopropiedad | En | Significado |
| --- | --- | --- |
| `@text` | nodos | un texto indexado para la [búsqueda de texto completo](full-text.md) |
| `@embedding` | nodos | un vector, ver [Vectores](../vectors/index.md) |
| `@valid_from`, `@valid_to` | aristas | cuándo empezó y dejó de ser cierto el hecho, ver [Viaje en el tiempo](time-travel.md) |
| `@sources` | ambos | los ids de los nodos de donde salió este registro |

## Valores que puede tener una propiedad

Textos, enteros, decimales, booleanos, `null`, listas y mapas:

```text run title="Ejemplo"
CREATE (t:Thing {name: 'sample', count: 3, ratio: 0.25, active: true,
                 tags: ['a', 'b'], size: {w: 2, h: 3}, note: null})
RETURN t.count + 1, t.tags[0], t.size.h, t.note;
```

```text result title="Resultado"
 t.count + 1 | t.tags[0] | t.size.h | t.note
-------------+-----------+----------+--------
 4           | a         | 3        | null
(1 row)
1 node created
```

:::tip Bueno saber
- Un nodo sin etiqueta se rechaza: `CREATE ({name: 'x'})` falla.
- `CREATE` siempre crea. Para crear algo solo si todavía no existe, usa [MERGE](merge.md).
:::

```text run title="Ejemplo"
CREATE ({name: 'no label'});
```

```text result title="Resultado"
error: CREATE and MERGE need at least one label for each new node
```
