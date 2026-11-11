---
title: UNION y subconsultas
description: Une los resultados de varias consultas con UNION, ejecuta una consulta por fila con CALL { }, y cuenta o prueba patrones con COUNT { } y EXISTS { }.
---

# UNION y subconsultas

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

## UNION

`UNION` pone las filas de varias consultas una tras otra. Cada consulta debe devolver los mismos nombres de columna. Las filas duplicadas se quitan:

```text run title="Ejemplo"
MATCH (p:Person) RETURN p.name AS name, 'person' AS kind
UNION
MATCH (c:Company) RETURN c.name AS name, 'company' AS kind;
```

```text result title="Resultado"
 name  | kind
-------+---------
 Ana   | person
 Bruno | person
 Carla | person
 Diego | person
 Eva   | person
 Acme  | company
 Orbit | company
(7 rows)
```

## UNION ALL

`UNION ALL` conserva los duplicados. Las ciudades de las personas menores de 30 y luego las de las mayores de 40, con repeticiones:

```text run title="Ejemplo"
MATCH (p:Person) WHERE p.age < 30 RETURN p.city AS city
UNION ALL
MATCH (p:Person) WHERE p.age > 40 RETURN p.city AS city;
```

```text result title="Resultado"
 city
-------
 Quito
 Quito
 Lima
(3 rows)
```

## `CALL { … }`: una subconsulta por fila

Las cláusulas entre llaves se ejecutan una vez por cada fila y ven sus variables (se traen con `WITH`). Lo que da su `RETURN` se agrega a la fila:

```text run title="Ejemplo"
MATCH (p:Person)
CALL { WITH p MATCH (p)-[:knows]->(f) RETURN count(f) AS friends }
RETURN p.name, friends
ORDER BY friends DESC, p.name;
```

```text result title="Resultado"
 p.name | friends
--------+---------
 Ana    | 2
 Bruno  | 1
 Carla  | 1
 Diego  | 1
 Eva    | 0
(5 rows)
```

Una subconsulta puede ordenar y limitar por su cuenta, por fila: el empleado más antiguo de cada empresa:

```text run title="Ejemplo"
MATCH (c:Company)
CALL {
  WITH c
  MATCH (p:Person)-[w:works_at]->(c)
  RETURN p.name AS senior ORDER BY w.since LIMIT 1
}
RETURN c.name, senior;
```

```text result title="Resultado"
 c.name | senior
--------+--------
 Acme   | Carla
 Orbit  | Diego
(2 rows)
```

## `COUNT { … }`

Cuenta las coincidencias de un patrón desde la fila, sin cambiar las filas:

```text run title="Ejemplo"
MATCH (p:Person)
RETURN p.name, COUNT { (p)-[:knows]->() } AS knows, COUNT { (p)<-[:knows]-() } AS known_by
ORDER BY p.name;
```

```text result title="Resultado"
 p.name | knows | known_by
--------+-------+----------
 Ana    | 2     | 0
 Bruno  | 1     | 1
 Carla  | 1     | 1
 Diego  | 1     | 2
 Eva    | 0     | 1
(5 rows)
```

## `EXISTS { … }`

Verdadero cuando el patrón calza al menos una vez. Puede contener un `MATCH` con un `WHERE`:

```text run title="Ejemplo"
MATCH (c:Company)
RETURN c.name, EXISTS { MATCH (p:Person)-[:works_at]->(c) WHERE p.age > 40 } AS has_someone_over_40;
```

```text result title="Resultado"
 c.name | has_someone_over_40
--------+---------------------
 Acme   | true
 Orbit  | false
(2 rows)
```

## Comprensión de patrones

Una lista construida desde un patrón, en línea: cada persona y los nombres de quienes conoce:

```text run title="Ejemplo"
MATCH (p:Person)
RETURN p.name, [(p)-[:knows]->(f) | f.name] AS knows
ORDER BY p.name;
```

```text result title="Resultado"
 p.name | knows
--------+----------------
 Ana    | [Bruno, Carla]
 Bruno  | [Diego]
 Carla  | [Diego]
 Diego  | [Eva]
 Eva    | []
(5 rows)
```

:::tip Bueno saber
- Un nombre devuelto por una subconsulta no puede existir ya afuera.
- Una sentencia completa, subconsultas incluidas, es una transacción.
:::
