---
title: Índices vectoriales
description: Índices vectoriales con nombre sobre una propiedad de etiquetas elegidas, con similitud coseno, producto punto o euclidiana, opciones de HNSW, filtros, varias consultas a la vez y construcción en segundo plano.
---

# Índices vectoriales

Un **índice vectorial** guarda una propiedad de los nodos con ciertas etiquetas, una lista de números de dimensión fija, y encuentra los más cercanos. Un namespace puede tener varios: uno por modelo, por tipo de contenido o por tamaño.

## Sintaxis

```text
CREATE VECTOR INDEX nombre [IF NOT EXISTS] FOR (n:Etiqueta|Otra) ON (n.propiedad)
  OPTIONS {dimension: 768, similarity: 'cosine' | 'dot' | 'euclidean',
           m: 16, ef_construction: 100, ef_search: 64, background: false}
CALL db.searchVector(vector, {index: 'nombre', limit: 10, labels: [...], where: {...}, ef: 64})
CALL db.searchVectors([vector, …], {index: 'nombre', limit: 5})
CALL db.similar(nodo, {index: 'nombre', limit: 10})
DROP INDEX nombre
```

## Crear un índice

Descripciones de productos con embeddings de 4 dimensiones, comparadas por coseno:

```text run title="Ejemplo"
CREATE VECTOR INDEX products FOR (p:Product) ON (p.embedding)
  OPTIONS {dimension: 4, similarity: 'cosine'};
```

```text result title="Resultado"
 name     | label   | property  | unique | entries | fuzzy | on    | key   | kind   | state
----------+---------+-----------+--------+---------+-------+-------+-------+--------+--------
 products | Product | embedding | false  | 0       | false | nodes | false | vector | online
(1 row)
```

## Los datos de ejemplo

Escribe los vectores como una propiedad. Los nodos con la etiqueta y una lista del largo correcto entran al índice:

```text run title="Ejemplo"
CREATE (:Product {name: 'Trail shoes',    category: 'shoes',  price: 120, embedding: [0.9, 0.1, 0.0, 0.2]}),
       (:Product {name: 'Road shoes',     category: 'shoes',  price: 90,  embedding: [0.8, 0.2, 0.1, 0.1]}),
       (:Product {name: 'Rain jacket',    category: 'jacket', price: 150, embedding: [0.2, 0.9, 0.1, 0.0]}),
       (:Product {name: 'Wool jacket',    category: 'jacket', price: 200, embedding: [0.1, 0.8, 0.3, 0.1]}),
       (:Product {name: 'Hiking socks',   category: 'socks',  price: 15,  embedding: [0.6, 0.1, 0.0, 0.7]}),
       (:Product {name: 'Camp stove',     category: 'gear',   price: 60,  embedding: [0.1, 0.1, 0.9, 0.2]});
```

```text result title="Resultado"
6 nodes created
```

## Buscar

```text run title="Ejemplo"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 3}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 node.name    | score
--------------+-------
 Trail shoes  | 0.992
 Road shoes   | 0.95
 Hiking socks | 0.837
(3 rows)
```

## Filtrar mientras se busca

`labels` y `where` conservan solo los nodos que calzan. El filtro se aplica **durante** la búsqueda, así que igual recibes `limit` resultados aunque calcen pocos nodos:

```text run title="Ejemplo"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 3, where: {category: 'jacket'}})
YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 node.name   | score
-------------+-------
 Rain jacket | 0.207
 Wool jacket | 0.144
(2 rows)
```

Las condiciones que no son igualdades van después de la búsqueda, en `WHERE`:

```text run title="Ejemplo"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 6}) YIELD node, score
WHERE node.price < 100
RETURN node.name, node.price, round(score, 3) AS score;
```

```text result title="Resultado"
 node.name    | node.price | score
--------------+------------+-------
 Road shoes   | 90         | 0.95
 Hiking socks | 15         | 0.837
 Camp stove   | 60         | 0.164
(3 rows)
```

## Varias consultas a la vez

`db.searchVectors` recibe una lista de vectores; `query` dice a cuál responde cada fila:

```text run title="Ejemplo"
CALL db.searchVectors([[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]], {index: 'products', limit: 2})
YIELD query, node, score
RETURN query, node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 query | node.name   | score
-------+-------------+-------
 0     | Trail shoes | 0.97
 0     | Road shoes  | 0.956
 1     | Rain jacket | 0.97
 1     | Wool jacket | 0.924
(4 rows)
```

## Productos parecidos

```text run title="Ejemplo"
MATCH (p:Product {name: 'Trail shoes'})
CALL db.similar(p, {index: 'products', limit: 3}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 node.name    | score
--------------+-------
 Road shoes   | 0.98
 Hiking socks | 0.802
 Rain jacket  | 0.314
(3 rows)
```

## Elegir la similitud

