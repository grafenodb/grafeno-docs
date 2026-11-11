---
title: Referencia de GQ
description: Una referencia compacta del lenguaje de consultas de Grafeno.
---

# Referencia de GQ

GQ es el lenguaje de consultas de Grafeno: un lenguaje declarativo de patrones de grafos, con hechos bitemporales, campos de memoria, sentencias de acceso y procedimientos propios.

Esta página es un resumen. El [tutorial de GQ](../gq/index.md) explica cada función con sentencias y sus resultados.

## Leer

```text
MATCH (p:Person)-[r:works_at]->(o:Organization)
WHERE p.city = $city AND r.since >= 2020
RETURN p.name AS person, o.name AS organization
ORDER BY person
LIMIT 25;
```

Los patrones pueden ser dirigidos o no dirigidos. Se admiten `OPTIONAL MATCH`, `WITH`, `UNWIND`, `UNION`, subconsultas, agregación y caminos de longitud variable.

## Escribir

```text
CREATE (p:Person {name: 'Ana'})
SET p.city = 'Quito'
RETURN p.@id;
```

Usa `MERGE` para un patrón idempotente y `DELETE` o `DETACH DELETE` para eliminar registros. Cada nodo creado necesita al menos una etiqueta.

## Consultar el tiempo

```text
MATCH (p:Person)-[r:works_at]->(o)
VALID AT '2025-01-01'
KNOWN AT '2025-02-01'
RETURN p.name, o.name, r.@recorded_at;
```

`VALID AT` filtra cuándo los hechos eran ciertos; `KNOWN AT` filtra lo que ya se había registrado en ese momento.

## Pseudopropiedades

| Nodo | Relación |
| --- | --- |
| `@id`, `@labels`, `@text`, `@embedding`, `@sources` | `@id`, `@label`, `@from`, `@to`, `@sources` |
| `@importance`, `@accesses`, `@last_access` | `@valid_from`, `@valid_to`, `@recorded_at`, `@expired_at`, `@recorded_by` |

Las pseudopropiedades son campos del motor. Las propiedades normales son valores JSON y no comienzan con `@`.

## Planificar y medir

Antepón `EXPLAIN` para ver el plan sin ejecutar una consulta, o `PROFILE` para ejecutarla con cantidades de filas y lecturas.

```text
EXPLAIN MATCH (p:Person {email: $email}) RETURN p;
```

Crea índices de propiedades, texto, vectores y búsqueda aproximada mediante GQ. Los parámetros usan `$nombre`; parametriza los valores en vez de construir cadenas de consulta.

## Decisiones que conviene conocer

- Cada nodo debe tener una etiqueta.
- Los identificadores son UUID, no enteros.
- Un recorrido de longitud variable alcanza cada nodo final una vez, por su camino coincidente más corto.
- Los clientes se conectan por la API HTTP o MCP; no hay protocolo binario.
- La sintaxis no admitida se rechaza con un error que la señala.
