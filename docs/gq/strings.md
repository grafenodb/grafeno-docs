---
title: Strings
description: Join, cut, search, replace, change case and convert text with GQ's string functions.
---

# Strings

Strings are written in single or double quotes. `+` joins them, and functions change and take them apart.

## Join

```text run title="Example"
RETURN 'graph' + ' ' + 'memory' AS joined, 'n = ' + toString(42) AS with_number;
```

```text result title="Result"
 joined       | with_number
--------------+-------------
 graph memory | n = 42
(1 row)
```

## Case and spaces

```text run title="Example"
RETURN upper('Lima') AS upper, lower('LIMA') AS lower,
       trim('  both  ') AS trim, ltrim('  left') AS ltrim, rtrim('right  ') AS rtrim;
```

```text result title="Result"
 upper | lower | trim | ltrim | rtrim
-------+-------+------+-------+-------
 LIMA  | lima  | both | left  | right
(1 row)
```

## Length and parts

`substring(s, start, length)` counts from 0. `left` and `right` take characters from either end:

```text run title="Example"
RETURN size('Grafeno') AS size, substring('Grafeno', 0, 4) AS first4,
       substring('Grafeno', 4) AS rest, left('Grafeno', 3) AS left3, right('Grafeno', 3) AS right3;
```

```text result title="Result"
 size | first4 | rest | left3 | right3
------+--------+------+-------+--------
 7    | Graf   | eno  | Gra   | eno
(1 row)
```

## Replace, split, reverse

```text run title="Example"
RETURN replace('a-b-c', '-', '/') AS replaced, split('a,b,c', ',') AS parts, reverse('abc') AS reversed;
```

```text result title="Result"
 replaced | parts     | reversed
----------+-----------+----------
 a/b/c    | [a, b, c] | cba
(1 row)
```

## Search inside text

In conditions, `STARTS WITH`, `ENDS WITH`, `CONTAINS` and `=~` (a regular expression over the whole string):

```text run title="Example"
RETURN 'Grafeno' STARTS WITH 'Gra' AS starts, 'Grafeno' CONTAINS 'fen' AS contains,
       'Grafeno' =~ 'G.*o' AS regex, 'GRAFENO' =~ '(?i)grafeno' AS ignoring_case;
```

```text result title="Result"
 starts | contains | regex | ignoring_case
--------+----------+-------+---------------
 true   | true     | true  | true
(1 row)
```

## Convert

| Function | Gives |
| --- | --- |
| `toString(x)` | the text of a number, boolean or time |
| `toInteger(s)`, `toFloat(s)`, `toBoolean(s)` | a number or boolean from text (an error if it is not one) |
| `toIntegerOrNull(s)`, `toFloatOrNull(s)`, … | the same, or `null` instead of an error |

```text run title="Example"
RETURN toInteger('42') + 1 AS int, toFloat('2.5') * 2 AS float,
       toBoolean('true') AS bool, toIntegerOrNull('forty') AS not_a_number;
```

```text result title="Result"
 int | float | bool | not_a_number
-----+-------+------+--------------
 43  | 5.0   | true | null
(1 row)
```

## Use them on your data

```text run title="Example"
CREATE (:Person {first: 'ana', last: 'TORRES'}), (:Person {first: 'bruno', last: 'rivera'});
MATCH (p:Person)
RETURN upper(left(p.first, 1)) + substring(p.first, 1) + ' ' +
       upper(left(p.last, 1)) + lower(substring(p.last, 1)) AS full_name
ORDER BY full_name;
```

```text result title="Result"
2 nodes created
 full_name
--------------
 Ana Torres
 Bruno Rivera
(2 rows)
```

:::tip How alike are two strings?
Functions such as `text.levenshtein` and `text.similarity` measure how close two strings are, for typos and duplicates. They are on the [Similar text](similar-text.md) page.
:::
