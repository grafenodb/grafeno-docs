---
title: Textos
description: Une, corta, busca, reemplaza, cambia mayúsculas y convierte texto con las funciones de texto de GQ.
---

# Textos

Los textos se escriben entre comillas simples o dobles. `+` los une, y las funciones los cambian y los desarman.

## Unir

```text run title="Ejemplo"
RETURN 'graph' + ' ' + 'memory' AS joined, 'n = ' + toString(42) AS with_number;
```

```text result title="Resultado"
 joined       | with_number
--------------+-------------
 graph memory | n = 42
(1 row)
```

## Mayúsculas y espacios

```text run title="Ejemplo"
RETURN upper('Lima') AS upper, lower('LIMA') AS lower,
       trim('  both  ') AS trim, ltrim('  left') AS ltrim, rtrim('right  ') AS rtrim;
```

```text result title="Resultado"
 upper | lower | trim | ltrim | rtrim
-------+-------+------+-------+-------
 LIMA  | lima  | both | left  | right
(1 row)
```

## Largo y partes

`substring(s, inicio, largo)` cuenta desde 0. `left` y `right` toman caracteres de cada extremo:

```text run title="Ejemplo"
RETURN size('Grafeno') AS size, substring('Grafeno', 0, 4) AS first4,
       substring('Grafeno', 4) AS rest, left('Grafeno', 3) AS left3, right('Grafeno', 3) AS right3;
```

```text result title="Resultado"
 size | first4 | rest | left3 | right3
------+--------+------+-------+--------
 7    | Graf   | eno  | Gra   | eno
(1 row)
```

## Reemplazar, dividir, invertir

```text run title="Ejemplo"
RETURN replace('a-b-c', '-', '/') AS replaced, split('a,b,c', ',') AS parts, reverse('abc') AS reversed;
```

```text result title="Resultado"
 replaced | parts     | reversed
----------+-----------+----------
 a/b/c    | [a, b, c] | cba
(1 row)
```

## Buscar dentro del texto

En condiciones, `STARTS WITH`, `ENDS WITH`, `CONTAINS` y `=~` (una expresión regular sobre todo el texto):

```text run title="Ejemplo"
RETURN 'Grafeno' STARTS WITH 'Gra' AS starts, 'Grafeno' CONTAINS 'fen' AS contains,
       'Grafeno' =~ 'G.*o' AS regex, 'GRAFENO' =~ '(?i)grafeno' AS ignoring_case;
```

```text result title="Resultado"
 starts | contains | regex | ignoring_case
--------+----------+-------+---------------
 true   | true     | true  | true
(1 row)
```

## Convertir

| Función | Da |
| --- | --- |
| `toString(x)` | el texto de un número, booleano o fecha |
| `toInteger(s)`, `toFloat(s)`, `toBoolean(s)` | un número o booleano desde texto (un error si no lo es) |
| `toIntegerOrNull(s)`, `toFloatOrNull(s)`, … | lo mismo, o `null` en vez de un error |

```text run title="Ejemplo"
RETURN toInteger('42') + 1 AS int, toFloat('2.5') * 2 AS float,
       toBoolean('true') AS bool, toIntegerOrNull('forty') AS not_a_number;
```

```text result title="Resultado"
 int | float | bool | not_a_number
-----+-------+------+--------------
 43  | 5.0   | true | null
(1 row)
```

## Úsalas con tus datos

```text run title="Ejemplo"
CREATE (:Person {first: 'ana', last: 'TORRES'}), (:Person {first: 'bruno', last: 'rivera'});
MATCH (p:Person)
RETURN upper(left(p.first, 1)) + substring(p.first, 1) + ' ' +
       upper(left(p.last, 1)) + lower(substring(p.last, 1)) AS full_name
ORDER BY full_name;
```

```text result title="Resultado"
2 nodes created
 full_name
--------------
 Ana Torres
 Bruno Rivera
(2 rows)
```

:::tip ¿Qué tan parecidos son dos textos?
Funciones como `text.levenshtein` y `text.similarity` miden qué tan cerca están dos textos, para errores de tipeo y duplicados. Están en la página [Texto parecido](similar-text.md).
:::
