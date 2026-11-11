---
title: Simulation
description: Model places, agents and spreading with distance fields, influence maps, flood fill, diffusion and cellular automata on any graph.
---

# Simulation

A graph is a map: rooms joined by doors, towns by roads, people by friendships. These algorithms simulate what happens on such a map: how far everything is from the nearest goal, whose influence reaches where, which region is reachable, how a quantity spreads, and how states change by local rules.

| Algorithm | Simulates |
| --- | --- |
| `algo.distanceField(sources)` | the cost from every node to its nearest source, and which source that is |
| `algo.influence(sources)` | each source's value fading with cost, combined where sources meet |
| `algo.floodFill(seeds)` | the region reachable from the seeds through allowed nodes |
| `algo.diffusion()` | an amount spreading to neighbors step by step, total kept |
| `algo.automaton()` | every node's on/off state changing at once by a rule of its neighbors |

## The example data

A map of 4 × 4 rooms. Each room opens to the rooms beside it; crossing into or out of a flooded room costs 3 instead of 1:

```text
   x: 0     1     2     3
y=0  .     .     .     .
y=1  .     ~     ~     .
y=2  .     ~     .     .
y=3  .     .     .     .      ~ = water
```

```text run title="Example"
UNWIND range(0, 3) AS y
UNWIND range(0, 3) AS x
CREATE (:Room {x: x, y: y, floor: CASE WHEN [x, y] IN [[1, 1], [2, 1], [1, 2]] THEN 'water' ELSE 'stone' END});
MATCH (a:Room), (b:Room)
WHERE (b.x = a.x + 1 AND b.y = a.y) OR (b.y = a.y + 1 AND b.x = a.x)
CREATE (a)-[:door {cost: CASE WHEN a.floor = 'water' OR b.floor = 'water' THEN 3 ELSE 1 END}]->(b);
```

```text result title="Result"
16 nodes created
24 edges created
```

The results are shown as maps: one row per `y`, the rooms from `x` 0 to 3.

## algo.distanceField

From every node, the cost to the **nearest** source and which source it is, in one search from all sources at once. An agent anywhere reaches its nearest goal by stepping to the neighbor with the lowest cost.

**Syntax:** `algo.distanceField(sources, {weight, maxCost, direction: 'both', …})` yields `node`, `cost`, `nearest`.

Two exits, in opposite corners:

```text run title="Example"
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
CALL algo.distanceField([a, b], {weight: 'cost'}) YIELD node, cost
WITH node.y AS y, node.x AS x, cost ORDER BY y, x
RETURN y, collect(toInteger(cost)) AS cost_to_nearest_exit ORDER BY y;
```

```text result title="Result"
 y | cost_to_nearest_exit
---+----------------------
 0 | [0, 1, 2, 3]
 1 | [1, 4, 5, 2]
 2 | [2, 5, 2, 1]
 3 | [3, 2, 1, 0]
(4 rows)
```

Which exit each room should head to:

```text run title="Example"
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
CALL algo.distanceField([a, b], {weight: 'cost'}) YIELD node, nearest
WITH node.y AS y, node.x AS x, CASE nearest.x WHEN 0 THEN 'A' ELSE 'B' END AS exit ORDER BY y, x
RETURN y, collect(exit) AS nearest_exit ORDER BY y;
```

```text result title="Result"
 y | nearest_exit
---+--------------
 0 | [A, A, A, A]
 1 | [A, A, A, B]
 2 | [A, A, B, B]
 3 | [A, B, B, B]
(4 rows)
```

**Use it for:** evacuation and pathfinding for many agents at once, the nearest hospital or store to every address, flow fields in games.

## algo.influence

Each source spreads its value (its property `value`, or 1), multiplied by `decay` for each unit of cost along the cheapest way, until it falls below `threshold` or passes `maxCost`. Where several sources reach, their influence adds up (`combine: 'sum'`) or the strongest wins (`'max'`).

**Syntax:** `algo.influence(sources, {value: property, decay: 0.5, threshold: 0.01, maxCost, combine: 'sum', weight, …})` yields `node`, `influence`.

Two radio towers, a strong one and a weak one:

```text run title="Example"
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
SET a.value = 8, b.value = 2;
MATCH (a:Room {x: 0, y: 0}), (b:Room {x: 3, y: 3})
CALL algo.influence([a, b], {weight: 'cost', value: 'value'}) YIELD node, influence
WITH node.y AS y, node.x AS x, round(influence, 2) AS signal ORDER BY y, x
RETURN y, collect(signal) AS signal ORDER BY y;
```

```text result title="Result"
2 properties set
 y | signal
---+--------------------------
 0 | [8.03, 4.06, 2.13, 1.25]
 1 | [4.06, 0.5, 0.31, 1.0]
 2 | [2.13, 0.31, 0.63, 1.25]
 3 | [1.25, 1.0, 1.25, 2.13]
(4 rows)
```

**Use it for:** territory and control maps, coverage of antennas or stores, how strongly a rumor or a brand reaches each place.

## algo.floodFill

The region reachable from the seeds, stepping only into nodes whose properties match `where` (and labels in `inside`), with the number of steps to each.

**Syntax:** `algo.floodFill(seeds, {where: {property: value}, inside: [labels], direction: 'both', …})` yields `node`, `steps`.

