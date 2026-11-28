---
title: Namespaces
description: Create, describe, list and drop namespaces with GQ, and set up a namespace from a script.
---

# Namespaces

A **namespace** is a separate graph: one per application, team, customer or agent. A query runs in one namespace and never sees another. A namespace appears with its first write, or you create it explicitly, with a comment that says what it is for.

## Syntax

```text
CREATE NAMESPACE name [IF NOT EXISTS] [COMMENT 'text']
ALTER NAMESPACE name SET COMMENT 'text' | REMOVE COMMENT
DROP NAMESPACE name [IF EXISTS]
SHOW NAMESPACES
```

## Create

Names with a dash go in quotes:

```text run title="Example"
CREATE NAMESPACE crm COMMENT 'customers and their orders';
CREATE NAMESPACE 'team-a' IF NOT EXISTS;
CREATE NAMESPACE 'team-a' IF NOT EXISTS;
```

```text result title="Result"
 name | nodes | edges | created_at                  | description
------+-------+-------+-----------------------------+----------------------------
 crm  | 0     | 0     | 2026-11-11T14:59:44.921727Z | customers and their orders
(1 row)
 name   | nodes | edges | created_at                  | description
--------+-------+-------+-----------------------------+-------------
 team-a | 0     | 0     | 2026-11-11T14:59:44.924515Z | null
(1 row)
 name   | nodes | edges | created_at                  | description
--------+-------+-------+-----------------------------+-------------
 team-a | 0     | 0     | 2026-11-11T14:59:44.924515Z | null
(1 row)
```

## Describe

```text run title="Example"
ALTER NAMESPACE crm SET COMMENT 'customers, orders and invoices';
```

```text result title="Result"
 name | nodes | edges | created_at                  | description
------+-------+-------+-----------------------------+--------------------------------
 crm  | 0     | 0     | 2026-11-11T14:59:44.921727Z | customers, orders and invoices
(1 row)
```

## List

`SHOW NAMESPACES` lists the namespaces you may read, with their counts:

```text run title="Example"
SHOW NAMESPACES;
```

```text result title="Result"
 name   | nodes | edges | created_at                  | description
--------+-------+-------+-----------------------------+--------------------------------
 crm    | 0     | 0     | 2026-11-11T14:59:44.921727Z | customers, orders and invoices
 team-a | 0     | 0     | 2026-11-11T14:59:44.924515Z | null
(2 rows)
```

## Drop

Dropping a namespace deletes everything in it. It returns how many nodes and edges went:

```text run title="Example"
DROP NAMESPACE 'team-a';
DROP NAMESPACE 'team-a' IF EXISTS;
```

```text result title="Result"
 name   | nodes | edges | created_at | description
--------+-------+-------+------------+-------------
 team-a | 0     | 0     | null       | null
(1 row)
 name | nodes | edges | created_at | description
------+-------+-------+------------+-------------
(0 rows)
```

## Indexing policy

A namespace's policy says which of its node properties get indexes without a `CREATE INDEX`. It is given when the namespace is created, or changed later:

```text
CREATE NAMESPACE shop OPTIONS {indexing: {mode: 'automatic'}};
ALTER NAMESPACE docs SET INDEXING {mode: 'hybrid', exclude: ['raw'],
  labels: {Doc: {properties: {title: ['fulltext'], year: ['range']}}}};
ALTER NAMESPACE crm SET INDEXING {mode: 'manual'};
```

- **automatic**: when a write gives a label a property it has not had, its first value decides. A string of up to 256 characters, a number or a boolean gets a property index (equality, ranges, prefixes); a longer string gets a full-text index; lists, maps and nulls get none. At most 32 automatic indexes per label.
- **manual**: none; indexes come from [`CREATE INDEX`](./indexes.md).
- **hybrid**: automatic, with rules first, in this order: a rule for the label and property, an exclusion (`exclude`), a rule for the property in any label (`properties`), then the automatic decision. A rule is a list of `exact`, `range`, `fulltext` or `none`.

A server's new namespaces are automatic unless told otherwise (`[indexing] mode` in its settings). Automatic indexes are ordinary indexes named `auto_Label_property`: `SHOW INDEXES` shows them with `origin` `auto` and how many reads used each (`uses`); drop one and it is not made again. Changing a policy builds nothing for the data already stored: `grafeno storage apply --indexing automatic` does ([Storage and migrations](../operations/storage.md)).

## Work in a namespace

In the console, `\use name` switches namespace, and `grafeno shell -n name` starts in one. Over HTTP the namespace is part of the address: `POST /v1/crm/query`.

## Set up a namespace from a script

A file of statements, kept with an application's code, can create its namespace, indexes, constraints and first data:

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

Because each line uses `IF NOT EXISTS` or `MERGE`, running the script again changes nothing. See [Scripts](../guides/scripts.md).

:::tip Who may do what
Creating a namespace needs the right to create it; changing its comment needs `schema` on it; dropping it needs `drop`. See [Access](../guides/access.md).
:::
