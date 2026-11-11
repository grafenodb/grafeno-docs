---
title: Números
description: Aritmética, división entera y decimal, redondeo, potencias, logaritmos, trigonometría y números al azar en GQ.
---

# Números

GQ tiene enteros (de 64 bits) y decimales. La aritmética funciona como esperas, con una regla para recordar: **dividir dos enteros da un entero**.

## Aritmética

| Operador | Significa |
| --- | --- |
| `+`, `-`, `*` | sumar, restar, multiplicar |
| `/` | dividir (dos enteros dan un entero) |
| `%` | resto |
| `^` | potencia (siempre decimal) |

```text run title="Ejemplo"
RETURN 7 + 2 AS add, 7 - 2 AS sub, 7 * 2 AS mul, 7 / 2 AS int_div,
       7.0 / 2 AS float_div, 7 % 2 AS remainder, 2 ^ 10 AS power;
```

```text result title="Resultado"
 add | sub | mul | int_div | float_div | remainder | power
-----+-----+-----+---------+-----------+-----------+--------
 9   | 5   | 14  | 3       | 3.5       | 1         | 1024.0
(1 row)
```

## Redondeo

`round(x, dígitos)` redondea la mitad alejándose del cero; `floor` y `ceil` van hacia abajo y hacia arriba:

```text run title="Ejemplo"
RETURN round(3.14159, 2) AS round2, round(2.5) AS round, floor(2.7) AS floor,
       ceil(2.1) AS ceil, abs(-4) AS abs, sign(-4) AS sign;
```

```text result title="Resultado"
 round2 | round | floor | ceil | abs | sign
--------+-------+-------+------+-----+------
 3.14   | 3.0   | 2.0   | 3.0  | 4   | -1
(1 row)
```

## Raíces, potencias y logaritmos

```text run title="Ejemplo"
RETURN sqrt(16) AS sqrt, exp(1) AS e_to_1, log(e()) AS ln_e, log10(1000) AS log10;
```

```text result title="Resultado"
 sqrt | e_to_1            | ln_e | log10
------+-------------------+------+-------
 4.0  | 2.718281828459045 | 1.0  | 3.0
(1 row)
```

## Trigonometría

Los ángulos van en radianes; `degrees` y `radians` convierten:

```text run title="Ejemplo"
RETURN round(sin(pi() / 2), 3) AS sin, round(cos(0), 3) AS cos,
       round(degrees(pi()), 1) AS degrees, round(atan2(1, 1), 4) AS atan2;
```

```text result title="Resultado"
 sin | cos | degrees | atan2
-----+-----+---------+--------
 1.0 | 1.0 | 180.0   | 0.7854
(1 row)
```

## Al azar

`rand()` da un decimal desde 0 (incluido) hasta 1; `randomUUID()` un id nuevo:

```text run title="Ejemplo"
RETURN rand() < 1 AS below_one, size(randomUUID()) AS uuid_length;
```

```text result title="Resultado"
 below_one | uuid_length
-----------+-------------
 true      | 36
(1 row)
```

## Números de tus datos

La edad promedio en años y en meses, y la distancia de cada persona a ella:

```text run title="Ejemplo"
CREATE (:Person {name: 'Ana', age: 34}), (:Person {name: 'Bruno', age: 28}), (:Person {name: 'Carla', age: 45});
MATCH (p:Person)
WITH avg(p.age) AS years
RETURN round(years, 1) AS years, round(years * 12) AS months;
MATCH (p:Person)
WITH collect(p) AS people, avg(p.age) AS average
UNWIND people AS p
RETURN p.name, round(p.age - average, 1) AS from_average ORDER BY from_average;
```

```text result title="Resultado"
3 nodes created
 years | months
-------+--------
 35.7  | 428.0
(1 row)
 p.name | from_average
--------+--------------
 Bruno  | -7.7
 Ana    | -1.7
 Carla  | 9.3
(3 rows)
```

:::note Enteros y decimales se comparan como números
`7 = 7.0` es verdadero, y un índice encuentra `7.0` cuando buscas `7`. Un número demasiado grande para 64 bits es un error, no da la vuelta.
:::

```text run title="Ejemplo"
RETURN 7 = 7.0 AS equal, 7 / 2 = 3 AS integer_division;
RETURN 9223372036854775807 + 1 AS overflow;
```

```text result title="Resultado"
 equal | integer_division
-------+------------------
 true  | true
(1 row)
error: integer overflow
```