Where can someone in room (0, 3) walk while staying dry?

```text run title="Example"
MATCH (s:Room {x: 0, y: 3})
CALL algo.floodFill(s, {where: {floor: 'stone'}}) YIELD node, steps
RETURN count(node) AS dry_rooms_reached, max(steps) AS farthest;
```

```text result title="Result"
 dry_rooms_reached | farthest
-------------------+----------
 13                | 6
(1 row)
```

```text run title="Example"
MATCH (s:Room {x: 0, y: 3})
CALL algo.floodFill(s, {where: {floor: 'stone'}}) YIELD node, steps
WITH collect(node) AS reached, collect(steps) AS counts
MATCH (r:Room)
WITH r, [i IN range(0, size(reached) - 1) WHERE reached[i] = r | counts[i]] AS found
WITH r.y AS y, r.x AS x, CASE WHEN size(found) = 0 THEN '#' ELSE toString(found[0]) END AS cell ORDER BY y, x
RETURN y, collect(cell) AS steps ORDER BY y;
```

```text result title="Result"
 y | steps
---+--------------
 0 | [3, 4, 5, 6]
 1 | [2, #, #, 5]
 2 | [1, #, 3, 4]
 3 | [0, 1, 2, 3]
(4 rows)
```

`#` marks rooms the dry walk cannot reach. The flooded rooms block the way, so it goes around them.

**Use it for:** reachable areas, the region a fire or a flood can take, painting zones of a map, connected areas of one kind.

## algo.diffusion

Each node holds an `amount` (a property). At every step, `rate` of each node's amount leaves it, split among its neighbors by edge weight. A node holds at most its `capacity` property, if any; what does not fit stays. The total never changes.

**Syntax:** `algo.diffusion({amount: property, rate: 0.5, steps: 10, capacity: property, weight, …})` yields `node`, `amount`.

Heat poured into one corner room spreads for three steps:

```text run title="Example"
MATCH (r:Room) SET r.heat = CASE WHEN r.x = 0 AND r.y = 0 THEN 100.0 ELSE 0.0 END;
CALL algo.diffusion({amount: 'heat', steps: 3}) YIELD node, amount
WITH node.y AS y, node.x AS x, round(amount, 1) AS heat ORDER BY y, x
RETURN y, collect(heat) AS heat ORDER BY y;
```

```text result title="Result"
16 properties set
 y | heat
---+------------------------
 0 | [25.0, 22.6, 6.3, 0.7]
 1 | [22.6, 12.5, 1.7, 0.0]
 2 | [6.3, 1.7, 0.0, 0.0]
 3 | [0.7, 0.0, 0.0, 0.0]
(4 rows)
```

```text run title="Example"
CALL algo.diffusion({amount: 'heat', steps: 3}) YIELD amount RETURN round(sum(amount), 6) AS total;
```

```text result title="Result"
 total
-------
 100.0
(1 row)
```

**Use it for:** heat, pollution, water or money spreading over a network; smoothing values over neighbors.

## algo.automaton

Every node has a boolean `state` property. At each step all nodes change at once, by a rule on their neighbors' states, until nothing changes or `steps` runs out. `changedAt` is the step when a node last changed.

**Syntax:** `algo.automaton({state: property, rule: 'life' | 'threshold' | 'majority', steps: 10, …})` yields `node`, `state`, `changedAt`.

| Rule | A node turns on… | and off… |
| --- | --- | --- |
| `life` | with a count of on-neighbors in `birth` (`[3]`) | unless the count is in `survive` (`[2, 3]`) |
| `threshold` | when at least `share` (0.5) of its neighbors are on | never, unless `recover: true` (then below the share) |
| `majority` | when most neighbors are on | when most are off |

An idea spreads through a group of friends: a person adopts it when at least half of their friends have:

```text run title="Example"
CREATE (ana:Person {name: 'Ana', adopted: true}), (bruno:Person {name: 'Bruno', adopted: false}),
       (carla:Person {name: 'Carla', adopted: false}), (diego:Person {name: 'Diego', adopted: false}),
       (eva:Person {name: 'Eva', adopted: false}), (fabio:Person {name: 'Fabio', adopted: false}),
       (ana)-[:knows]->(bruno), (ana)-[:knows]->(carla), (bruno)-[:knows]->(carla),
       (carla)-[:knows]->(diego), (diego)-[:knows]->(eva), (diego)-[:knows]->(fabio),
       (eva)-[:knows]->(fabio);
CALL algo.automaton({labels: 'Person', state: 'adopted', rule: 'threshold', share: 0.5}) YIELD node, state, changedAt
RETURN node.name, state, changedAt ORDER BY node.name;
```

```text result title="Result"
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

Bruno adopts at step 1: one of his two friends, Ana, already has. Carla, with three friends, waits until step 2, when Ana and Bruno both have. Diego has only Carla of his three friends on board, never half, so the idea stops there and Eva and Fabio never adopt it.

**Use it for:** adoption and contagion, cascades of failures, opinion dynamics, cellular automata on grids (`life`).

:::tip Store a state and step again
`write` stores a result, so a simulation can advance in steps you control:

```text
CALL algo.diffusion({amount: 'heat', steps: 1, write: 'heat'});
```
:::
