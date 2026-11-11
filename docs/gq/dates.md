---
title: Dates and durations
description: Write dates and times, read their parts, add durations, measure the time between two dates and group by month.
---

# Dates and durations

A **time** in GQ is an instant in UTC. A **duration** is a length of time in months, days and smaller units.

## Write a time

`datetime('…')` reads ISO 8601. `date(t)` shows just the day:

```text run title="Example"
RETURN datetime('2024-05-01T10:30:00Z') AS instant, datetime('2024-05-01') AS midnight,
       date(datetime('2024-05-01T10:30:00Z')) AS day;
```

```text result title="Result"
 instant              | midnight             | day
----------------------+----------------------+------------
 2024-05-01T10:30:00Z | 2024-05-01T00:00:00Z | 2024-05-01
(1 row)
```

`datetime()` with no argument is now; `timestamp()` is now in milliseconds.

## Parts of a time

```text run title="Example"
WITH datetime('2024-05-01T10:30:00Z') AS t
RETURN t.year, t.month, t.day, t.hour, t.minute, t.dayOfWeek, t.dayOfYear, t.quarter, t.week;
```

```text result title="Result"
 t.year | t.month | t.day | t.hour | t.minute | t.dayOfWeek | t.dayOfYear | t.quarter | t.week
--------+---------+-------+--------+----------+-------------+-------------+-----------+--------
 2024   | 5       | 1     | 10     | 30       | 3           | 122         | 2         | 18
(1 row)
```

`dayOfWeek` counts Monday as 1. `week` is the ISO week.

## Durations

Written in ISO 8601 (`P1Y2M10DT2H30M`: 1 year, 2 months, 10 days, 2 hours, 30 minutes) or as a map:

```text run title="Example"
RETURN duration('P1Y2M10DT2H30M') AS iso, duration({days: 3, hours: 12}) AS from_map,
       duration('PT90M') AS ninety_minutes, duration('PT90M').minutes AS minutes;
```

```text result title="Result"
 iso            | from_map | ninety_minutes | minutes
----------------+----------+----------------+---------
 P1Y2M10DT2H30M | P3DT12H  | PT1H30M        | 90
(1 row)
```

## Add and subtract

Adding months follows the calendar: January 31 plus one month is the last day of February:

```text run title="Example"
RETURN date(datetime('2024-01-31') + duration('P1M')) AS plus_month,
       date(datetime('2024-03-01') - duration('P1D')) AS minus_day,
       datetime('2024-05-01T10:00:00Z') + duration('PT90M') AS plus_90_minutes;
```

```text result title="Result"
 plus_month | minus_day  | plus_90_minutes
------------+------------+----------------------
 2024-02-29 | 2024-02-29 | 2024-05-01T11:30:00Z
(1 row)
```

## Time between two dates

`duration.between` counts in calendar units; `duration.inDays` and friends in one unit:

```text run title="Example"
WITH datetime('2021-03-15') AS start, datetime('2024-05-01') AS end
RETURN duration.between(start, end) AS between, duration.inDays(start, end).days AS days,
       duration.inMonths(start, end).months AS months;
```

```text result title="Result"
 between  | days | months
----------+------+--------
 P3Y1M16D | 1143 | 37
(1 row)
```

## Truncate

`date.truncate(unit, t)` moves a time to the start of its year, quarter, month, week, day, hour…:

```text run title="Example"
WITH datetime('2024-05-17T15:45:00Z') AS t
RETURN date(date.truncate('month', t)) AS month, date(date.truncate('week', t)) AS week_monday,
       date(date.truncate('quarter', t)) AS quarter;
```

```text result title="Result"
 month      | week_monday | quarter
------------+-------------+------------
 2024-05-01 | 2024-05-13  | 2024-04-01
(1 row)
```

## Group by month

Times in properties are stored as text by `datetime()`; read them back with `datetime(…)`:

```text run title="Example"
UNWIND ['2024-01-05', '2024-01-20', '2024-02-11', '2024-03-02', '2024-03-30', '2024-03-31'] AS d
CREATE (:Sale {at: datetime(d), amount: 100});
MATCH (s:Sale)
WITH date(date.truncate('month', datetime(s.at))) AS month, count(*) AS sales, sum(s.amount) AS total
RETURN month, sales, total ORDER BY month;
```

```text result title="Result"
6 nodes created
 month      | sales | total
------------+-------+-------
 2024-01-01 | 2     | 200
 2024-02-01 | 1     | 100
 2024-03-01 | 3     | 300
(3 rows)
```

## A series of times

`temporal.series(start, end, step)` yields one time per step, to fill a timeline:

```text run title="Example"
CALL temporal.series('2024-01-01', '2024-04-01', 'P1M') YIELD at RETURN date(at) AS month;
```

```text result title="Result"
 month
------------
 2024-01-01
 2024-02-01
 2024-03-01
 2024-04-01
(4 rows)
```

The [Time travel](time-travel.md) page uses it to count what was true at each point of a period.

:::tip Good to know
Durations compare by approximate length (a month counts as 30.44 days). `sum` and `avg` add durations.
:::
