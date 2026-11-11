---
title: Algoritmos de grafos
description: Ejecuta algoritmos de grafos con CALL algo.*, elige qué parte del grafo ven, guarda o resume sus resultados y encuentra el algoritmo indicado para cada pregunta.
---

# Algoritmos de grafos

Los algoritmos de grafos responden preguntas sobre la **forma** del grafo: la ruta más barata, quién es más central, qué grupos se forman, qué se rompería si fallara un nodo, cómo se propaga algo. Grafeno tiene 40, que se ejecutan con `CALL algo.<nombre>(…)` dentro de cualquier consulta GQ.

## Sintaxis

```text
CALL algo.nombre([argumentos,] {opciones})
YIELD columna, …
[WHERE …]
RETURN …
```

## Un primer ejemplo

```text run title="Ejemplo"
CREATE (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'}), (c:Person {name: 'Carla'}),
       (d:Person {name: 'Diego'}), (e:Person {name: 'Eva'}),
       (a)-[:follows]->(b), (c)-[:follows]->(b), (d)-[:follows]->(b),
       (b)-[:follows]->(e), (e)-[:follows]->(b), (a)-[:follows]->(c);
```

```text result title="Resultado"
5 nodes created, 6 edges created
```

¿Quién es más seguido, directamente o a través de otros? PageRank:

```text run title="Ejemplo"
CALL algo.pageRank() YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Resultado"
 node.name | score
-----------+-------
 Bruno     | 0.462
 Eva       | 0.436
 Carla     | 0.043
 Ana       | 0.03
 Diego     | 0.03
(5 rows)
```

Las filas son filas comunes: ordénalas, fíltralas, únelas con patrones.

## Elegir la parte del grafo

Cada algoritmo trabaja sobre una **proyección**: una copia en memoria de la estructura del grafo. Estas opciones eligen qué contiene:

| Opción | Por defecto | Conserva |
| --- | --- | --- |
| `labels` | todos los nodos | nodos con estas etiquetas (un texto o una lista) |
| `edgeLabels` | todas las aristas | aristas con estas etiquetas |
| `weight` | ninguna (cada arista pesa 1) | la propiedad de arista usada como peso, costo o capacidad |
| `direction` | según el algoritmo | `'out'`, `'in'` o `'both'` |
| `validAt`, `knownAt` | ahora | hechos ciertos en un momento, o sabidos en un momento, como en [Viaje en el tiempo](../gq/time-travel.md) |

```text run title="Ejemplo"
CALL algo.pageRank({labels: 'Person', edgeLabels: 'follows', iterations: 40}) YIELD node, score
RETURN node.name, round(score, 3) AS score LIMIT 2;
```

```text result title="Resultado"
 node.name | score
-----------+-------
 Bruno     | 0.469
 Eva       | 0.429
(2 rows)
```

Una opción que el algoritmo no conoce es un error, así que un error de tipeo no pasa inadvertido:

```text run title="Ejemplo"
CALL algo.pageRank({iteration: 40}) YIELD node, score RETURN count(*);
```

```text result title="Resultado"
error: algo.pageRank() has no setting iteration (it takes damping, direction, edgeLabels, iterations, knownAt, labels, mode, sources, tolerance, top, validAt, weight, write)
```

Los argumentos de nodo (un origen, un destino) son nodos de un `MATCH`, o sus ids como texto.

## Modos: stats y write

Dos opciones sirven para todos los algoritmos. `mode: 'stats'` resume el resultado en lugar de devolverlo fila por fila:

```text run title="Ejemplo"
CALL algo.pageRank({mode: 'stats'});
```

```text result title="Resultado"
 column | count | min                 | max                 | mean               | sum
--------+-------+---------------------+---------------------+--------------------+--------------------
 rows   | 5     | null                | null                | null               | null
 score  | 5     | 0.03000000000000001 | 0.46166041050338674 | 0.2000000000000001 | 1.0000000000000004
(2 rows)
```

`write: 'propiedad'` guarda el resultado en cada nodo y dice cuántos se escribieron:

```text run title="Ejemplo"
CALL algo.pageRank({write: 'rank'});
MATCH (p:Person) RETURN p.name, round(p.rank, 3) AS rank ORDER BY rank DESC LIMIT 3;
```

```text result title="Resultado"
 property | column | nodes
----------+--------+-------
 rank     | score  | 5
(1 row)
5 properties set
 p.name | rank
--------+-------
 Bruno  | 0.462
 Eva    | 0.436
 Carla  | 0.043
(3 rows)
```

Un algoritmo con varias columnas escribe varias propiedades con un mapa: `write: {hub: 'hub', authority: 'auth'}`. `mode` y `write` deben escribirse en la sentencia, no pasarse como parámetros, para saber antes de ejecutarla si la sentencia escribe.

Sin `write`, `SET` guarda lo que elijas:

```text run title="Ejemplo"
CALL algo.degree() YIELD node, score SET node.degree = score;
MATCH (p:Person) RETURN p.name, p.degree ORDER BY p.degree DESC, p.name;
```

```text result title="Resultado"
5 properties set
 p.name | p.degree
--------+----------
 Bruno  | 5.0
 Ana    | 2.0
 Carla  | 2.0
 Eva    | 2.0
 Diego  | 1.0
(5 rows)
```

## ¿Qué algoritmo?

| Quieres saber | Usa | Página |
| --- | --- | --- |
| la ruta más barata o más corta | `shortestPath`, `astar`, `kShortestPaths`, `allShortestPaths`, `distances` | [Caminos](paths.md) |
| quién importa más | `degree`, `pageRank`, `betweenness`, `closeness`, `harmonic`, `eigenvector`, `hits` | [Centralidad](centrality.md) |
| qué grupos se forman | `wcc`, `scc`, `labelPropagation`, `louvain`, `leiden`, `kCore`, `triangles`, `clustering`, `conductance` | [Comunidades](communities.md) |
| quién se parece, qué enlace falta | `nodeSimilarity`, `knn`, `linkPrediction`, funciones por par | [Similitud](similarity.md) |
| qué se rompería, en qué orden | `articulationPoints`, `bridges`, `spanningTree`, `topologicalOrder`, `cycle` | [Estructura](structure.md) |
| cuánto puede fluir, quién va con quién | `maxFlow`, `minCostFlow`, `bipartiteMatching`, `assignment` | [Flujos y emparejamiento](flows.md) |
| secuencias y rasgos para aprendizaje | `randomWalks`, `fastRP` | [Recorridos y embeddings](walks-embeddings.md) |
| cómo se mueven y propagan las cosas | `distanceField`, `influence`, `floodFill`, `diffusion`, `automaton` | [Simulación](simulation.md) |

## Por HTTP

`POST /v1/{ns}/algo/{nombre}` ejecuta uno. El cuerpo lleva los argumentos previos a las opciones (`args`, nodos por id), las `settings`, y `stats: true` o `write` (con `column`):

```bash
curl -s -X POST http://127.0.0.1:7810/v1/demo/algo/pageRank -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"settings": {"labels": "Person"}, "stats": true}'
```

El cliente de TypeScript tiene `ns.algorithm(nombre, opciones)`.

:::tip Bueno saber
- La proyección queda en caché hasta que una escritura cambie los datos, así que varios algoritmos sobre la misma parte del grafo la construyen una vez.
- Los algoritmos corren dentro de los límites de la consulta (tiempo, memoria) y solo ven lo que quien llama puede leer.
- `top: n` en los algoritmos de centralidad conserva las mejores `n` filas: en un grafo grande, evita leer cada nodo.
- `EXPLAIN` estima el costo de un algoritmo antes de ejecutarlo.
:::
