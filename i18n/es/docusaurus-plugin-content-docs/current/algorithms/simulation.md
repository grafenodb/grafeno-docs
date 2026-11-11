---
title: Simulación
description: Modela lugares, agentes y propagación con campos de distancia, mapas de influencia, relleno por inundación, difusión y autómatas celulares sobre cualquier grafo.
---

# Simulación

Un grafo es un mapa: salas unidas por puertas, pueblos por caminos, personas por amistades. Estos algoritmos simulan lo que pasa en ese mapa: qué tan lejos está todo de la meta más cercana, hasta dónde llega la influencia de cada uno, qué región se puede alcanzar, cómo se reparte una cantidad y cómo cambian los estados según reglas locales.

| Algoritmo | Simula |
| --- | --- |
| `algo.distanceField(orígenes)` | el costo desde cada nodo hasta su origen más cercano, y cuál es |
| `algo.influence(orígenes)` | el valor de cada origen que se debilita con el costo, combinado donde se encuentran |
| `algo.floodFill(semillas)` | la región alcanzable desde las semillas por nodos permitidos |
| `algo.diffusion()` | una cantidad que se reparte a los vecinos paso a paso, sin cambiar el total |
| `algo.automaton()` | el estado encendido/apagado de cada nodo cambiando a la vez según una regla sobre sus vecinos |

## Los datos de ejemplo

Un mapa de 4 × 4 salas. Cada sala da a las salas de al lado; entrar o salir de una sala inundada cuesta 3 en vez de 1:

```text
   x: 0     1     2     3
y=0  .     .     .     .
y=1  .     ~     ~     .
y=2  .     ~     .     .
y=3  .     .     .     .      ~ = agua
```

```text run title="Ejemplo"
UNWIND range(0, 3) AS y
UNWIND range(0, 3) AS x
CREATE (:Room {x: x, y: y, floor: CASE WHEN [x, y] IN [[1, 1], [2, 1], [1, 2]] THEN 'water' ELSE 'stone' END});
MATCH (a:Room), (b:Room)
WHERE (b.x = a.x + 1 AND b.y = a.y) OR (b.y = a.y + 1 AND b.x = a.x)
CREATE (a)-[:door {cost: CASE WHEN a.floor = 'water' OR b.floor = 'water' THEN 3 ELSE 1 END}]->(b);
```

```text result title="Resultado"
16 nodes created
24 edges created
```

Los resultados se muestran como mapas: una fila por cada `y`, las salas de `x` 0 a 3.

## algo.distanceField

Desde cada nodo, el costo hasta el origen **más cercano** y cuál es, en una sola búsqueda desde todos los orígenes a la vez. Un agente en cualquier parte llega a su meta más cercana yendo al vecino de menor costo.

**Sintaxis:** `algo.distanceField(orígenes, {weight, maxCost, direction: 'both', …})` da `node`, `cost`, `nearest`.

Dos salidas, en esquinas opuestas:

```text run title="Ejemplo"
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
CALL algo.distanceField([a, b], {weight: 'cost'}) YIELD node, cost
WITH node.y AS y, node.x AS x, cost ORDER BY y, x
RETURN y, collect(toInteger(cost)) AS cost_to_nearest_exit ORDER BY y;
```

```text result title="Resultado"
 y | cost_to_nearest_exit
---+----------------------
 0 | [0, 1, 2, 3]
 1 | [1, 4, 5, 2]
 2 | [2, 5, 2, 1]
 3 | [3, 2, 1, 0]
(4 rows)
```

A qué salida debería ir cada sala:

```text run title="Ejemplo"
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
CALL algo.distanceField([a, b], {weight: 'cost'}) YIELD node, nearest
WITH node.y AS y, node.x AS x, CASE nearest.x WHEN 0 THEN 'A' ELSE 'B' END AS exit ORDER BY y, x
RETURN y, collect(exit) AS nearest_exit ORDER BY y;
```

```text result title="Resultado"
 y | nearest_exit
---+--------------
 0 | [A, A, A, A]
 1 | [A, A, A, B]
 2 | [A, A, B, B]
 3 | [A, B, B, B]
(4 rows)
```

