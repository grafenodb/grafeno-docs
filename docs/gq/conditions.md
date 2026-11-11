---
title: Conditions
description: Choose values with CASE, fall back with coalesce, and understand how null behaves in comparisons and logic.
---

# Conditions

## The example data

```text run title="Example"
CREATE (:Person {name: 'Ana', age: 34, status: 'a'}),
       (:Person {name: 'Bruno', age: 28, status: 'b'}),
       (:Person {name: 'Carla', age: 45}),
       (:Person {name: 'Eva', age: 23, nickname: 'Evi'});
```

```text result title="Result"
4 nodes created
```

## CASE with conditions

The first `WHEN` that is true gives the value; `ELSE` covers the rest:

```text run title="Example"
MATCH (p:Person)
RETURN p.name,
       CASE WHEN p.age < 25 THEN 'junior'
            WHEN p.age < 40 THEN 'mid'
            ELSE 'senior' END AS band
ORDER BY p.age;
```

```text result title="Result"
 p.name | band
--------+--------
 Eva    | junior
 Bruno  | mid
 Ana    | mid
 Carla  | senior
(4 rows)
```

## CASE on a value

Compare one expression against several values:

```text run title="Example"
MATCH (p:Person)
RETURN p.name, CASE p.status WHEN 'a' THEN 'active' WHEN 'b' THEN 'blocked' ELSE 'unknown' END AS status
ORDER BY p.name;
```

```text result title="Result"
 p.name | status
--------+---------
 Ana    | active
 Bruno  | blocked
 Carla  | unknown
 Eva    | unknown
(4 rows)
```

Without `ELSE`, a `CASE` that matches nothing gives `null`.

## coalesce

The first value that is not `null`:

```text run title="Example"
MATCH (p:Person) RETURN p.name, coalesce(p.nickname, p.name) AS call_them ORDER BY p.name;
```

```text result title="Result"
 p.name | call_them
--------+-----------
 Ana    | Ana
 Bruno  | Bruno
 Carla  | Carla
 Eva    | Evi
(4 rows)
```

## nullIf

`nullIf(a, b)` gives `null` when both are equal, else `a`: handy to treat a placeholder as missing:

```text run title="Example"
RETURN nullIf('', '') AS empty_is_null, nullIf('x', '') AS kept;
```

```text result title="Result"
 empty_is_null | kept
---------------+------
 null          | x
(1 row)
```

## How null behaves

`null` means "unknown". Comparisons with it are unknown too, and logic follows three values:

```text run title="Example"
RETURN null = null AS eq, null IS NULL AS is_null, 1 + null AS sum,
       true OR null AS or_true, false AND null AS and_false, true AND null AS and_unknown;
```

```text result title="Result"
 eq   | is_null | sum  | or_true | and_false | and_unknown
------+---------+------+---------+-----------+-------------
 null | true    | null | true    | false     | null
(1 row)
```

| Expression | Result |
| --- | --- |
| `null = anything` | `null` (unknown) |
| `x IS NULL` | `true` or `false`, never unknown |
| `true OR null` | `true` |
| `false AND null` | `false` |
| arithmetic with `null` | `null` |

## Conditions in queries

`CASE` works anywhere an expression does, in `ORDER BY` and in aggregates too. Count people per band:

```text run title="Example"
MATCH (p:Person)
RETURN CASE WHEN p.age < 30 THEN 'under 30' ELSE '30 and over' END AS band, count(*) AS people
ORDER BY band;
```

```text result title="Result"
 band        | people
-------------+--------
 30 and over | 2
 under 30    | 2
(2 rows)
```
