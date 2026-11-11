---
title: Agregación
description: Cuenta, suma, promedia, junta y describe grupos de filas con count, sum, avg, collect, median, stdev y percentiles.
---

# Agregación

Las funciones de agregación convierten muchas filas en un valor: cuántas, el total, el promedio. Las columnas de `RETURN` que **no** son agregaciones deciden los **grupos**.

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (ana:Person {name: 'Ana', age: 34, city: 'Lima'}),
       (bruno:Person {name: 'Bruno', age: 28, city: 'Quito'}),
       (carla:Person {name: 'Carla', age: 45, city: 'Lima'}),
       (diego:Person {name: 'Diego', age: 39, city: 'Bogotá'}),
       (eva:Person {name: 'Eva', age: 23, city: 'Quito'}),
       (acme:Company {name: 'Acme', sector: 'robotics'}),
       (orbit:Company {name: 'Orbit', sector: 'software'}),
       (ana)-[:works_at {since: 2019}]->(acme),
       (carla)-[:works_at {since: 2015}]->(acme),
       (bruno)-[:works_at {since: 2022}]->(orbit),
       (diego)-[:works_at {since: 2020}]->(orbit),
       (ana)-[:knows]->(bruno), (ana)-[:knows]->(carla),
       (bruno)-[:knows]->(diego), (carla)-[:knows]->(diego),
       (diego)-[:knows]->(eva);
```

```text result title="Resultado"
7 nodes created, 9 edges created
```

## count

`count(*)` cuenta filas; `count(x)` cuenta las filas donde `x` no es `null`:

```text run title="Ejemplo"
MATCH (p:Person) RETURN count(*) AS people;
```

```text result title="Resultado"
 people
--------
 5
(1 row)
```

## Grupos

Aquí `p.city` no es una agregación, así que hay una fila por ciudad:

```text run title="Ejemplo"
MATCH (p:Person) RETURN p.city, count(*) AS people ORDER BY people DESC, p.city;
```

```text result title="Resultado"
 p.city | people
--------+--------
 Lima   | 2
 Quito  | 2
 Bogotá | 1
(3 rows)
```

## sum, avg, min, max

```text run title="Ejemplo"
MATCH (p:Person)
RETURN sum(p.age) AS total, avg(p.age) AS average, min(p.age) AS youngest, max(p.age) AS oldest;
```

```text result title="Resultado"
 total | average | youngest | oldest
-------+---------+----------+--------
 169   | 33.8    | 23       | 45
(1 row)
```

## collect

`collect` junta valores en una lista, una por grupo:

```text run title="Ejemplo"
MATCH (p:Person)-[:works_at]->(c:Company)
RETURN c.name, collect(p.name) AS staff, count(p) AS size
ORDER BY c.name;
```

```text result title="Resultado"
 c.name | staff          | size
--------+----------------+------
 Acme   | [Ana, Carla]   | 2
 Orbit  | [Bruno, Diego] | 2
(2 rows)
```

## DISTINCT dentro de una agregación

Cuenta cada valor una vez:

```text run title="Ejemplo"
MATCH (p:Person) RETURN count(p.city) AS cities_with_repeats, count(DISTINCT p.city) AS cities;
```

```text result title="Resultado"
 cities_with_repeats | cities
---------------------+--------
 5                   | 3
(1 row)
```

## Estadística

| Función | Da |
| --- | --- |
| `median(x)` | el valor del medio |
| `stdev(x)`, `stdevp(x)` | desviación estándar de una muestra, de una población |
| `variance(x)`, `variancep(x)` | varianza de una muestra, de una población |
| `percentileCont(x, p)` | el percentil `p` (de 0 a 1), interpolado |
| `percentileDisc(x, p)` | el percentil `p`, uno de los valores |
| `mode(x)` | el valor más frecuente |

```text run title="Ejemplo"
MATCH (p:Person)
RETURN median(p.age) AS median, round(stdev(p.age), 2) AS stdev,
       percentileCont(p.age, 0.9) AS p90, percentileDisc(p.age, 0.5) AS p50,
       mode(p.city) AS most_common_city;
```

```text result title="Resultado"
 median | stdev | p90  | p50 | most_common_city
--------+-------+------+-----+------------------
 34.0   | 8.7   | 42.6 | 34  | Lima
(1 row)
```

## Agregar sobre nada

Sin filas, `count` da 0 y las demás dan `null`. Con columnas de grupo, simplemente no hay grupos:

```text run title="Ejemplo"
MATCH (p:Person) WHERE p.age > 100 RETURN count(p) AS old, avg(p.age) AS average;
```

```text result title="Resultado"
 old | average
-----+---------
 0   | null
(1 row)
```

:::tip Bueno saber
- Todas las agregaciones saltan los valores `null`.
- Para filtrar por una agregación (el `HAVING` de SQL), agrega en un [WITH](with.md) y pon `WHERE` después.
- Las agregaciones dan lo mismo en cualquier orden de filas, así que una consulta repartida en un clúster da lo mismo que un solo servidor.
:::
