---
title: Búsqueda de texto completo
description: Busca en el texto de los nodos con db.search, y en propiedades elegidas con índices de texto completo, analizadores, un lenguaje de consulta, pesos y fragmentos.
---

# Búsqueda de texto completo

Grafeno busca palabras, no valores exactos: "graph" encuentra "Graphs", los resultados vienen ordenados por relevancia (BM25) y una consulta puede pedir frases, palabras obligatorias, prefijos y errores de tipeo.

Hay dos formas de buscar texto:

| | Busca en | Se prepara con |
| --- | --- | --- |
| **El texto del nodo** | el `@text` de cada nodo | nada: `@text` siempre se puede buscar con `db.search` |
| **Un índice de texto completo** | propiedades de texto elegidas de una etiqueta, con pesos | `CREATE FULLTEXT INDEX`, se busca con `db.searchIndex` |

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (:Note {title: 'Graph databases', body: 'Graphs store relationships as edges between nodes.',
               @text: 'Graph databases store relationships as edges between nodes.'}),
       (:Note {title: 'Agent memory', body: 'An agent remembers facts in a graph and recalls them later.',
               @text: 'An agent remembers facts in a graph and recalls them later.'}),
       (:Note {title: 'Cooking rice', body: 'Rinse the rice, then simmer it with twice the water.',
               @text: 'Rinse the rice, then simmer it with twice the water.'}),
       (:Note {title: 'Draft: graph memory', body: 'Unfinished notes on graph memory for agents.',
               @text: 'Unfinished notes on graph memory for agents.', draft: true});
```

```text result title="Resultado"
4 nodes created
```

## Buscar en el texto del nodo

`db.search(texto, límite)` da cada nodo que calza y su puntaje, el mejor primero:

```text run title="Ejemplo"
CALL db.search('graph', 10) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title          | score
---------------------+-------
 Draft: graph memory | 0.377
 Agent memory        | 0.35
 Graph databases     | 0.328
(3 rows)
```

## Crear un índice de texto completo

Un índice de texto completo cubre propiedades de texto de una o más etiquetas. `weights` hace que un campo cuente más; el analizador `english` reduce las palabras a su raíz, así que `graphs` y `graph` calzan:

```text run title="Ejemplo"
CREATE FULLTEXT INDEX notes FOR (n:Note) ON EACH [n.title, n.body]
  OPTIONS {analyzer: 'english', weights: {title: 3}};
```

```text result title="Resultado"
 name  | label | property    | unique | entries | fuzzy | on    | key   | kind     | state
-------+-------+-------------+--------+---------+-------+-------+-------+----------+--------
 notes | Note  | title, body | false  | 31      | false | nodes | false | fulltext | online
(1 row)
```

## Buscar en un índice

`db.searchIndex(índice, consulta, límite)` da el nodo, su puntaje y los **fragmentos** que calzaron:

```text run title="Ejemplo"
CALL db.searchIndex('notes', 'graphs', 10) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title          | score
---------------------+-------
 Graph databases     | 1.465
 Draft: graph memory | 1.312
 Agent memory        | 0.344
(3 rows)
```

Un acierto en el título cuenta el triple que uno en el cuerpo, así que las notas con la palabra en el título van primero.

## El lenguaje de consulta

| Consulta | Encuentra |
| --- | --- |
| `graph memory` | cualquiera de las palabras; más palabras que calzan suben en el orden |
| `"graph memory"` | la frase, palabras en orden y juntas |
| `"agent graph"~3` | todas las palabras a no más de 3 posiciones entre sí |
| `+agent` | notas que **deben** tener la palabra |
| `-draft`, `NOT draft` | notas que no deben tenerla |
| `graph AND memory`, `rice OR graph` | ambas, cualquiera |
| `mem*` | palabras que empiezan con `mem` |
| `grahp~1` | palabras a una edición (un error de tipeo); como máximo `~2` |
| `title:memory` | la palabra solo en ese campo |

Una frase:

```text run title="Ejemplo"
CALL db.searchIndex('notes', '"graph memory"', 10) YIELD node RETURN node.title;
```

```text result title="Resultado"
 node.title
---------------------
 Draft: graph memory
(1 row)
```

Palabras obligatorias y excluidas:

```text run title="Ejemplo"
CALL db.searchIndex('notes', '+memory -unfinished', 10) YIELD node RETURN node.title;
```

```text result title="Resultado"
 node.title
--------------
 Agent memory
(1 row)
```

Un prefijo y un error de tipeo:

```text run title="Ejemplo"
CALL db.searchIndex('notes', 'remem* OR simmr~1', 10) YIELD node RETURN node.title;
```

```text result title="Resultado"
 node.title
--------------
 Agent memory
 Cooking rice
(2 rows)
```

Un solo campo:

```text run title="Ejemplo"
CALL db.searchIndex('notes', 'title:memory', 10) YIELD node RETURN node.title;
```

```text result title="Resultado"
 node.title
---------------------
 Agent memory
 Draft: graph memory
(2 rows)
```

## Fragmentos

Los fragmentos muestran dónde calzaron las palabras, para resaltarlas. `matches` son posiciones `[inicio, fin)` en el texto del fragmento:

```text run title="Ejemplo"
CALL db.searchIndex('notes', 'rice', {limit: 1, fragments: true}) YIELD node, fragments
UNWIND fragments AS f
RETURN node.title, f.field, f.text, f.matches;
```

```text result title="Resultado"
 node.title   | f.field | f.text                                               | f.matches
--------------+---------+------------------------------------------------------+------------
 Cooking rice | title   | Cooking rice                                         | [[8, 12]]
 Cooking rice | body    | Rinse the rice, then simmer it with twice the water. | [[10, 14]]
(2 rows)
```

## Combinar búsqueda y grafo

Una búsqueda da nodos, así que la consulta puede seguir desde ellos como desde un `MATCH`:

```text run title="Ejemplo"
CALL db.searchIndex('notes', 'graph', 10) YIELD node, score
WHERE node.draft IS NULL
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title      | score
-----------------+-------
 Graph databases | 1.465
 Agent memory    | 0.344
(2 rows)
```

## Analizadores

| Analizador | Hace |
| --- | --- |
| `standard` (por defecto) | pasa a minúsculas, quita tildes, omite palabras comunes del inglés y del español |
| `english` | lo mismo, y reduce las palabras inglesas a su raíz (`graphs` → `graph`) |
| `spanish` | lo mismo para el español (`grafos` → `graf`) |
| `simple` | pasa a minúsculas y quita tildes, conserva todas las palabras |

## Texto, vector o ambos

`db.search` también busca por vector, o por ambos a la vez (búsqueda híbrida, con fusión de rankings). Ver [Búsqueda híbrida](../vectors/hybrid-search.md).

:::tip Bueno saber
- Un índice de texto completo se mantiene al día en la misma transacción que cada escritura; `SHOW INDEXES` lo lista con tipo `fulltext`.
- Un campo puede tener un texto o una lista de textos.
- Una consulta solo con palabras excluidas se rechaza: no habría nada que ordenar.
:::
