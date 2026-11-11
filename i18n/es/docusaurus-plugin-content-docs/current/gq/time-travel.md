---
title: Viaje en el tiempo
description: Dale un período a los hechos con @valid_from y @valid_to, pregunta qué era cierto con VALID AT, qué se sabía con KNOWN AT, y guarda la historia de propiedades.
---

# Viaje en el tiempo

Cada arista (hecho) de Grafeno tiene dos tiempos: **cuándo fue cierto en el mundo** (tiempo de validez, lo pones tú) y **cuándo lo supo Grafeno** (tiempo de registro, lo pone Grafeno). Puedes preguntar en cualquier momento de ambos. El [concepto de tiempo](../concepts/time.md) explica la idea; esta página muestra las sentencias.

## Sintaxis

```text
CREATE (a)-[:ETIQUETA {@valid_from: '2021-03-01', @valid_to: '2024-01-31'}]->(b)
MATCH … VALID AT '2022-06-01' …     // qué era cierto entonces
MATCH … KNOWN AT t …                // qué sabía Grafeno entonces
SET r.@valid_to = '2025-01-31'      // el hecho dejó de ser cierto
RETRACT r                           // el hecho fue un error
```

## Los datos de ejemplo

Ana trabajó en Acme de 2019 a enero de 2024 y luego pasó a Orbit. Bruno entró a Orbit en 2022:

```text run title="Ejemplo"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}),
       (acme:Company {name: 'Acme'}), (orbit:Company {name: 'Orbit'}),
       (ana)-[:works_at {@valid_from: '2019-04-01', @valid_to: '2024-01-31'}]->(acme),
       (ana)-[:works_at {@valid_from: '2024-02-01'}]->(orbit),
       (bruno)-[:works_at {@valid_from: '2022-06-15'}]->(orbit);
```

```text result title="Resultado"
4 nodes created, 3 edges created
```

## Todos los hechos, con su período

Sin `VALID AT`, `MATCH` ve todos los hechos, pasados y presentes. Un hecho todavía cierto no tiene `@valid_to`:

```text run title="Ejemplo"
MATCH (p:Person)-[w:works_at]->(c)
RETURN p.name, c.name, date(w.@valid_from) AS from, date(w.@valid_to) AS to
ORDER BY from;
```

```text result title="Resultado"
 p.name | c.name | from       | to
--------+--------+------------+------------
 Ana    | Acme   | 2019-04-01 | 2024-01-31
 Bruno  | Orbit  | 2022-06-15 | null
 Ana    | Orbit  | 2024-02-01 | null
(3 rows)
```

## VALID AT: qué era cierto en un momento

```text run title="Ejemplo"
MATCH (p:Person)-[:works_at]->(c) VALID AT '2023-01-01' RETURN p.name, c.name ORDER BY p.name;
```

```text result title="Resultado"
 p.name | c.name
--------+--------
 Ana    | Acme
 Bruno  | Orbit
(2 rows)
```

```text run title="Ejemplo"
MATCH (p:Person)-[:works_at]->(c) VALID AT datetime() RETURN p.name, c.name ORDER BY p.name;
```

```text result title="Resultado"
 p.name | c.name
--------+--------
 Ana    | Orbit
 Bruno  | Orbit
(2 rows)
```

## Terminar un hecho

Bruno deja Orbit a fines de junio de 2025. El hecho se queda, ahora con un fin:

```text run title="Ejemplo"
MATCH (:Person {name: 'Bruno'})-[w:works_at]->(:Company {name: 'Orbit'})
SET w.@valid_to = '2025-06-30';
MATCH (:Person {name: 'Bruno'})-[w:works_at]->(c) VALID AT '2025-01-01' RETURN c.name AS in_january;
MATCH (:Person {name: 'Bruno'})-[w:works_at]->(c) VALID AT '2025-08-01' RETURN c.name AS in_august;
```

```text result title="Resultado"
1 property set
 in_january
------------
 Orbit
(1 row)
 in_august
-----------
(0 rows)
```

