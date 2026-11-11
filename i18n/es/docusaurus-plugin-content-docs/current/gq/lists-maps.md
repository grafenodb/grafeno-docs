---
title: Listas y mapas
description: Construye, indexa, corta y transforma listas, usa comprensiones de lista y reduce, y trabaja con mapas y proyecciones de mapa.
---

# Listas y mapas

Una **lista** es una secuencia ordenada entre corchetes: `[1, 2, 3]`. Un **mapa** es un conjunto de claves y valores entre llaves: `{name: 'Ana', age: 34}`. Ambos pueden ser valores de propiedades, y ambos pueden anidarse.

## Listas

```text run title="Ejemplo"
RETURN [1, 2, 3] AS list, size([1, 2, 3]) AS size, range(1, 5) AS one_to_five, range(0, 10, 5) AS step_5;
```

```text result title="Resultado"
 list      | size | one_to_five     | step_5
-----------+------+-----------------+------------
 [1, 2, 3] | 3    | [1, 2, 3, 4, 5] | [0, 5, 10]
(1 row)
```

## Índices y tramos

Los índices empiezan en 0; los negativos cuentan desde el final. `[desde..hasta]` toma un tramo (el final no se incluye):

```text run title="Ejemplo"
WITH ['a', 'b', 'c', 'd', 'e'] AS l
RETURN l[0] AS first, l[-1] AS last, l[1..3] AS middle, l[..2] AS start, l[3..] AS rest;
```

```text result title="Resultado"
 first | last | middle | start  | rest
-------+------+--------+--------+--------
 a     | e    | [b, c] | [a, b] | [d, e]
(1 row)
```

## Funciones de listas

```text run title="Ejemplo"
WITH [3, 1, 2] AS l
RETURN head(l) AS head, last(l) AS last, tail(l) AS tail, reverse(l) AS reversed,
       l + [4] AS appended, 2 IN l AS has_two, isEmpty([]) AS empty;
```

```text result title="Resultado"
 head | last | tail   | reversed  | appended     | has_two | empty
------+------+--------+-----------+--------------+---------+-------
 3    | 2    | [1, 2] | [2, 1, 3] | [3, 1, 2, 4] | true    | true
(1 row)
```

## Comprensión de listas

`[x IN lista WHERE condición | expresión]` filtra y transforma de una vez:

```text run title="Ejemplo"
RETURN [x IN range(1, 10) WHERE x % 2 = 0 | x * x] AS even_squares,
       [x IN ['a', 'b'] | upper(x)] AS upper;
```

```text result title="Resultado"
 even_squares         | upper
----------------------+--------
 [4, 16, 36, 64, 100] | [A, B]
(1 row)
```

## Cuantificadores

`all`, `any`, `none` y `single` prueban los elementos de una lista:

```text run title="Ejemplo"
WITH [45, 60, 72] AS scores
RETURN all(s IN scores WHERE s > 40) AS all_pass, any(s IN scores WHERE s > 70) AS any_high,
       none(s IN scores WHERE s > 90) AS none_top, single(s IN scores WHERE s > 70) AS one_high;
```

```text result title="Resultado"
 all_pass | any_high | none_top | one_high
----------+----------+----------+----------
 true     | true     | true     | true
(1 row)
```

## reduce

`reduce` recorre una lista llevando un valor, aquí una suma y un texto unido:

```text run title="Ejemplo"
RETURN reduce(total = 0, x IN [1, 2, 3, 4] | total + x) AS sum,
       reduce(s = '', w IN ['graph', 'memory'] | s + w + ' ') AS joined;
```

```text result title="Resultado"
 sum | joined
-----+---------------
 10  | graph memory
(1 row)
```

## Mapas

Lee una clave con `.clave`; `keys` las lista:

```text run title="Ejemplo"
WITH {name: 'Ana', langs: ['es', 'en'], address: {city: 'Lima'}} AS m
RETURN m.name, m.langs[1], m.address.city, keys(m) AS keys;
```

```text result title="Resultado"
 m.name | m.langs[1] | m.address.city | keys
--------+------------+----------------+------------------------
 Ana    | en         | Lima           | [address, langs, name]
(1 row)
```

## Proyección de mapa

`nodo {.clave, …}` arma un mapa con propiedades de un nodo, con las claves extra que quieras. `{.*}` las toma todas:

```text run title="Ejemplo"
CREATE (:Person {name: 'Ana', age: 34, city: 'Lima'});
MATCH (p:Person {name: 'Ana'})
RETURN p {.name, .city, decade: p.age / 10 * 10} AS card, p {.*} AS all;
```

```text result title="Resultado"
1 node created
 card                                     | all
------------------------------------------+---------------------------------------
 {"city":"Lima","decade":30,"name":"Ana"} | {"age":34,"city":"Lima","name":"Ana"}
(1 row)
```

## Listas como valores de propiedades

Las listas se guardan en propiedades y se buscan con `IN` o `UNWIND`:

```text run title="Ejemplo"
CREATE (:Book {title: 'Graphs', tags: ['math', 'cs']}), (:Book {title: 'Poems', tags: ['art']});
MATCH (b:Book) WHERE 'cs' IN b.tags RETURN b.title;
```

```text result title="Resultado"
2 nodes created
 b.title
---------
 Graphs
(1 row)
```
