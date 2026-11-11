---
title: WHERE
description: Filtra coincidencias con comparaciones, lógica, listas, pruebas de texto, valores nulos y patrones.
---

# WHERE

`WHERE` conserva las filas cuya condición es **verdadera** y descarta el resto.

## Sintaxis

```text
MATCH patrón
WHERE condición
RETURN …
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

## Comparaciones

`=`, `<>` (o `!=`), `<`, `<=`, `>`, `>=`:

```text run title="Ejemplo"
MATCH (p:Person) WHERE p.age > 30 RETURN p.name, p.age ORDER BY p.age;
```

```text result title="Resultado"
 p.name | p.age
--------+-------
 Ana    | 34
 Diego  | 39
 Carla  | 45
(3 rows)
```

## AND, OR, NOT, XOR

```text run title="Ejemplo"
MATCH (p:Person)
WHERE p.city = 'Quito' OR (p.city = 'Lima' AND p.age < 40)
RETURN p.name, p.city, p.age;
```

```text result title="Resultado"
 p.name | p.city | p.age
--------+--------+-------
 Ana    | Lima   | 34
 Bruno  | Quito  | 28
 Eva    | Quito  | 23
(3 rows)
```

```text run title="Ejemplo"
MATCH (p:Person) WHERE NOT p.city = 'Lima' RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Bruno
 Diego
 Eva
(3 rows)
```

## IN una lista

```text run title="Ejemplo"
MATCH (p:Person) WHERE p.city IN ['Bogotá', 'Quito'] RETURN p.name, p.city;
```

```text result title="Resultado"
 p.name | p.city
--------+--------
 Bruno  | Quito
 Diego  | Bogotá
 Eva    | Quito
(3 rows)
```

## Pruebas de texto

`STARTS WITH`, `ENDS WITH`, `CONTAINS` y `=~` (una expresión regular que debe calzar con todo el texto; `(?i)` ignora mayúsculas):

```text run title="Ejemplo"
MATCH (p:Person)
WHERE p.name STARTS WITH 'C' OR p.name ENDS WITH 'o' OR p.name CONTAINS 'v'
RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Bruno
 Carla
 Diego
 Eva
(4 rows)
```

```text run title="Ejemplo"
MATCH (p:Person) WHERE p.name =~ '(?i)[ae].*' RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Ana
 Eva
(2 rows)
```

## Rangos

```text run title="Ejemplo"
MATCH (p:Person) WHERE 25 <= p.age AND p.age <= 35 RETURN p.name, p.age;
```

```text result title="Resultado"
 p.name | p.age
--------+-------
 Ana    | 34
 Bruno  | 28
(2 rows)
```

## Valores ausentes: IS NULL

Dale un correo a Carla; nadie más tiene uno. `IS NULL` es verdadero cuando falta la propiedad o vale `null`; `IS NOT NULL`, cuando tiene un valor:

```text run title="Ejemplo"
MATCH (c:Person {name: 'Carla'}) SET c.email = 'carla@example.org';
MATCH (p:Person) WHERE p.email IS NOT NULL RETURN p.name, p.email;
MATCH (p:Person) WHERE p.email IS NULL RETURN count(p) AS without_email;
```

```text result title="Resultado"
1 property set
 p.name | p.email
--------+-------------------
 Carla  | carla@example.org
(1 row)
 without_email
---------------
 4
(1 row)
```

:::note Lógica de tres valores
Una comparación con `null` no es ni verdadera ni falsa sino **desconocida**, y `WHERE` conserva solo las filas verdaderas. Por eso `p.email = null` no conserva nada: escribe `p.email IS NULL`.
:::

```text run title="Ejemplo"
MATCH (p:Person) WHERE p.email = null RETURN count(p) AS found;
```

```text result title="Resultado"
 found
-------
 0
(1 row)
```

## Filtrar por aristas

Las condiciones también pueden usar las propiedades de la arista:

```text run title="Ejemplo"
MATCH (p:Person)-[w:works_at]->(c) WHERE w.since >= 2020 RETURN p.name, c.name, w.since;
```

```text result title="Resultado"
 p.name | c.name | w.since
--------+--------+---------
 Bruno  | Orbit  | 2022
 Diego  | Orbit  | 2020
(2 rows)
```

## Patrones como condiciones

Un patrón en `WHERE` pregunta si calza a partir de la fila. Personas que conocen a alguien, y personas a quienes nadie conoce:

```text run title="Ejemplo"
MATCH (p:Person) WHERE (p)-[:knows]->() RETURN p.name ORDER BY p.name;
```

```text result title="Resultado"
 p.name
--------
 Ana
 Bruno
 Carla
 Diego
(4 rows)
```

```text run title="Ejemplo"
MATCH (p:Person) WHERE NOT (p)<-[:knows]-() RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Ana
(1 row)
```

`EXISTS { … }` acepta un `MATCH` completo con su propio `WHERE`: personas que conocen a alguien mayor de 40:

```text run title="Ejemplo"
MATCH (p:Person)
WHERE EXISTS { MATCH (p)-[:knows]->(f) WHERE f.age > 40 }
RETURN p.name;
```

```text result title="Resultado"
 p.name
--------
 Ana
(1 row)
```

## Pruebas de etiqueta

`n:Etiqueta` es verdadero cuando el nodo tiene la etiqueta:

```text run title="Ejemplo"
MATCH (n) WHERE n:Company RETURN n.name;
```

```text result title="Resultado"
 n.name
--------
 Acme
 Orbit
(2 rows)
```
