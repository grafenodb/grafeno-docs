---
title: Condiciones
description: Elige valores con CASE, recurre a coalesce y entiende cómo se comporta null en comparaciones y en la lógica.
---

# Condiciones

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (:Person {name: 'Ana', age: 34, status: 'a'}),
       (:Person {name: 'Bruno', age: 28, status: 'b'}),
       (:Person {name: 'Carla', age: 45}),
       (:Person {name: 'Eva', age: 23, nickname: 'Evi'});
```

```text result title="Resultado"
4 nodes created
```

## CASE con condiciones

El primer `WHEN` verdadero da el valor; `ELSE` cubre el resto:

```text run title="Ejemplo"
MATCH (p:Person)
RETURN p.name,
       CASE WHEN p.age < 25 THEN 'junior'
            WHEN p.age < 40 THEN 'mid'
            ELSE 'senior' END AS band
ORDER BY p.age;
```

```text result title="Resultado"
 p.name | band
--------+--------
 Eva    | junior
 Bruno  | mid
 Ana    | mid
 Carla  | senior
(4 rows)
```

## CASE sobre un valor

Compara una expresión con varios valores:

```text run title="Ejemplo"
MATCH (p:Person)
RETURN p.name, CASE p.status WHEN 'a' THEN 'active' WHEN 'b' THEN 'blocked' ELSE 'unknown' END AS status
ORDER BY p.name;
```

```text result title="Resultado"
 p.name | status
--------+---------
 Ana    | active
 Bruno  | blocked
 Carla  | unknown
 Eva    | unknown
(4 rows)
```

Sin `ELSE`, un `CASE` que no coincide con nada da `null`.

## coalesce

El primer valor que no es `null`:

```text run title="Ejemplo"
MATCH (p:Person) RETURN p.name, coalesce(p.nickname, p.name) AS call_them ORDER BY p.name;
```

```text result title="Resultado"
 p.name | call_them
--------+-----------
 Ana    | Ana
 Bruno  | Bruno
 Carla  | Carla
 Eva    | Evi
(4 rows)
```

## nullIf

`nullIf(a, b)` da `null` cuando ambos son iguales y, si no, `a`: útil para tratar un valor de relleno como ausente:

```text run title="Ejemplo"
RETURN nullIf('', '') AS empty_is_null, nullIf('x', '') AS kept;
```

```text result title="Resultado"
 empty_is_null | kept
---------------+------
 null          | x
(1 row)
```

## Cómo se comporta null

`null` significa "desconocido". Las comparaciones con él también son desconocidas, y la lógica sigue tres valores:

```text run title="Ejemplo"
RETURN null = null AS eq, null IS NULL AS is_null, 1 + null AS sum,
       true OR null AS or_true, false AND null AS and_false, true AND null AS and_unknown;
```

```text result title="Resultado"
 eq   | is_null | sum  | or_true | and_false | and_unknown
------+---------+------+---------+-----------+-------------
 null | true    | null | true    | false     | null
(1 row)
```

| Expresión | Resultado |
| --- | --- |
| `null = cualquier cosa` | `null` (desconocido) |
| `x IS NULL` | `true` o `false`, nunca desconocido |
| `true OR null` | `true` |
| `false AND null` | `false` |
| aritmética con `null` | `null` |

## Condiciones en consultas

`CASE` funciona donde sea que va una expresión, también en `ORDER BY` y en agregaciones. Personas por tramo:

```text run title="Ejemplo"
MATCH (p:Person)
RETURN CASE WHEN p.age < 30 THEN 'under 30' ELSE '30 and over' END AS band, count(*) AS people
ORDER BY band;
```

```text result title="Resultado"
 band        | people
-------------+--------
 30 and over | 2
 under 30    | 2
(2 rows)
```