## Una línea de tiempo

`temporal.series` da un momento por paso, y `VALID AT` puede usarlo: el personal de Orbit cada medio año:

```text run title="Ejemplo"
CALL temporal.series('2022-01-01', '2025-07-01', 'P6M') YIELD at
OPTIONAL MATCH (p:Person)-[:works_at]->(:Company {name: 'Orbit'}) VALID AT at
RETURN date(at) AS moment, count(p) AS people ORDER BY moment;
```

```text result title="Resultado"
 moment     | people
------------+--------
 2022-01-01 | 0
 2022-07-01 | 1
 2023-01-01 | 1
 2023-07-01 | 1
 2024-01-01 | 1
 2024-07-01 | 2
 2025-01-01 | 2
 2025-07-01 | 1
(8 rows)
```

## RETRACT y KNOWN AT

Alguien registra que Ana vive en Cusco. Fue un error, así que se **retracta**, no se termina. Anotamos el momento entre las dos escrituras en un nodo, para preguntar por él después:

```text run title="Ejemplo"
MATCH (ana:Person {name: 'Ana'}) CREATE (ana)-[:lives_in]->(:City {name: 'Cusco'});
CREATE (:Moment {name: 'before the fix', at: datetime()});
MATCH (:Person {name: 'Ana'})-[r:lives_in]->() RETRACT r;
```

```text result title="Resultado"
1 node created, 1 edge created
1 node created
1 edge retracted
```

Ahora el hecho desaparece de las respuestas actuales:

```text run title="Ejemplo"
MATCH (:Person {name: 'Ana'})-[:lives_in]->(c) RETURN c.name;
```

```text result title="Resultado"
 c.name
--------
(0 rows)
```

Pero `KNOWN AT` el momento anterior muestra lo que Grafeno creía entonces:

```text run title="Ejemplo"
MATCH (m:Moment {name: 'before the fix'})
MATCH (:Person {name: 'Ana'})-[r:lives_in]->(c) KNOWN AT m.at
RETURN c.name, r.@expired_at IS NOT NULL AS corrected_later;
```

```text result title="Resultado"
 c.name | corrected_later
--------+-----------------
 Cusco  | true
(1 row)
```

## Historia de una propiedad

Una propiedad declarada **funcional** guarda sus valores anteriores; `history(n, clave)` los lista:

```text run title="Ejemplo"
CREATE CONSTRAINT FOR (p:Person) REQUIRE p.city IS FUNCTIONAL;
MATCH (p:Person {name: 'Ana'}) SET p.city = 'Lima';
MATCH (p:Person {name: 'Ana'}) SET p.city = 'Quito';
MATCH (p:Person {name: 'Ana'}) RETURN p.city AS now, [h IN history(p, 'city') | h.value] AS before;
```

```text result title="Resultado"
 name                   | kind       | label  | property | rule                                   | on    | contradictions
------------------------+------------+--------+----------+----------------------------------------+-------+----------------
 Person_city_functional | functional | Person | city     | one value at a time, earlier ones kept | nodes | 0
(1 row)
1 property set
1 property set
 now   | before
-------+--------
 Quito | [Lima]
(1 row)
```

## Pseudopropiedades de tiempo

| En aristas | Significado |
| --- | --- |
| `@valid_from`, `@valid_to` | cuándo fue cierto el hecho en el mundo (lo pones tú) |
| `@recorded_at` | cuándo registró Grafeno esta versión |
| `@expired_at` | cuándo dejó de ser actual esa versión (una corrección, una retractación) |

| En nodos | Significado |
| --- | --- |
| `@created_at`, `@updated_at` | cuándo se creó el nodo y cuándo cambió por última vez |

:::tip Cuál usar
`SET r.@valid_to` cuando cambió el mundo; `RETRACT r` cuando el registro estaba mal; `DELETE r` solo cuando hay que olvidar el dato.
:::