| Similitud | Puntaje | Úsala cuando |
| --- | --- | --- |
| `cosine` (por defecto) | el coseno del ángulo, hasta 1 | los vectores del modelo se comparan por dirección (la mayoría de los modelos de texto) |
| `dot` | el producto punto, sin límite | el modelo indica usar el producto interno, o el largo tiene significado |
| `euclidean` | `1 / (1 + distancia)` | puntos en el espacio: posiciones, mediciones |

Los mismos puntos con distancia euclidiana:

```text run title="Ejemplo"
CREATE VECTOR INDEX places FOR (s:Spot) ON (s.xy) OPTIONS {dimension: 2, similarity: 'euclidean'};
CREATE (:Spot {name: 'near', xy: [1.0, 1.0]}), (:Spot {name: 'far, same direction', xy: [10.0, 10.0]}),
       (:Spot {name: 'other side', xy: [-1.0, 1.0]});
CALL db.searchVector([1.0, 1.2], {index: 'places', limit: 3}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 name   | label | property | unique | entries | fuzzy | on    | key   | kind   | state
--------+-------+----------+--------+---------+-------+-------+-------+--------+--------
 places | Spot  | xy       | false  | 0       | false | nodes | false | vector | online
(1 row)
3 nodes created
 node.name           | score
---------------------+-------
 near                | 0.833
 other side          | 0.332
 far, same direction | 0.074
(3 rows)
```

Por distancia euclidiana gana "near" y "far" queda último; por coseno, "near" y "far" empatarían, porque apuntan en la misma dirección.

## Dimensiones equivocadas

Una lista de otro largo se rechaza; un valor que no es una lista de números simplemente no se indexa:

```text run title="Ejemplo"
CREATE (:Product {name: 'Broken', embedding: [0.1, 0.2]});
```

```text result title="Resultado"
error: invalid input: products holds vectors of dimension 4: node 01a1cb1f-5312-76ab-90ba-7512656cee99 has 2 values in embedding
```

## Ajustar el índice

| Opción | Por defecto | Más alto significa |
| --- | --- | --- |
| `m` | 16 | más enlaces por nodo: mejor recall, más memoria e inserciones más lentas (de 2 a 128) |
| `ef_construction` | 100 | más candidatos al insertar: un mejor grafo, inserciones más lentas |
| `ef_search` | 64 | más candidatos al buscar: mejor recall, búsquedas más lentas; una búsqueda puede pasar su propio `ef` |

```text run title="Ejemplo"
CALL db.searchVector([1.0, 0.0, 0.0, 0.3], {index: 'products', limit: 2, ef: 200}) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 node.name   | score
-------------+-------
 Trail shoes | 0.992
 Road shoes  | 0.95
(2 rows)
```

[Dimensionamiento](sizing.md) muestra cuánto cuesta esto en memoria y tiempo.

## Construir en segundo plano

Sobre una etiqueta grande, `background: true` crea el índice vacío y lo llena por tramos mientras siguen las escrituras. `SHOW INDEXES` dice `building` y luego `online`:

```text run title="Ejemplo"
UNWIND range(1, 500) AS i
CREATE (:Review {stars: i % 5 + 1, embedding: [toFloat(i % 7), toFloat(i % 11), toFloat(i % 13), 1.0]});
CREATE VECTOR INDEX reviews FOR (r:Review) ON (r.embedding)
  OPTIONS {dimension: 4, background: true};
```

```text result title="Resultado"
500 nodes created
 name    | label  | property  | unique | entries | fuzzy | on    | key   | kind   | state
---------+--------+-----------+--------+---------+-------+-------+-------+--------+----------
 reviews | Review | embedding | false  | 0       | false | nodes | false | vector | building
(1 row)
```

Una propiedad puede estar en un solo índice vectorial: un segundo índice sobre `Product.embedding` se rechaza.

## Listar y borrar

```text run title="Ejemplo"
SHOW INDEXES;
```

```text result title="Resultado"
 name     | label   | property  | unique | entries | fuzzy | on    | key   | kind   | state
----------+---------+-----------+--------+---------+-------+-------+-------+--------+----------
 places   | Spot    | xy        | false  | 3       | false | nodes | false | vector | online
 products | Product | embedding | false  | 6       | false | nodes | false | vector | online
 reviews  | Review  | embedding | false  | 0       | false | nodes | false | vector | building
(3 rows)
```

```text run title="Ejemplo"
DROP INDEX reviews;
```

```text result title="Resultado"
 name    | label  | property  | unique | entries | fuzzy | on    | key   | kind   | state
---------+--------+-----------+--------+---------+-------+-------+-------+--------+----------
 reviews | Review | embedding | false  | 0       | false | nodes | false | vector | building
(1 row)
```

:::tip Bueno saber
- El índice se mantiene en la misma transacción que cada escritura, y se exporta, replica y borra como cualquier índice.
- Un nodo con varias etiquetas de un índice se indexa una vez.
- Cuando a lo más 4 096 nodos pasan un filtro `labels`, esos se puntúan de forma exacta en lugar de recorrer el grafo.
:::
