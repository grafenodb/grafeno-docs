---
title: Fechas y duraciones
description: Escribe fechas y horas, lee sus partes, suma duraciones, mide el tiempo entre dos fechas y agrupa por mes.
---

# Fechas y duraciones

Un **tiempo** en GQ es un instante en UTC. Una **duración** es un lapso en meses, días y unidades menores.

## Escribir un tiempo

`datetime('…')` lee ISO 8601. `date(t)` muestra solo el día:

```text run title="Ejemplo"
RETURN datetime('2024-05-01T10:30:00Z') AS instant, datetime('2024-05-01') AS midnight,
       date(datetime('2024-05-01T10:30:00Z')) AS day;
```

```text result title="Resultado"
 instant              | midnight             | day
----------------------+----------------------+------------
 2024-05-01T10:30:00Z | 2024-05-01T00:00:00Z | 2024-05-01
(1 row)
```

`datetime()` sin argumento es ahora; `timestamp()` es ahora en milisegundos.

## Partes de un tiempo

```text run title="Ejemplo"
WITH datetime('2024-05-01T10:30:00Z') AS t
RETURN t.year, t.month, t.day, t.hour, t.minute, t.dayOfWeek, t.dayOfYear, t.quarter, t.week;
```

```text result title="Resultado"
 t.year | t.month | t.day | t.hour | t.minute | t.dayOfWeek | t.dayOfYear | t.quarter | t.week
--------+---------+-------+--------+----------+-------------+-------------+-----------+--------
 2024   | 5       | 1     | 10     | 30       | 3           | 122         | 2         | 18
(1 row)
```

`dayOfWeek` cuenta el lunes como 1. `week` es la semana ISO.

## Duraciones

Se escriben en ISO 8601 (`P1Y2M10DT2H30M`: 1 año, 2 meses, 10 días, 2 horas, 30 minutos) o como un mapa:

```text run title="Ejemplo"
RETURN duration('P1Y2M10DT2H30M') AS iso, duration({days: 3, hours: 12}) AS from_map,
       duration('PT90M') AS ninety_minutes, duration('PT90M').minutes AS minutes;
```

```text result title="Resultado"
 iso            | from_map | ninety_minutes | minutes
----------------+----------+----------------+---------
 P1Y2M10DT2H30M | P3DT12H  | PT1H30M        | 90
(1 row)
```

## Sumar y restar

Sumar meses sigue el calendario: el 31 de enero más un mes es el último día de febrero:

```text run title="Ejemplo"
RETURN date(datetime('2024-01-31') + duration('P1M')) AS plus_month,
       date(datetime('2024-03-01') - duration('P1D')) AS minus_day,
       datetime('2024-05-01T10:00:00Z') + duration('PT90M') AS plus_90_minutes;
```

```text result title="Resultado"
 plus_month | minus_day  | plus_90_minutes
------------+------------+----------------------
 2024-02-29 | 2024-02-29 | 2024-05-01T11:30:00Z
(1 row)
```

## El tiempo entre dos fechas

`duration.between` cuenta en unidades del calendario; `duration.inDays` y sus parecidas, en una sola unidad:

```text run title="Ejemplo"
WITH datetime('2021-03-15') AS start, datetime('2024-05-01') AS end
RETURN duration.between(start, end) AS between, duration.inDays(start, end).days AS days,
       duration.inMonths(start, end).months AS months;
```

```text result title="Resultado"
 between  | days | months
----------+------+--------
 P3Y1M16D | 1143 | 37
(1 row)
```

## Truncar

`date.truncate(unidad, t)` lleva un tiempo al inicio de su año, trimestre, mes, semana, día, hora…:

```text run title="Ejemplo"
WITH datetime('2024-05-17T15:45:00Z') AS t
RETURN date(date.truncate('month', t)) AS month, date(date.truncate('week', t)) AS week_monday,
       date(date.truncate('quarter', t)) AS quarter;
```

```text result title="Resultado"
 month      | week_monday | quarter
------------+-------------+------------
 2024-05-01 | 2024-05-13  | 2024-04-01
(1 row)
```

## Agrupar por mes

`datetime()` guarda los tiempos de las propiedades como texto; léelos de vuelta con `datetime(…)`:

```text run title="Ejemplo"
UNWIND ['2024-01-05', '2024-01-20', '2024-02-11', '2024-03-02', '2024-03-30', '2024-03-31'] AS d
CREATE (:Sale {at: datetime(d), amount: 100});
MATCH (s:Sale)
WITH date(date.truncate('month', datetime(s.at))) AS month, count(*) AS sales, sum(s.amount) AS total
RETURN month, sales, total ORDER BY month;
```

```text result title="Resultado"
6 nodes created
 month      | sales | total
------------+-------+-------
 2024-01-01 | 2     | 200
 2024-02-01 | 1     | 100
 2024-03-01 | 3     | 300
(3 rows)
```

## Una serie de tiempos

`temporal.series(inicio, fin, paso)` da un tiempo por paso, para llenar una línea de tiempo:

```text run title="Ejemplo"
CALL temporal.series('2024-01-01', '2024-04-01', 'P1M') YIELD at RETURN date(at) AS month;
```

```text result title="Resultado"
 month
------------
 2024-01-01
 2024-02-01
 2024-03-01
 2024-04-01
(4 rows)
```

La página [Viaje en el tiempo](time-travel.md) la usa para contar lo que era cierto en cada punto de un período.

:::tip Bueno saber
Las duraciones se comparan por su largo aproximado (un mes cuenta como 30,44 días). `sum` y `avg` suman duraciones.
:::
