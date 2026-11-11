---
title: Búsqueda híbrida
description: Busca por palabras y por significado a la vez con los modos de db.search, fusión por ranking o fusión con pesos, y elige el lado de texto y el lado vectorial.
---

# Búsqueda híbrida

Las palabras y los vectores fallan en cosas distintas. Una búsqueda de texto encuentra exactamente "error 1234" pero no "la base de datos no arranca"; una búsqueda vectorial encuentra el significado pero puede perder un código o un nombre raro. La **búsqueda híbrida** hace ambas y fusiona las dos listas.

## Sintaxis

```text
CALL db.search(texto, {mode: 'text' | 'vector' | 'hybrid',
                       embedding: [...],           // para vector e hybrid
                       index: 'índice de texto',   // el lado de texto (por defecto: texto del nodo)
                       vector_index: 'nombre',     // el lado vectorial (por defecto: embedding del nodo)
                       fusion: 'rank' | 'weighted', k: 60, text_weight: 0.5,
                       candidates: 50, limit: 10})
YIELD node, score
```

## Los datos de ejemplo

Notas con un texto y un embedding de 3 dimensiones (sobre bases de datos, sobre cocina, sobre viajes):

```text run title="Ejemplo"
CREATE (:Note {title: 'Server will not start',  @text: 'The database server will not start after the upgrade: error 1234.',
               @embedding: [0.9, 0.0, 0.1]}),
       (:Note {title: 'Slow queries',           @text: 'Queries got slow until an index was added on the email column.',
               @embedding: [0.8, 0.1, 0.0]}),
       (:Note {title: 'Error 1234 at the bakery', @text: 'The oven showed error 1234 and the bread burned.',
               @embedding: [0.1, 0.9, 0.0]}),
       (:Note {title: 'Train to Cusco',         @text: 'The train to Cusco leaves at seven; bring warm clothes.',
               @embedding: [0.0, 0.1, 0.9]});
```

```text result title="Resultado"
4 nodes created
```

## Solo texto

Las palabras "error 1234" aparecen en dos notas, una de ellas sobre un horno:

```text run title="Ejemplo"
CALL db.search('error 1234', {mode: 'text', limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title               | score
--------------------------+-------
 Error 1234 at the bakery | 1.491
 Server will not start    | 1.33
(2 rows)
```

## Solo vector

Un vector de consulta "sobre bases de datos" (en una aplicación real, el embedding de la pregunta):

```text run title="Ejemplo"
CALL db.search('', {mode: 'vector', embedding: [1.0, 0.0, 0.0], limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title               | score
--------------------------+-------
 Server will not start    | 0.994
 Slow queries             | 0.992
 Error 1234 at the bakery | 0.11
(3 rows)
```

## Ambos: fusión por ranking

`mode: 'hybrid'` toma los mejores `candidates` de cada lista y suma `1 / (k + puesto)` de cada una: una nota alta en ambas listas gana, y una fuerte en cualquiera igual aparece:

```text run title="Ejemplo"
CALL db.search('error 1234', {mode: 'hybrid', embedding: [1.0, 0.0, 0.0], limit: 3}) YIELD node, score
RETURN node.title, round(score, 4) AS score;
```

```text result title="Resultado"
 node.title               | score
--------------------------+--------
 Server will not start    | 0.0325
 Error 1234 at the bakery | 0.0323
 Slow queries             | 0.0161
(3 rows)
```

Gana la nota sobre la base de datos con el código de error: es primera en ambas listas. La nota del horno calza con las palabras pero no con el significado.

## Ambos: fusión con pesos

`fusion: 'weighted'` escala los puntajes de cada lista a 0..1 y los mezcla: `texto × text_weight + vector × (1 − text_weight)`. Inclinándose por el significado:

```text run title="Ejemplo"
CALL db.search('error 1234', {mode: 'hybrid', embedding: [1.0, 0.0, 0.0], fusion: 'weighted',
                              text_weight: 0.3, limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title               | score
--------------------------+-------
 Server will not start    | 0.7
 Slow queries             | 0.699
 Error 1234 at the bakery | 0.378
(3 rows)
```

Inclinándose por las palabras:

```text run title="Ejemplo"
CALL db.search('error 1234', {mode: 'hybrid', embedding: [1.0, 0.0, 0.0], fusion: 'weighted',
                              text_weight: 0.9, limit: 3}) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title               | score
--------------------------+-------
 Error 1234 at the bakery | 0.911
 Server will not start    | 0.1
 Slow queries             | 0.1
(3 rows)
```

## Cuál elegir

| Fusión | Sirve cuando |
| --- | --- |
| `rank` (por defecto) | los dos puntajes no son comparables; robusta, sin ajustes |
| `weighted` | quieres controlar cuánto cuenta cada lado, y probaste `text_weight` con tus datos |

## Con índices

`index` elige un [índice de texto completo](../gq/full-text.md) para el lado de texto, y `vector_index` un [índice vectorial](vector-indexes.md) para el lado vectorial:

```text
CALL db.search('graph memory', {mode: 'hybrid', index: 'notes', vector_index: 'docs', embedding: $e});
```

:::tip Recall
`POST /v1/{ns}/recall` (y la herramienta MCP `recall`) hace esta búsqueda para agentes y agrega lo que el grafo dice de los resultados. Acepta los mismos `mode`, `fusion`, `index` y `vector_index`.
:::
