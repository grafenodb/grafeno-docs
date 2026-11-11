---
title: Numbers
description: Arithmetic, integer and float division, rounding, powers, logarithms, trigonometry and random numbers in GQ.
---

# Numbers

GQ has integers (64 bits) and floats. Arithmetic works as you expect, with one rule to remember: **dividing two integers gives an integer**.

## Arithmetic

| Operator | Meaning |
| --- | --- |
| `+`, `-`, `*` | add, subtract, multiply |
| `/` | divide (whole numbers give a whole number) |
| `%` | remainder |
| `^` | power (always a float) |

```text run title="Example"
RETURN 7 + 2 AS add, 7 - 2 AS sub, 7 * 2 AS mul, 7 / 2 AS int_div,
       7.0 / 2 AS float_div, 7 % 2 AS remainder, 2 ^ 10 AS power;
```

```text result title="Result"
 add | sub | mul | int_div | float_div | remainder | power
-----+-----+-----+---------+-----------+-----------+--------
 9   | 5   | 14  | 3       | 3.5       | 1         | 1024.0
(1 row)
```

## Rounding

`round(x, digits)` rounds half away from zero; `floor` and `ceil` go down and up:

```text run title="Example"
RETURN round(3.14159, 2) AS round2, round(2.5) AS round, floor(2.7) AS floor,
       ceil(2.1) AS ceil, abs(-4) AS abs, sign(-4) AS sign;
```

```text result title="Result"
 round2 | round | floor | ceil | abs | sign
--------+-------+-------+------+-----+------
 3.14   | 3.0   | 2.0   | 3.0  | 4   | -1
(1 row)
```

## Roots, powers and logarithms

```text run title="Example"
RETURN sqrt(16) AS sqrt, exp(1) AS e_to_1, log(e()) AS ln_e, log10(1000) AS log10;
```

```text result title="Result"
 sqrt | e_to_1            | ln_e | log10
------+-------------------+------+-------
 4.0  | 2.718281828459045 | 1.0  | 3.0
(1 row)
```

## Trigonometry

Angles are in radians; `degrees` and `radians` convert:

```text run title="Example"
RETURN round(sin(pi() / 2), 3) AS sin, round(cos(0), 3) AS cos,
       round(degrees(pi()), 1) AS degrees, round(atan2(1, 1), 4) AS atan2;
```

```text result title="Result"
 sin | cos | degrees | atan2
-----+-----+---------+--------
 1.0 | 1.0 | 180.0   | 0.7854
(1 row)
```

## Random

`rand()` gives a float from 0 (included) to 1; `randomUUID()` a new id:

```text run title="Example"
RETURN rand() < 1 AS below_one, size(randomUUID()) AS uuid_length;
```

```text result title="Result"
 below_one | uuid_length
-----------+-------------
 true      | 36
(1 row)
```

## Numbers from your data

The average age in years and in months, and each person's distance from it:

```text run title="Example"
CREATE (:Person {name: 'Ana', age: 34}), (:Person {name: 'Bruno', age: 28}), (:Person {name: 'Carla', age: 45});
MATCH (p:Person)
WITH avg(p.age) AS years
RETURN round(years, 1) AS years, round(years * 12) AS months;
MATCH (p:Person)
WITH collect(p) AS people, avg(p.age) AS average
UNWIND people AS p
RETURN p.name, round(p.age - average, 1) AS from_average ORDER BY from_average;
```

```text result title="Result"
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

:::note Integers and floats compare as numbers
`7 = 7.0` is true, and an index finds `7.0` when you look for `7`. A number too large for 64 bits is an error, not a wrap-around.
:::

```text run title="Example"
RETURN 7 = 7.0 AS equal, 7 / 2 = 3 AS integer_division;
RETURN 9223372036854775807 + 1 AS overflow;
```

```text result title="Result"
 equal | integer_division
-------+------------------
 true  | true
(1 row)
error: integer overflow
```