**Úsalo para:** evacuación y búsqueda de caminos para muchos agentes a la vez, el hospital o la tienda más cercana a cada dirección, campos de flujo en juegos.

## algo.influence

Cada origen esparce su valor (su propiedad `value`, o 1), multiplicado por `decay` por cada unidad de costo en el camino más barato, hasta que cae bajo `threshold` o pasa `maxCost`. Donde llegan varios orígenes, su influencia se suma (`combine: 'sum'`) o gana la más fuerte (`'max'`).

**Sintaxis:** `algo.influence(orígenes, {value: propiedad, decay: 0.5, threshold: 0.01, maxCost, combine: 'sum', weight, …})` da `node`, `influence`.

Dos antenas de radio, una fuerte y una débil:

```text run title="Ejemplo"
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
SET a.value = 8, b.value = 2;
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
CALL algo.influence([a, b], {weight: 'cost', value: 'value'}) YIELD node, influence
WITH node.y AS y, node.x AS x, round(influence, 2) AS signal ORDER BY y, x
RETURN y, collect(signal) AS signal ORDER BY y;
```

```text result title="Resultado"
2 properties set
 y | signal
---+--------------------------
 0 | [8.03, 4.06, 2.13, 1.25]
 1 | [4.06, 0.5, 0.31, 1.0]
 2 | [2.13, 0.31, 0.63, 1.25]
 3 | [1.25, 1.0, 1.25, 2.13]
(4 rows)
```

**Úsalo para:** mapas de territorio y control, cobertura de antenas o tiendas, qué tan fuerte llega un rumor o una marca a cada lugar.

## algo.floodFill

La región alcanzable desde las semillas, entrando solo a nodos cuyas propiedades calzan con `where` (y etiquetas en `inside`), con la cantidad de pasos hasta cada uno.

**Sintaxis:** `algo.floodFill(semillas, {where: {propiedad: valor}, inside: [etiquetas], direction: 'both', …})` da `node`, `steps`.

¿Hasta dónde puede caminar alguien en la sala (0, 3) sin mojarse?

```text run title="Ejemplo"
MATCH (s:Room {x: 0, y: 3})
CALL algo.floodFill(s, {where: {floor: 'stone'}}) YIELD node, steps
RETURN count(node) AS dry_rooms_reached, max(steps) AS farthest;
```

```text result title="Resultado"
 dry_rooms_reached | farthest
-------------------+----------
 13                | 6
(1 row)
```

```text run title="Ejemplo"
MATCH (s:Room {x: 0, y: 3})
CALL algo.floodFill(s, {where: {floor: 'stone'}}) YIELD node, steps
WITH collect(node) AS reached, collect(steps) AS counts
MATCH (r:Room)
WITH r, [i IN range(0, size(reached) - 1) WHERE reached[i] = r | counts[i]] AS found
WITH r.y AS y, r.x AS x, CASE WHEN size(found) = 0 THEN '#' ELSE toString(found[0]) END AS cell ORDER BY y, x
RETURN y, collect(cell) AS steps ORDER BY y;
```

```text result title="Resultado"
 y | steps
---+--------------
 0 | [3, 4, 5, 6]
 1 | [2, #, #, 5]
 2 | [1, #, 3, 4]
 3 | [0, 1, 2, 3]
(4 rows)
```

`#` marca las salas a las que el camino seco no llega. Las salas inundadas cierran el paso, así que el camino las rodea.

**Úsalo para:** áreas alcanzables, la región que puede tomar un incendio o una inundación, pintar zonas de un mapa, áreas conectadas de un mismo tipo.

## algo.diffusion

Cada nodo tiene una cantidad `amount` (una propiedad). En cada paso, `rate` de la cantidad de cada nodo sale de él, repartida entre sus vecinos según el peso de las aristas. Un nodo guarda como máximo su propiedad `capacity`, si la tiene; lo que no cabe se queda. El total nunca cambia.

**Sintaxis:** `algo.diffusion({amount: propiedad, rate: 0.5, steps: 10, capacity: propiedad, weight, …})` da `node`, `amount`.

Calor puesto en una sala de la esquina se reparte durante tres pasos:

