---
title: Tiempo
description: Tiempo válido y tiempo de registro — qué fue cierto en el mundo y qué sabía Grafeno — y cómo terminar, corregir y consultar hechos.
sidebar_position: 2
---

# Tiempo

La memoria envejece: la gente cambia de trabajo, los planes cambian, un hecho registrado la semana pasada resulta falso. Grafeno nunca sobrescribe un hecho. Cada hecho lleva **dos tiempos**, y puedes preguntar por cualquier momento en cualquiera de los dos.

| Tiempo | Campos | Responde |
| --- | --- | --- |
| **Tiempo válido** | `@valid_from`, `@valid_to` | ¿Cuándo fue cierto *en el mundo*? |
| **Tiempo de registro** | `@recorded_at`, `@expired_at` | ¿Cuándo lo *supo* Grafeno? |

El tiempo válido lo pones tú (por defecto, "desde ahora"). El de registro lo pone Grafeno al escribir y no se puede cambiar: es la historia propia de la base.

## El mundo cambió: termina el hecho

Ana trabajó en Acme hasta enero de 2025. El hecho fue cierto entonces; ahora no lo es. Termínalo en tiempo válido:

```text
MATCH (:Person {name: 'Ana Torres'})-[w:works_at]->(:Company {name: 'Acme Robotics'})
SET w.@valid_to = '2025-01-31';
```

El hecho queda, con su período. `VALID AT` pregunta qué era cierto en un momento:

```text
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT '2023-06-01' RETURN c.name;   // Acme Robotics
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT datetime() RETURN c.name;     // Orbit Labs
```

Sin `VALID AT`, un `MATCH` ve todos los hechos que no fueron retractados, sea cual sea su período, así que listar la historia es fácil (`date(w.@valid_from)`, `date(w.@valid_to)`).

## El registro estaba mal: retráctalo

Alguien registró que Ana vive en Cusco. Nunca vivió ahí: fue un error. Eso no es que el mundo cambió, así que no lo termines — **retráctalo**:

```text
MATCH (:Person {name: 'Ana Torres'})-[r:lives_in]->() RETRACT r;
```

Un hecho retractado desaparece del conocimiento actual:

```text
MATCH (:Person {name: 'Ana Torres'})-[:lives_in]->(c) RETURN c.name;
```

```text
 c.name
--------
(0 rows)
```

Pero Grafeno recuerda que lo creyó. `KNOWN AT` muestra lo que sabía en un momento, antes de la corrección:

```text
MATCH (:Person {name: 'Ana Torres'})-[r:lives_in]->(c)
KNOWN AT '2026-11-07T15:09:11Z'
RETURN c.name, r.@recorded_at, r.@expired_at;
```

```text
 c.name | r.@recorded_at              | r.@expired_at
--------+-----------------------------+-----------------------------
 Cusco  | 2026-11-07T15:09:10.298538Z | 2026-11-07T15:09:12.890820Z
(1 row)
```

Eso le permite a un agente explicarse después: "ese día respondí Cusco, porque eso me habían dicho".

## Cuál usar

| Qué pasó | Haz | Luego |
| --- | --- | --- |
| Algo dejó de ser cierto | `SET r.@valid_to = '…'` | `VALID AT` antes de esa fecha lo sigue encontrando |
| Un hecho nuevo reemplaza a uno viejo | deja que una [restricción](../guides/agent-memory.md#keep-facts-from-contradicting-each-other) termine el viejo | cada hecho conserva su período |
| El hecho nunca fue cierto | `RETRACT r` | solo `KNOWN AT` un momento anterior lo muestra |
| El dato debe desaparecer (privacidad, una prueba) | `DELETE r` | se va, sin historia |

## Tiempos que puedes escribir

Donde va un tiempo (`@valid_from`, `VALID AT`, `KNOWN AT`), Grafeno acepta una fecha o fecha-hora ISO 8601 (`'2024-05-01'`, `'2024-05-01T10:30:00Z'`, `'2024-05-01T10:30:00-05:00'`), un valor de tiempo como `datetime()`, o microsegundos desde la época Unix. Sin zona horaria, se asume UTC. Las duraciones y la aritmética de fechas (`duration('P1M')`, `date.truncate`) están en la [referencia de GQ](../reference/gq.md).

## Las propiedades también tienen historia

Una propiedad de un nodo puede conservar sus valores anteriores. Declárala **funcional** y cada cambio queda recordado:

```text
CREATE CONSTRAINT FOR (p:Person) REQUIRE p.city IS FUNCTIONAL;
```

Tras `SET p.city = 'Quito'` en alguien que vivía en Lima, `p.city` es `'Quito'`, y `history(p, 'city')` devuelve los valores anteriores como una lista de `{value, from, to, by}`, del más antiguo al más reciente:

```text
MATCH (p:Person {name: 'Ana'}) RETURN [h IN history(p, 'city') | h.value] AS cities;   // [Lima]
```
