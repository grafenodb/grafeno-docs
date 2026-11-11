---
title: Recorridos y embeddings
description: Genera recorridos aleatorios reproducibles con algo.randomWalks y embeddings estructurales de nodos con algo.fastRP para comparar y agrupar nodos por su posición en el grafo.
---

# Recorridos y embeddings

Dos algoritmos convierten el grafo en material para estadística y aprendizaje automático: secuencias de nodos (recorridos) y vectores que describen la posición de cada nodo (embeddings).

| Algoritmo | Da |
| --- | --- |
| `algo.randomWalks(inicios)` | recorridos desde nodos, cada paso elegido según el peso de las aristas |
| `algo.fastRP()` | un vector por nodo: los nodos en posiciones parecidas reciben vectores parecidos |

## Los datos de ejemplo

Dos grupos chicos de personas, unidos por una amistad:

```text run title="Ejemplo"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}), (carla:Person {name: 'Carla'}),
       (diego:Person {name: 'Diego'}), (eva:Person {name: 'Eva'}), (fabio:Person {name: 'Fabio'}),
       (ana)-[:knows {strength: 3}]->(bruno), (bruno)-[:knows {strength: 1}]->(carla),
       (carla)-[:knows {strength: 2}]->(ana), (carla)-[:knows {strength: 1}]->(diego),
       (diego)-[:knows {strength: 2}]->(eva), (eva)-[:knows {strength: 2}]->(fabio),
       (fabio)-[:knows {strength: 1}]->(diego);
```

```text result title="Resultado"
6 nodes created, 7 edges created
```

## algo.randomWalks

Desde cada inicio, `walks` recorridos de hasta `length` pasos. Cada paso va a un vecino elegido al azar, más seguido por las aristas más pesadas cuando se da `weight`. La misma `seed` da los mismos recorridos.

**Sintaxis:** `algo.randomWalks(inicios | null, {length: 10, walks: 1, seed: 42, direction, weight, …})` da `start`, `walk`.

Tres recorridos de cinco pasos desde Ana, siguiendo las amistades en ambos sentidos:

```text run title="Ejemplo"
MATCH (a:Person {name: 'Ana'})
CALL algo.randomWalks(a, {length: 5, walks: 3, direction: 'both'}) YIELD walk
RETURN [n IN walk | n.name] AS walk;
```

```text result title="Resultado"
 walk
------------------------------------------
 [Ana, Carla, Ana, Bruno, Carla, Ana]
 [Ana, Carla, Ana, Carla, Diego, Carla]
 [Ana, Bruno, Carla, Diego, Carla, Diego]
(3 rows)
```

Con `weight`, las amistades fuertes se siguen más seguido:

```text run title="Ejemplo"
MATCH (a:Person {name: 'Ana'})
CALL algo.randomWalks(a, {length: 5, walks: 3, direction: 'both', weight: 'strength', seed: 7}) YIELD walk
RETURN [n IN walk | n.name] AS walk;
```

```text result title="Resultado"
 walk
----------------------------------------
 [Ana, Bruno, Carla, Bruno, Ana, Bruno]
 [Ana, Bruno, Ana, Bruno, Carla, Ana]
 [Ana, Bruno, Ana, Carla, Bruno, Ana]
(3 rows)
```

`null` parte desde todos los nodos:

```text run title="Ejemplo"
CALL algo.randomWalks(null, {length: 3, direction: 'both'}) YIELD start, walk
RETURN start.name, [n IN walk | n.name] AS walk ORDER BY start.name;
```

```text result title="Resultado"
 start.name | walk
------------+----------------------------
 Ana        | [Ana, Carla, Ana, Bruno]
 Bruno      | [Bruno, Carla, Ana, Carla]
 Carla      | [Carla, Ana, Carla, Diego]
 Diego      | [Diego, Carla, Ana, Bruno]
 Eva        | [Eva, Diego, Carla, Diego]
 Fabio      | [Fabio, Diego, Eva, Fabio]
(6 rows)
```

**Úsalo para:** muestrear un grafo grande, entrenar modelos de secuencias con la estructura del grafo, estimar qué tan seguido un recorrido llega a un lugar (un sustituto barato de las probabilidades de visita).