```text run title="Ejemplo"
MATCH (r:Room) SET r.heat = CASE WHEN r.x = 0 AND r.y = 0 THEN 100.0 ELSE 0.0 END;
CALL algo.diffusion({amount: 'heat', steps: 3}) YIELD node, amount
WITH node.y AS y, node.x AS x, round(amount, 1) AS heat ORDER BY y, x
RETURN y, collect(heat) AS heat ORDER BY y;
```

```text result title="Resultado"
16 properties set
 y | heat
---+------------------------
 0 | [25.0, 22.6, 6.3, 0.7]
 1 | [22.6, 12.5, 1.7, 0.0]
 2 | [6.3, 1.7, 0.0, 0.0]
 3 | [0.7, 0.0, 0.0, 0.0]
(4 rows)
```

```text run title="Ejemplo"
CALL algo.diffusion({amount: 'heat', steps: 3}) YIELD amount RETURN round(sum(amount), 6) AS total;
```

```text result title="Resultado"
 total
-------
 100.0
(1 row)
```

**Úsalo para:** calor, contaminación, agua o dinero que se reparte por una red; suavizar valores entre vecinos.

## algo.automaton

Cada nodo tiene una propiedad booleana `state`. En cada paso todos los nodos cambian a la vez, según una regla sobre los estados de sus vecinos, hasta que nada cambia o se acaban los `steps`. `changedAt` es el paso en que un nodo cambió por última vez.

**Sintaxis:** `algo.automaton({state: propiedad, rule: 'life' | 'threshold' | 'majority', steps: 10, …})` da `node`, `state`, `changedAt`.

| Regla | Un nodo se enciende… | y se apaga… |
| --- | --- | --- |
| `life` | con una cantidad de vecinos encendidos que está en `birth` (`[3]`) | salvo que la cantidad esté en `survive` (`[2, 3]`) |
| `threshold` | cuando al menos `share` (0,5) de sus vecinos están encendidos | nunca, salvo con `recover: true` (entonces bajo esa proporción) |
| `majority` | cuando la mayoría de sus vecinos están encendidos | cuando la mayoría están apagados |

Una idea se propaga por un grupo de amigos: una persona la adopta cuando al menos la mitad de sus amigos ya lo hizo:

```text run title="Ejemplo"
CREATE (ana:Person {name: 'Ana', adopted: true}), (bruno:Person {name: 'Bruno', adopted: false}),
       (carla:Person {name: 'Carla', adopted: false}), (diego:Person {name: 'Diego', adopted: false}),
       (eva:Person {name: 'Eva', adopted: false}), (fabio:Person {name: 'Fabio', adopted: false}),
       (ana)-[:knows]->(bruno), (ana)-[:knows]->(carla), (bruno)-[:knows]->(carla),
       (carla)-[:knows]->(diego), (diego)-[:knows]->(eva), (diego)-[:knows]->(fabio),
       (eva)-[:knows]->(fabio);
CALL algo.automaton({labels: 'Person', state: 'adopted', rule: 'threshold', share: 0.5}) YIELD node, state, changedAt
RETURN node.name, state, changedAt ORDER BY node.name;
```

```text result title="Resultado"
6 nodes created, 7 edges created
 node.name | state | changedAt
-----------+-------+-----------
 Ana       | true  | null
 Bruno     | true  | 1
 Carla     | true  | 2
 Diego     | false | null
 Eva       | false | null
 Fabio     | false | null
(6 rows)
```

Bruno la adopta en el paso 1: uno de sus dos amigos, Ana, ya la tiene. Carla, con tres amigos, espera al paso 2, cuando ya la tienen Ana y Bruno. Diego tiene solo a Carla de sus tres amigos, nunca la mitad, así que la idea se detiene ahí y Eva y Fabio nunca la adoptan.

**Úsalo para:** adopción y contagio, cascadas de fallas, dinámica de opiniones, autómatas celulares en cuadrículas (`life`).

:::tip Guardar un estado y avanzar de nuevo
`write` guarda un resultado, así que una simulación puede avanzar en los pasos que tú controlas:

```text
CALL algo.diffusion({amount: 'heat', steps: 1, write: 'heat'});
```
:::
