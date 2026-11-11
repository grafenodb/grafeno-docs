---
title: RETURN
description: Elige las columnas de un resultado, nómbralas, quita duplicados, ordena y pagina las filas.
---

# RETURN

`RETURN` dice qué contiene cada fila del resultado. También ordena, quita duplicados y limita cuántas filas vuelven.

## Sintaxis

```text
RETURN [DISTINCT] expresión [AS nombre], …
[ORDER BY expresión [ASC | DESC], …]
[SKIP n]
[LIMIT n]
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

## Propiedades y expresiones

Una columna puede ser cualquier expresión. Su nombre es la expresión tal como se escribió:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'}) RETURN p.name, p.age, p.age + 10, upper(p.city);
```

```text result title="Resultado"
 p.name | p.age | p.age + 10 | upper(p.city)
--------+-------+------------+---------------
 Ana    | 34    | 44         | LIMA
(1 row)
```

## AS: nombrar las columnas

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'}) RETURN p.name AS person, p.age + 10 AS age_in_ten_years;
```

```text result title="Resultado"
 person | age_in_ten_years
--------+------------------
 Ana    | 44
(1 row)
```

## Nodos completos

Devolver una variable devuelve el nodo. La consola lo dibuja como `(nombre:Etiqueta)`; por HTTP es un objeto JSON con su id, etiquetas y propiedades:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'})-[r:works_at]->(c) RETURN p, r, c;
```

```text result title="Resultado"
 p            | r           | c
--------------+-------------+----------------
 (Ana:Person) | [:works_at] | (Acme:Company)
(1 row)
```

## DISTINCT

Las ciudades, cada una una vez:

```text run title="Ejemplo"
MATCH (p:Person) RETURN DISTINCT p.city ORDER BY p.city;
```

```text result title="Resultado"
 p.city
--------
 Bogotá
 Lima
 Quito
(3 rows)
```

## ORDER BY

Ascendente por defecto; `DESC` invierte. Varias claves ordenan por turno:

```text run title="Ejemplo"
MATCH (p:Person) RETURN p.city, p.name, p.age ORDER BY p.city, p.age DESC;
```

```text result title="Resultado"
 p.city | p.name | p.age
--------+--------+-------
 Bogotá | Diego  | 39
 Lima   | Carla  | 45
 Lima   | Ana    | 34
 Quito  | Bruno  | 28
 Quito  | Eva    | 23
(5 rows)
```

`null` va al final, ascendente o descendente.

## SKIP y LIMIT

`LIMIT` conserva las primeras filas; `SKIP` se salta algunas antes. Juntos paginan: aquí la segunda página de dos filas, por edad:

```text run title="Ejemplo"
MATCH (p:Person) RETURN p.name, p.age ORDER BY p.age SKIP 2 LIMIT 2;
```

```text result title="Resultado"
 p.name | p.age
--------+-------
 Ana    | 34
 Diego  | 39
(2 rows)
```

## RETURN sin MATCH

`RETURN` solo evalúa expresiones, útil para probar funciones:

```text run title="Ejemplo"
RETURN 2 + 3 AS sum, 'graph' + 's' AS text, [1, 2, 3] AS list, {a: 1} AS map;
```

```text result title="Resultado"
 sum | text   | list      | map
-----+--------+-----------+---------
 5   | graphs | [1, 2, 3] | {"a":1}
(1 row)
```

## RETURN *

Todas las variables de la fila:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Eva'}) RETURN *;
```

```text result title="Resultado"
 p
--------------
 (Eva:Person)
(1 row)
```
