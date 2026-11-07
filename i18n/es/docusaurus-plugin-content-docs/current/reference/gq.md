---
title: Referencia de GQ
description: Una referencia compacta del lenguaje de consultas de Grafeno.
---

# Referencia de GQ

GQ es el lenguaje de consultas de Grafeno. Se parece a Cypher y añade hechos bitemporales, campos de memoria, sentencias de acceso y procedimientos propios.

## Leer

```cypher
MATCH (p:Person)-[r:works_at]->(o:Organization)
WHERE p.city = $city AND r.since >= 2020
RETURN p.name AS person, o.name AS organization
ORDER BY person
LIMIT 25;
```

Los patrones pueden ser dirigidos o no dirigidos. Se admiten `OPTIONAL MATCH`, `WITH`, `UNWIND`, `UNION`, subconsultas, agregación y caminos de longitud variable.

## Escribir

```cypher
CREATE (p:Person {name: 'Ana'})
SET p.city = 'Quito'
RETURN p.@id;
```

Usa `MERGE` para un patrón idempotente y `DELETE` o `DETACH DELETE` para eliminar registros. Cada nodo creado necesita al menos una etiqueta.

## Consultar el tiempo

```cypher
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

```cypher
EXPLAIN MATCH (p:Person {email: $email}) RETURN p;
```

Crea índices de propiedades, texto, vectores y búsqueda aproximada mediante GQ. Los parámetros usan `$nombre`; parametriza los valores en vez de construir cadenas de consulta.

## Diferencias importantes con Cypher

- Cada nodo debe tener una etiqueta.
- Los identificadores son UUID, no enteros.
- Un recorrido de longitud variable alcanza cada nodo final una vez, por su camino coincidente más corto.
- GQ no es el protocolo Bolt; los drivers de Neo4j no se conectan a Grafeno.
- La sintaxis no compatible se rechaza; cubrir todo Cypher o GQL no es un objetivo.