## algo.fastRP

Proyección aleatoria rápida: cada nodo recibe un vector armado con vectores aleatorios de sus vecinos, de los vecinos de sus vecinos, y así. Los nodos en posiciones parecidas, con alrededores parecidos, reciben vectores parecidos. Sin entrenamiento. El vector aleatorio de cada nodo sale de la `seed` y del id del nodo, así que el mismo grafo da siempre los mismos vectores; un grafo creado de nuevo (con ids nuevos) recibe otros números, y similitudes entre nodos parecidas pero no idénticas.

**Sintaxis:** `algo.fastRP({dimension: 128, iterationWeights: [0, 1, 1], selfInfluence: 0, normalizationStrength: 0, seed: 42, …})` da `node`, `embedding`.

```text run title="Ejemplo"
CALL algo.fastRP({dimension: 8, direction: 'both'}) YIELD node, embedding
RETURN node.name, [x IN embedding | round(x, 2)] AS embedding ORDER BY node.name;
```

```text result title="Resultado"
 node.name | embedding
-----------+-----------------------------------------------------
 Ana       | [0.0, -0.22, 0.58, -0.13, 0.22, -0.29, -0.17, 0.66]
 Bruno     | [0.0, -0.17, 0.58, -0.08, 0.25, -0.33, -0.17, 0.66]
 Carla     | [0.0, -0.04, 0.51, -0.13, 0.25, -0.29, -0.2, 0.73]
 Diego     | [0.0, 0.3, 0.07, -0.15, 0.61, 0.04, -0.43, 0.57]
 Eva       | [0.0, 0.51, -0.12, -0.16, 0.58, 0.16, -0.38, 0.45]
 Fabio     | [0.0, 0.43, -0.06, -0.11, 0.55, 0.11, -0.4, 0.56]
(6 rows)
```

Compara los vectores: las personas del mismo grupo están más cerca entre sí que del otro grupo:

```text run title="Ejemplo"
CALL algo.fastRP({dimension: 64, direction: 'both'}) YIELD node, embedding
WITH collect({name: node.name, v: embedding}) AS all
UNWIND all AS a
UNWIND all AS b
WITH a, b WHERE a.name < b.name
RETURN a.name, b.name, round(algo.cosine(a.v, b.v), 2) AS similarity
ORDER BY similarity DESC LIMIT 5;
```

```text result title="Resultado"
 a.name | b.name | similarity
--------+--------+------------
 Ana    | Bruno  | 0.99
 Eva    | Fabio  | 0.99
 Ana    | Carla  | 0.97
 Bruno  | Carla  | 0.97
 Diego  | Fabio  | 0.97
(5 rows)
```

### Guardar los vectores y buscarlos

Escríbelos como el embedding de cada nodo y luego usa la [búsqueda vectorial](../vectors/index.md) sobre la estructura:

```text run title="Ejemplo"
CALL algo.fastRP({dimension: 16, direction: 'both', write: '@embedding'});
MATCH (a:Person {name: 'Ana'})
CALL db.similar(a, 2) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 property   | column    | nodes
------------+-----------+-------
 @embedding | embedding | 6
(1 row)
6 properties set
 node.name | score
-----------+-------
 Bruno     | 0.99
 Carla     | 0.982
(2 rows)
```

| Opción | Por defecto | Efecto |
| --- | --- | --- |
| `dimension` | 128 | largo de los vectores |
| `iterationWeights` | `[0, 1, 1]` | cuánto cuenta cada salto: el propio nodo, sus vecinos, los de ellos… |
| `selfInfluence` | 0 | peso del vector aleatorio propio del nodo |
| `normalizationStrength` | 0 | valores negativos favorecen vecinos de grado bajo, positivos los de grado alto |
| `seed` | 42 | los vectores aleatorios, junto con el id de cada nodo |

**Úsalo para:** rasgos para clasificadores, nodos parecidos por posición (roles, no solo vecinos), agrupar con [knn](similarity.md#algoknn) y [Louvain](communities.md#algolouvain).
