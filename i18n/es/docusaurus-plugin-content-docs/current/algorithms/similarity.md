---
title: Similitud y predicción de enlaces
description: Encuentra nodos parecidos por vecinos compartidos con nodeSimilarity, por embedding con knn, predice aristas que faltan con linkPrediction y puntúa pares con funciones de vecinos.
---

# Similitud y predicción de enlaces

Dos nodos se parecen cuando se conectan con las mismas cosas, o cuando sus embeddings apuntan en la misma dirección. Estos algoritmos encuentran esos pares y predicen las aristas que probablemente faltan.

| Algoritmo | Compara por |
| --- | --- |
| `algo.nodeSimilarity` | vecinos compartidos (Jaccard, solapamiento o coseno) |
| `algo.knn` | embeddings (coseno), desde el índice vectorial |
| `algo.linkPrediction(nodo)` | vecinos de vecinos: con quién es probable que `nodo` se enlace después |
| `algo.jaccard(a, b)` y otras funciones | un par a la vez, dentro de cualquier expresión |

## Los datos de ejemplo

Personas y los temas que les gustan:

```text run title="Ejemplo"
CREATE (ana:Person {name: 'Ana'}), (bruno:Person {name: 'Bruno'}), (carla:Person {name: 'Carla'}),
       (diego:Person {name: 'Diego'}),
       (graphs:Topic {name: 'graphs'}), (rust:Topic {name: 'rust'}), (search:Topic {name: 'search'}),
       (cooking:Topic {name: 'cooking'}), (hiking:Topic {name: 'hiking'}),
       (ana)-[:likes]->(graphs), (ana)-[:likes]->(rust), (ana)-[:likes]->(search),
       (bruno)-[:likes]->(graphs), (bruno)-[:likes]->(rust),
       (carla)-[:likes]->(cooking), (carla)-[:likes]->(hiking), (carla)-[:likes]->(search),
       (diego)-[:likes]->(hiking), (diego)-[:likes]->(cooking);
```

```text result title="Resultado"
9 nodes created, 10 edges created
```

## algo.nodeSimilarity

Para cada nodo, los nodos que más vecinos comparten con él. Con `direction: 'out'` (por defecto), los "vecinos" son lo que le gusta a una persona, así que las personas a las que les gustan las mismas cosas se parecen.

**Sintaxis:** `algo.nodeSimilarity({metric: 'jaccard' | 'overlap' | 'cosine', topK: 10, cutoff: 0, node, direction: 'out', …})` da `node`, `other`, `score`.

```text run title="Ejemplo"
CALL algo.nodeSimilarity({labels: ['Person', 'Topic']}) YIELD node, other, score
WHERE node.name < other.name
RETURN node.name, other.name, round(score, 3) AS jaccard ORDER BY jaccard DESC;
```

```text result title="Resultado"
 node.name | other.name | jaccard
-----------+------------+---------
 Ana       | Bruno      | 0.667
 Carla     | Diego      | 0.667
 Ana       | Carla      | 0.2
(3 rows)
```

Jaccard es vecinos compartidos sobre todos los vecinos de ambos: Ana y Bruno comparten 2 de 3 temas.

| `metric` | Puntaje |
| --- | --- |
| `jaccard` (por defecto) | compartidos / todos los de ambos |
| `overlap` | compartidos / el conjunto más chico: 1 cuando los gustos de uno están dentro de los del otro |
| `cosine` | compartidos / √(tamaño × tamaño) |

Un solo nodo, con `node`:

```text run title="Ejemplo"
MATCH (b:Person {name: 'Bruno'})
CALL algo.nodeSimilarity({labels: ['Person', 'Topic'], node: b, metric: 'overlap'}) YIELD other, score
RETURN other.name, round(score, 3) AS overlap;
```

```text result title="Resultado"
 other.name | overlap
------------+---------
 Ana        | 1.0
(1 row)
```

**Úsalo para:** "a quienes les gusta esto también les gusta", clientes parecidos, registros duplicados que enlazan a las mismas cosas.

## algo.linkPrediction

Para un nodo, los nodos a dos saltos con los que es más probable que se enlace, puntuados por cómo están conectados. Las aristas cuentan en ambos sentidos.

**Sintaxis:** `algo.linkPrediction(nodo, {metric: 'adamicAdar', limit: 10, …})` da `other`, `score`.

¿A quién debería conocer Bruno? A personas a dos saltos, a través de los temas que comparten:

