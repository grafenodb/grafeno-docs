---
title: WITH
description: Encadena los pasos de una consulta, filtra agregaciones y limita filas a mitad de una consulta.
---

# WITH

`WITH` es un `RETURN` a mitad de la consulta. Pasa filas a la cláusula siguiente, y solo los nombres que lista siguen disponibles. Con él puedes filtrar una agregación, ordenar y limitar antes de seguir, o calcular un valor una vez y reutilizarlo.

## Sintaxis

```text
MATCH …
WITH expresión [AS nombre], …  [ORDER BY …] [SKIP n] [LIMIT n]
[WHERE condición]
MATCH … | RETURN …
```

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

## Filtrar una agregación

Cuenta los amigos de cada persona y conserva a quienes tienen más de uno (SQL lo llama `HAVING`):

```text run title="Ejemplo"
MATCH (p:Person)-[:knows]->(f)
WITH p, count(f) AS friends
WHERE friends > 1
RETURN p.name, friends;
```

```text result title="Resultado"
 p.name | friends
--------+---------
 Ana    | 2
(1 row)
```

## Ordenar y limitar, y seguir

Las dos personas mayores, y luego dónde trabajan:

```text run title="Ejemplo"
MATCH (p:Person)
WITH p ORDER BY p.age DESC LIMIT 2
MATCH (p)-[:works_at]->(c)
RETURN p.name, p.age, c.name;
```

```text result title="Resultado"
 p.name | p.age | c.name
--------+-------+--------
 Carla  | 45    | Acme
 Diego  | 39    | Orbit
(2 rows)
```

## Calcular una vez, usar después

```text run title="Ejemplo"
MATCH (p:Person)
WITH avg(p.age) AS average
MATCH (q:Person) WHERE q.age > average
RETURN q.name, q.age, round(average, 1) AS average;
```

```text result title="Resultado"
 q.name | q.age | average
--------+-------+---------
 Ana    | 34    | 33.8
 Carla  | 45    | 33.8
 Diego  | 39    | 33.8
(3 rows)
```

## Agregación de agregaciones

El promedio de amigos, contando a quienes no tienen ninguno (`OPTIONAL MATCH`):

```text run title="Ejemplo"
MATCH (p:Person)
OPTIONAL MATCH (p)-[:knows]->(f)
WITH p, count(f) AS friends
RETURN avg(friends) AS average_friends, max(friends) AS most;
```

```text result title="Resultado"
 average_friends | most
-----------------+------
 1.0             | 2
(1 row)
```

## Solo quedan los nombres listados

Después de `WITH`, una variable que no se listó desaparece, así que esta consulta falla:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'})-[:works_at]->(c)
WITH c
RETURN p.name;
```

```text result title="Resultado"
error: unknown variable `p`
```

`WITH *` conserva todas las variables, y puede agregar nuevas:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'})-[:works_at]->(c)
WITH *, c.name AS company
RETURN p.name, company;
```

```text result title="Resultado"
 p.name | company
--------+---------
 Ana    | Acme
(1 row)
```

:::tip Bueno saber
Las expresiones de `WITH` que no son variables simples necesitan un nombre: `WITH p.age * 2 AS double`.
:::
