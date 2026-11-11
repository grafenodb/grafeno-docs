---
title: UNWIND y FOREACH
description: Convierte listas en filas con UNWIND y repite escrituras por cada elemento con FOREACH.
---

# UNWIND y FOREACH

`UNWIND` convierte una lista en filas, una por elemento. `FOREACH` ejecuta escrituras una vez por elemento de una lista, sin crear filas.

## Sintaxis

```text
UNWIND lista AS elemento
FOREACH (elemento IN lista | cláusulas de escritura)
```

## UNWIND de una lista

```text run title="Ejemplo"
UNWIND [1, 2, 3] AS x RETURN x, x * 10 AS times_ten;
```

```text result title="Resultado"
 x | times_ten
---+-----------
 1 | 10
 2 | 20
 3 | 30
(3 rows)
```

## Crear muchos nodos desde una lista

Una lista de mapas es la forma habitual de cargar varios registros en una sentencia:

```text run title="Ejemplo"
UNWIND [{name: 'Ana', langs: ['es', 'en']},
        {name: 'Bruno', langs: ['es']},
        {name: 'Carla', langs: ['en', 'pt', 'es']}] AS row
CREATE (p:Person {name: row.name, langs: row.langs})
RETURN count(p) AS created;
```

```text result title="Resultado"
 created
---------
 3
(1 row)
3 nodes created
```

## UNWIND de una propiedad

Cuenta las personas que hablan cada idioma:

```text run title="Ejemplo"
MATCH (p:Person)
UNWIND p.langs AS lang
RETURN lang, count(*) AS speakers, collect(p.name) AS who
ORDER BY speakers DESC, lang;
```

```text result title="Resultado"
 lang | speakers | who
------+----------+---------------------
 es   | 3        | [Ana, Bruno, Carla]
 en   | 2        | [Ana, Carla]
 pt   | 1        | [Carla]
(3 rows)
```

## Listas vacías y null

Una lista vacía o `null` no da filas, así que la fila desaparece:

```text run title="Ejemplo"
UNWIND [] AS x RETURN count(*) AS rows;
```

```text result title="Resultado"
 rows
------
 0
(1 row)
```

## FOREACH

`FOREACH` repite escrituras por cada elemento. Aquí Ana recibe una arista `likes` a cada tema, con `MERGE` para no duplicar los temas:

```text run title="Ejemplo"
MATCH (a:Person {name: 'Ana'})
FOREACH (topic IN ['graphs', 'rust', 'search'] |
  MERGE (t:Topic {name: topic})
  CREATE (a)-[:likes]->(t));
MATCH (:Person {name: 'Ana'})-[:likes]->(t) RETURN t.name ORDER BY t.name;
```

```text result title="Resultado"
3 nodes created, 3 edges created
 t.name
--------
 graphs
 rust
 search
(3 rows)
```

## ¿UNWIND o FOREACH?

| Usa | Cuando |
| --- | --- |
| `UNWIND` | necesitas filas: para devolver, agregar o buscar desde cada elemento |
| `FOREACH` | solo escribes, y quieres que el resto de la consulta conserve sus filas como estaban |

`FOREACH` acepta `CREATE`, `MERGE`, `SET`, `REMOVE`, `DELETE`, `RETRACT` y `FOREACH` anidados.