```text run title="Ejemplo"
MATCH (b:Person {name: 'Bruno'})
CALL algo.linkPrediction(b, {labels: ['Person', 'Topic']}) YIELD other, score
RETURN other.name, round(score, 3) AS score;
```

```text result title="Resultado"
 other.name | score
------------+-------
 Ana        | 2.885
(1 row)
```

| `metric` | Cuenta |
| --- | --- |
| `adamicAdar` (por defecto) | vecinos compartidos, cada uno con peso 1 / log(su grado): un interés compartido poco común cuenta más |
| `resourceAllocation` | vecinos compartidos con peso 1 / grado |
| `commonNeighbors` | vecinos compartidos |
| `jaccard` | compartidos / todos los vecinos de ambos |
| `preferentialAttachment` | grado × grado: los nodos muy conectados se enlazan entre sí |
| `totalNeighbors` | todos los vecinos de ambos |

**Úsalo para:** recomendar conexiones, encontrar hechos que probablemente faltan en un grafo de conocimiento.

## Funciones por par

Las mismas medidas como funciones, para un par, en cualquier parte de una consulta:

```text run title="Ejemplo"
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}), (c:Person {name: 'Carla'})
RETURN algo.commonNeighbors(a, b) AS common_ab, round(algo.jaccard(a, b), 3) AS jaccard_ab,
       round(algo.adamicAdar(a, c), 3) AS adamic_ac, algo.preferentialAttachment(a, c) AS pref_ac;
```

```text result title="Resultado"
 common_ab | jaccard_ab | adamic_ac | pref_ac
-----------+------------+-----------+---------
 2.0       | 0.667      | 1.443     | 9.0
(1 row)
```

| Función | |
| --- | --- |
| `algo.commonNeighbors(a, b)` | vecinos compartidos |
| `algo.adamicAdar(a, b)` | vecinos compartidos con peso 1 / log(grado) |
| `algo.resourceAllocation(a, b)` | vecinos compartidos con peso 1 / grado |
| `algo.preferentialAttachment(a, b)` | grado × grado |
| `algo.totalNeighbors(a, b)` | vecinos de cualquiera de los dos |
| `algo.jaccard(a, b)`, `algo.overlap(a, b)` | compartidos sobre todos, compartidos sobre el más chico |
| `algo.cosine(lista, lista)` | el coseno de dos vectores |

## algo.knn

Los vecinos más cercanos de cada nodo **por embedding**, desde el índice vectorial (coseno).

**Sintaxis:** `algo.knn({topK: 10, cutoff: 0, node, labels})` da `node`, `other`, `score`.

Dale embeddings a los temas (3 dimensiones aquí: técnico, aire libre, hogar):

```text run title="Ejemplo"
MATCH (t:Topic {name: 'graphs'})  SET t.@embedding = [0.9, 0.0, 0.1];
MATCH (t:Topic {name: 'rust'})    SET t.@embedding = [1.0, 0.1, 0.0];
MATCH (t:Topic {name: 'search'})  SET t.@embedding = [0.8, 0.0, 0.3];
MATCH (t:Topic {name: 'cooking'}) SET t.@embedding = [0.0, 0.2, 0.9];
MATCH (t:Topic {name: 'hiking'})  SET t.@embedding = [0.0, 1.0, 0.2];
CALL algo.knn({topK: 1}) YIELD node, other, score
RETURN node.name, other.name AS nearest, round(score, 3) AS score ORDER BY node.name;
```

```text result title="Resultado"
1 property set
1 property set
1 property set
1 property set
1 property set
 node.name | nearest | score
-----------+---------+-------
 cooking   | hiking  | 0.404
 graphs    | rust    | 0.989
 hiking    | cooking | 0.404
 rust      | graphs  | 0.989
 search    | graphs  | 0.969
(5 rows)
```

`cutoff` descarta los pares bajo un puntaje; `node` lo limita a un nodo.

**Úsalo para:** un grafo de similitud a partir de embeddings (y luego comunidades sobre él), deduplicación por significado.

:::tip Escribir un grafo de similitud
Convierte los pares en aristas y luego ejecuta otros algoritmos sobre ellas:

```text
CALL algo.nodeSimilarity({labels: ['Person', 'Topic'], cutoff: 0.3}) YIELD node, other, score
WHERE node.name < other.name
CREATE (node)-[:similar {score: score}]->(other);
```
:::
