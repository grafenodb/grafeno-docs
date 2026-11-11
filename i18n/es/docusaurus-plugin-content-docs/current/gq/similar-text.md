---
title: Texto parecido
description: Mide qué tan parecidos son dos textos, encuentra nombres con errores con índices difusos y detecta registros duplicados.
---

# Texto parecido

La gente escribe los nombres de muchas formas: "Jon Smith", "John Smyth", "SMITH, John". Las funciones `text.*` miden qué tan parecidos son dos textos, y un **índice difuso** encuentra los nodos cuyos nombres se parecen a un texto sin compararlo con cada nodo.

## Distancias y similitudes

Una **distancia** cuenta ediciones (0 es igual). Una **similitud** va de 0 (nada parecido) a 1 (igual):

```text run title="Ejemplo"
RETURN text.levenshtein('kitten', 'sitting') AS levenshtein,
       text.damerau('jonh', 'john') AS damerau,
       round(text.jaroWinkler('martha', 'marhta'), 3) AS jaro_winkler,
       round(text.dice('graph memory', 'memory graph'), 3) AS dice;
```

```text result title="Resultado"
 levenshtein | damerau | jaro_winkler | dice
-------------+---------+--------------+------
 3           | 1       | 0.961        | 1.0
(1 row)
```

| Función | Sirve para |
| --- | --- |
| `text.levenshtein(a, b)` | ediciones entre dos textos (insertar, borrar, reemplazar) |
| `text.damerau(a, b)` | lo mismo, contando un intercambio de vecinos como una edición |
| `text.jaro(a, b)`, `text.jaroWinkler(a, b)` | textos cortos como nombres; Winkler favorece un inicio común |
| `text.dice(a, b)`, `text.jaccard(a, b)` | grupos de caracteres compartidos (n-gramas), no les afecta el orden de las palabras |
| `text.lcs(a, b)` | largo de la subsecuencia común más larga |
| `text.soundex(s)`, `text.phonetic(s, 'es')` | cómo suena una palabra, en inglés o en español |
| `text.similarity(a, b, medida)` | cualquier medida por nombre, sobre texto normalizado |

## Comparación normalizada

`text.similarity` compara texto **normalizado**: minúsculas, sin tildes ni puntuación. `text.normalize` muestra lo que compara:

```text run title="Ejemplo"
RETURN text.normalize('  José  PÉREZ-Gómez ') AS normalized,
       text.similarity('José Pérez', 'jose perez') AS same,
       round(text.similarity('José Pérez', 'Pérez, José', 'tokens'), 3) AS by_words;
```

```text result title="Resultado"
 normalized       | same | by_words
------------------+------+----------
 jose perez gomez | 1.0  | 1.0
(1 row)
```

## Suena parecido

```text run title="Ejemplo"
RETURN text.soundex('Robert') AS robert, text.soundex('Rupert') AS rupert,
       text.phonetic('Vázquez', 'es') AS vazquez, text.phonetic('Basques', 'es') AS basques;
```

```text result title="Resultado"
 robert | rupert | vazquez | basques
--------+--------+---------+---------
 R163   | R163   | baskes  | baskes
(1 row)
```

## Nombres parecidos en una consulta

Compara en `WHERE`. Esto lee todos los nodos de la etiqueta, bien para conjuntos pequeños:

```text run title="Ejemplo"
CREATE (:Person {name: 'John Smith'}), (:Person {name: 'Jon Smyth'}), (:Person {name: 'Joan Smithers'}),
       (:Person {name: 'María García'}), (:Person {name: 'Maria Garsia'}), (:Person {name: 'Pedro Ruiz'});
MATCH (p:Person)
WITH p, text.similarity(p.name, 'john smith') AS score
WHERE score > 0.8
RETURN p.name, round(score, 3) AS score ORDER BY score DESC;
```

```text result title="Resultado"
6 nodes created
 p.name        | score
---------------+-------
 John Smith    | 1.0
 Jon Smyth     | 0.917
 Joan Smithers | 0.891
(3 rows)
```

## Índices difusos

Un índice difuso guarda los grupos de caracteres (trigramas) de una propiedad, así que `db.searchFuzzy` encuentra parecidos rápido, con errores de tipeo, tildes, mayúsculas y orden de palabras:

```text run title="Ejemplo"
CREATE FUZZY INDEX FOR (p:Person) ON (p.name);
CALL db.searchFuzzy('Person', 'name', 'maria garsia', 3) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 name              | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_name_fuzzy | Person | name     | false  | 70      | true  | nodes | false | fuzzy | online
(1 row)
 node.name    | score
--------------+-------
 Maria Garsia | 1.0
 María García | 0.75
(2 rows)
```

El último argumento elige la medida (`dice` por defecto). `tokens` compara palabras completas, así que el orden no importa:

```text run title="Ejemplo"
CALL db.searchFuzzy('Person', 'name', 'smith john', 3, 'tokens') YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 node.name     | score
---------------+-------
 John Smith    | 1.0
 Jon Smyth     | 0.0
 Joan Smithers | 0.0
(3 rows)
```

## Pares de probables duplicados

Pares de personas con nombres muy parecidos, sobre un umbral:

```text run title="Ejemplo"
MATCH (a:Person), (b:Person)
WHERE a.name < b.name
WITH a, b, text.similarity(a.name, b.name, 'jaro_winkler') AS score
WHERE score > 0.85
RETURN a.name, b.name, round(score, 3) AS score ORDER BY score DESC;
```

```text result title="Resultado"
 a.name        | b.name       | score
---------------+--------------+-------
 Maria Garsia  | María García | 0.967
 John Smith    | Jon Smyth    | 0.917
 Joan Smithers | John Smith   | 0.891
 Joan Smithers | Jon Smyth    | 0.868
(4 rows)
```

:::tip Decidir quién es el mismo
Decidir que dos registros son la misma cosa requiere más de un campo. Una **regla de coincidencia** por etiqueta (claves fuertes, campos con peso, umbrales) y `db.match` puntúan candidatos y explican cada puntaje; se configuran por la API HTTP, ver [Memoria de agentes](../guides/agent-memory.md).
:::
