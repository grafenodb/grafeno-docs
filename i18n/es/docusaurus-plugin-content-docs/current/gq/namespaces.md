---
title: Namespaces
description: Crea, describe, lista y borra namespaces con GQ, y prepara un namespace desde un script.
---

# Namespaces

Un **namespace** es un grafo aparte: uno por aplicación, equipo, cliente o agente. Una consulta se ejecuta en un namespace y nunca ve otro. Un namespace aparece con su primera escritura, o lo creas explícitamente, con un comentario que dice para qué es.

## Sintaxis

```text
CREATE NAMESPACE nombre [IF NOT EXISTS] [COMMENT 'texto']
ALTER NAMESPACE nombre SET COMMENT 'texto' | REMOVE COMMENT
DROP NAMESPACE nombre [IF EXISTS]
SHOW NAMESPACES
```

## Crear

Los nombres con guion van entre comillas:

```text run title="Ejemplo"
CREATE NAMESPACE crm COMMENT 'customers and their orders';
CREATE NAMESPACE 'team-a' IF NOT EXISTS;
CREATE NAMESPACE 'team-a' IF NOT EXISTS;
```

```text result title="Resultado"
 name | nodes | edges | created_at                  | description
------+-------+-------+-----------------------------+----------------------------
 crm  | 0     | 0     | 2026-11-11T14:59:48.688106Z | customers and their orders
(1 row)
 name   | nodes | edges | created_at                  | description
--------+-------+-------+-----------------------------+-------------
 team-a | 0     | 0     | 2026-11-11T14:59:48.691246Z | null
(1 row)
 name   | nodes | edges | created_at                  | description
--------+-------+-------+-----------------------------+-------------
 team-a | 0     | 0     | 2026-11-11T14:59:48.691246Z | null
(1 row)
```

## Describir

```text run title="Ejemplo"
ALTER NAMESPACE crm SET COMMENT 'customers, orders and invoices';
```

```text result title="Resultado"
 name | nodes | edges | created_at                  | description
------+-------+-------+-----------------------------+--------------------------------
 crm  | 0     | 0     | 2026-11-11T14:59:48.688106Z | customers, orders and invoices
(1 row)
```

## Listar

`SHOW NAMESPACES` lista los namespaces que puedes leer, con sus cuentas:

```text run title="Ejemplo"
SHOW NAMESPACES;
```

```text result title="Resultado"
 name   | nodes | edges | created_at                  | description
--------+-------+-------+-----------------------------+--------------------------------
 crm    | 0     | 0     | 2026-11-11T14:59:48.688106Z | customers, orders and invoices
 team-a | 0     | 0     | 2026-11-11T14:59:48.691246Z | null
(2 rows)
```

## Borrar

Borrar un namespace borra todo lo que hay en él. Devuelve cuántos nodos y aristas se fueron:

```text run title="Ejemplo"
DROP NAMESPACE 'team-a';
DROP NAMESPACE 'team-a' IF EXISTS;
```

```text result title="Resultado"
 name   | nodes | edges | created_at | description
--------+-------+-------+------------+-------------
 team-a | 0     | 0     | null       | null
(1 row)
 name | nodes | edges | created_at | description
------+-------+-------+------------+-------------
(0 rows)
```

## Trabajar en un namespace

En la consola, `\use nombre` cambia de namespace, y `grafeno shell -n nombre` empieza en uno. Por HTTP el namespace es parte de la dirección: `POST /v1/crm/query`.

## Preparar un namespace desde un script

Un archivo de sentencias, guardado con el código de una aplicación, puede crear su namespace, índices, restricciones y primeros datos:

```text
// setup.gq
CREATE NAMESPACE crm IF NOT EXISTS COMMENT 'customers and their orders';
\use crm
CREATE INDEX IF NOT EXISTS FOR (c:Customer) ON (c.name);
CREATE CONSTRAINT IF NOT EXISTS FOR (c:Customer) REQUIRE c.email IS UNIQUE;
MERGE (:Customer {email: 'ana@example.org', name: 'Ana'});
```

```bash
grafeno shell --config /etc/grafeno/grafeno.toml --stop-on-error -f setup.gq
```

Como cada línea usa `IF NOT EXISTS` o `MERGE`, ejecutar el script otra vez no cambia nada. Ver [Scripts](../guides/scripts.md).

:::tip Quién puede hacer qué
Crear un namespace requiere el derecho a crearlo; cambiar su comentario, `schema` sobre él; borrarlo, `drop`. Ver [Acceso](../guides/access.md).
:::
