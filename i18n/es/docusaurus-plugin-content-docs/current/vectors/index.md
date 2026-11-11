---
title: Vectores y embeddings
description: Qué son los embeddings, cómo guardar un vector en un nodo y cómo encontrar los nodos más cercanos por significado con db.searchVector y db.similar.
---

# Vectores y embeddings

Un **embedding** es una lista de números que representa el significado de algo: un texto, una imagen, un producto. Los textos sobre el mismo tema reciben vectores que apuntan en direcciones parecidas, así que "los vectores más cercanos" quiere decir "el significado más parecido". Grafeno guarda vectores en los nodos y encuentra rápido los más cercanos, con un índice HNSW.

Grafeno no calcula embeddings: tu aplicación, o un modelo que ella ejecuta, lo hace y guarda el resultado. Grafeno los guarda, los indexa y los busca junto con el grafo y el texto.

## Dos formas de guardar vectores

| | El embedding del nodo | Un índice vectorial |
| --- | --- | --- |
| Dónde | `@embedding`, uno por nodo | una propiedad (`d.embedding`) de etiquetas elegidas |
| Cuántos por namespace | un espacio, una dimensión | tantos índices como quieras, cada uno con su dimensión |
| Similitud | coseno | coseno, producto punto o euclidiana |
| Preparación | ninguna | `CREATE VECTOR INDEX` |
| Búsqueda | `db.searchVector(v)` | `db.searchVector(v, {index: 'nombre'})` |

Esta página trata el embedding del nodo. [Índices vectoriales](vector-indexes.md) trata los índices con nombre, [Búsqueda híbrida](hybrid-search.md) mezcla vectores con texto, y [Dimensionamiento](sizing.md) te ayuda a elegir dimensiones y memoria.

## Los datos de ejemplo

Los embeddings reales tienen cientos de dimensiones. Estos tienen tres, para que puedas leerlos: el primer número representa "sobre animales", el segundo "sobre vehículos", el tercero "sobre comida":

```text run title="Ejemplo"
CREATE (:Doc {title: 'Cats and dogs',      @embedding: [0.9, 0.1, 0.1]}),
       (:Doc {title: 'Wolves in winter',   @embedding: [0.8, 0.2, 0.0]}),
       (:Doc {title: 'Electric cars',      @embedding: [0.1, 0.9, 0.1]}),
       (:Doc {title: 'Trains of Europe',   @embedding: [0.0, 0.8, 0.3]}),
       (:Doc {title: 'Bread at home',      @embedding: [0.1, 0.0, 0.9]}),
       (:Doc {title: 'Feeding a puppy',    @embedding: [0.6, 0.0, 0.6]});
```

```text result title="Resultado"
6 nodes created
```

## Encontrar los nodos más cercanos

`db.searchVector(vector, límite)` da los nodos más cercanos y su similitud, desde 1 (la misma dirección) hacia abajo:

```text run title="Ejemplo"
CALL db.searchVector([1.0, 0.0, 0.0], 3) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title       | score
------------------+-------
 Cats and dogs    | 0.988
 Wolves in winter | 0.97
 Feeding a puppy  | 0.707
(3 rows)
```

Un vector de consulta "sobre vehículos":

```text run title="Ejemplo"
CALL db.searchVector([0.0, 1.0, 0.1], 2) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title       | score
------------------+-------
 Electric cars    | 0.994
 Trains of Europe | 0.967
(2 rows)
```

## Parecidos a un nodo

`db.similar(nodo, límite)` usa el vector del propio nodo y deja fuera al nodo:

```text run title="Ejemplo"
MATCH (d:Doc {title: 'Feeding a puppy'})
CALL db.similar(d, 3) YIELD node, score
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title       | score
------------------+-------
 Bread at home    | 0.781
 Cats and dogs    | 0.776
 Wolves in winter | 0.686
(3 rows)
```

## Leer y cambiar un vector

El embedding del nodo se guarda **normalizado** (escalado a largo 1), porque la similitud coseno solo mira la dirección. Leerlo devuelve la misma dirección, no los mismos números:

```text run title="Ejemplo"
MATCH (d:Doc {title: 'Bread at home'}) RETURN [x IN d.@embedding | round(x, 3)] AS embedding;
```

```text result title="Resultado"
 embedding
--------------------
 [0.11, 0.0, 0.994]
(1 row)
```

```text run title="Ejemplo"
MATCH (d:Doc {title: 'Bread at home'}) SET d.@embedding = [0.2, 0.0, 0.8];
MATCH (d:Doc {title: 'Bread at home'}) RETURN [x IN d.@embedding | round(x, 3)] AS embedding;
```

```text result title="Resultado"
1 property set
 embedding
--------------------
 [0.243, 0.0, 0.97]
(1 row)
```

Si necesitas los números tal como los diste, usa un [índice vectorial](vector-indexes.md): lee los vectores de una propiedad, y la propiedad conserva lo que escribiste.

`SET d.@embedding = null` lo quita.

## Comparar dos vectores

`algo.cosine(a, b)` compara dos listas de números cualesquiera:

```text run title="Ejemplo"
MATCH (a:Doc {title: 'Cats and dogs'}), (b:Doc)
WHERE a <> b
RETURN b.title, round(algo.cosine(a.@embedding, b.@embedding), 3) AS cosine
ORDER BY cosine DESC LIMIT 3;
```

```text result title="Resultado"
 b.title          | cosine
------------------+--------
 Wolves in winter | 0.985
 Feeding a puppy  | 0.776
 Bread at home    | 0.346
(3 rows)
```

## Buscar y después usar el grafo

La búsqueda da nodos, así que la consulta sigue desde ellos. Aquí, con un filtro de puntaje:

```text run title="Ejemplo"
CALL db.searchVector([0.7, 0.1, 0.4], 5) YIELD node, score
WHERE score > 0.8
RETURN node.title, round(score, 3) AS score;
```

```text result title="Resultado"
 node.title       | score
------------------+-------
 Feeding a puppy  | 0.957
 Cats and dogs    | 0.919
 Wolves in winter | 0.866
(3 rows)
```

## Una dimensión por namespace

El primer `@embedding` fija la dimensión del namespace. Un vector de otro largo se rechaza:

```text run title="Ejemplo"
CALL db.stats() YIELD vectors, dimension;
CREATE (:Doc {title: 'Wrong size', @embedding: [0.1, 0.2]});
```

```text result title="Resultado"
 vectors | dimension
---------+-----------
 6       | 3
(1 row)
error: invalid input: namespace "demo" stores vectors of dimension 3, got 2
```

Para guardar vectores de varios modelos o tamaños en un namespace, usa [índices vectoriales](vector-indexes.md).

:::tip Bueno saber
- La similitud coseno ignora el largo: `[1, 0, 0]` y `[5, 0, 0]` tienen la misma dirección.
- Las escrituras mantienen el índice vectorial al día en la misma transacción.
- `algo.knn` encuentra los vecinos más cercanos de cada nodo a la vez, ver [Algoritmos de similitud](../algorithms/similarity.md).
:::
