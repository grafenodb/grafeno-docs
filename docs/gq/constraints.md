---
title: Constraints
description: Rules the data must follow — required properties, types, unique values and keys — and rules for facts that cannot both be true.
---

# Constraints

A constraint is a rule Grafeno checks on every write. A write that breaks it fails and changes nothing, so the data always follows the rule.

## Syntax

```text
CREATE CONSTRAINT [name] [IF NOT EXISTS] FOR (n:Label) REQUIRE n.key IS NOT NULL
CREATE CONSTRAINT [name] FOR (n:Label) REQUIRE n.key IS :: INTEGER
CREATE CONSTRAINT [name] FOR (n:Label) REQUIRE n.key IS UNIQUE
CREATE CONSTRAINT [name] FOR (n:Label) REQUIRE (n.a, n.b) IS KEY
CREATE CONSTRAINT [name] FOR ()-[r:LABEL]->() REQUIRE ONE PER SOURCE
SHOW CONSTRAINTS
DROP CONSTRAINT name [IF EXISTS]
```

## Required: IS NOT NULL

Every `User` must have an `email`:

```text run title="Example"
CREATE CONSTRAINT FOR (u:User) REQUIRE u.email IS NOT NULL;
CREATE (:User {name: 'Ana', email: 'ana@example.org'});
CREATE (:User {name: 'Bruno'});
```

```text result title="Result"
 name                | kind     | label | property | rule              | on    | contradictions
---------------------+----------+-------+----------+-------------------+-------+----------------
 User_email_not_null | not_null | User  | email    | present, not null | nodes | 0
(1 row)
1 node created
error: invalid input: User_email_not_null: node 01a1cb1f-39c2-757d-854d-72e16a874c22 has no email
```

## Types: IS :: TYPE

When set, `age` must be an integer. The types are `BOOLEAN`, `INTEGER`, `FLOAT`, `STRING`, `LIST`, `MAP` and `DATETIME`:

```text run title="Example"
CREATE CONSTRAINT FOR (u:User) REQUIRE u.age IS :: INTEGER;
CREATE (:User {name: 'Carla', email: 'carla@example.org', age: 45});
CREATE (:User {name: 'Diego', email: 'diego@example.org', age: 'forty'});
```

```text result title="Result"
 name             | kind | label | property | rule       | on    | contradictions
------------------+------+-------+----------+------------+-------+----------------
 User_age_integer | type | User  | age      | :: INTEGER | nodes | 0
(1 row)
1 node created
error: invalid input: User_age_integer: node 01a1cb1f-39ca-7142-be0e-19ff7e79b457 has age = "forty", not of type INTEGER
```

## Unique values

```text run title="Example"
CREATE CONSTRAINT FOR (u:User) REQUIRE u.email IS UNIQUE;
CREATE (:User {name: 'Ana again', email: 'ana@example.org'});
```

```text result title="Result"
 name              | kind   | label | property | rule | on    | entries
-------------------+--------+-------+----------+------+-------+---------
 User_email_unique | unique | User  | email    | null | nodes | 2
(1 row)
error: invalid input: email must be unique among :User(email): node 01a1cb1f-39bf-734d-84d6-de6222a5f492 already has "ana@example.org"
```

Unique over several properties: no two books share both `isbn` and `edition`:

```text run title="Example"
CREATE CONSTRAINT FOR (b:Book) REQUIRE (b.isbn, b.edition) IS UNIQUE;
CREATE (:Book {isbn: '978-1', edition: 1}), (:Book {isbn: '978-1', edition: 2});
CREATE (:Book {isbn: '978-1', edition: 1});
```

```text result title="Result"
 name                     | kind   | label | property      | rule | on    | entries
--------------------------+--------+-------+---------------+------+-------+---------
 Book_isbn_edition_unique | unique | Book  | isbn, edition | null | nodes | 0
(1 row)
2 nodes created
error: invalid input: isbn, edition must be unique among :Book(isbn, edition): node 01a1cb1f-39d3-768d-b656-0db16f8c01ff already has ("978-1", 1)
```

## Keys

`IS KEY` is unique **and** required: every node of the label has the properties:

```text run title="Example"
CREATE CONSTRAINT country_key FOR (c:Country) REQUIRE c.code IS KEY;
CREATE (:Country {code: 'PE', name: 'Peru'});
CREATE (:Country {name: 'Nowhere'});
```

```text result title="Result"
 name        | kind | label   | property | rule                        | on    | entries
-------------+------+---------+----------+-----------------------------+-------+---------
 country_key | key  | Country | code     | present and unique together | nodes | 0
(1 row)
1 node created
error: invalid input: country_key: node 01a1cb1f-39dd-70d0-ad20-e2a18d147d6c has no code ((code) is a key of :Country(code): each needs a boolean, a number or a string)
```

## Existing data is checked

Declaring a rule that the data already breaks fails, and names the first records that break it:

```text run title="Example"
CREATE (:Item {sku: 'A'}), (:Item {sku: 'A'});
CREATE CONSTRAINT FOR (i:Item) REQUIRE i.sku IS UNIQUE;
```

```text result title="Result"
2 nodes created
error: invalid input: cannot make :Item(sku) unique: nodes 01a1cb1f-39e0-7678-bbe4-16805247af2c and 01a1cb1f-39e0-7679-bcd2-1411fba7568b both have "A"
```

## Rules for facts

Some facts cannot both be true at once: a person works at one company at a time. An **edge constraint** says so. By default (`ON CONFLICT INVALIDATE`), a new fact **ends** the one it contradicts instead of failing, so history is kept:

```text run title="Example"
CREATE CONSTRAINT FOR ()-[r:works_at]->() REQUIRE ONE PER SOURCE;
CREATE (ana:Person {name: 'Ana'}), (acme:Company {name: 'Acme'}), (orbit:Company {name: 'Orbit'}),
       (ana)-[:works_at {@valid_from: '2019-01-01'}]->(acme);
MATCH (ana:Person {name: 'Ana'}), (orbit:Company {name: 'Orbit'})
CREATE (ana)-[:works_at {@valid_from: '2024-03-01'}]->(orbit);
MATCH (:Person {name: 'Ana'})-[w:works_at]->(c)
RETURN c.name, date(w.@valid_from) AS from, date(w.@valid_to) AS to ORDER BY from;
```

```text result title="Result"
 name                    | kind | label    | property | rule                                   | on    | contradictions
-------------------------+------+----------+----------+----------------------------------------+-------+----------------
 works_at_one_per_source | edge | works_at | null     | one per source, on conflict invalidate | edges | 0
(1 row)
3 nodes created, 1 edge created
1 edge created
 c.name | from       | to
--------+------------+------------
 Acme   | 2019-01-01 | 2024-03-01
 Orbit  | 2024-03-01 | null
(2 rows)
```

| Rule | One current fact per |
| --- | --- |
| `ONE PER SOURCE` | node it starts from |
| `ONE PER TARGET` | node it ends at |
| `ONE PER PAIR` | pair of nodes |

| `ON CONFLICT` | What happens to a contradicting fact |
| --- | --- |
| `INVALIDATE` (default) | the old fact ends where the new one starts |
| `FLAG` | both are kept, and the contradiction is recorded |
| `REJECT` | the new write fails |

```text run title="Example"
CREATE CONSTRAINT seat FOR ()-[r:sits_in]->() REQUIRE ONE PER TARGET ON CONFLICT REJECT;
CREATE (a:Person {name: 'Bea'}), (b:Person {name: 'Ciro'}), (s:Seat {code: '1A'}),
       (a)-[:sits_in]->(s);
MATCH (b:Person {name: 'Ciro'}), (s:Seat {code: '1A'}) CREATE (b)-[:sits_in]->(s);
```

```text result title="Result"
 name | kind | label   | property | rule                               | on    | contradictions
------+------+---------+----------+------------------------------------+-------+----------------
 seat | edge | sits_in | null     | one per target, on conflict reject | edges | 0
(1 row)
3 nodes created, 1 edge created
error: conflict: seat: 01a1cb1f-39f2-777c-9354-a05a4c23c9d2 already has a current sits_in fact (01a1cb1f-39f2-777d-b8f4-e66db2b2e4e2)
```

## List and drop

```text run title="Example"
SHOW CONSTRAINTS;
```

```text result title="Result"
 name                     | kind     | label    | property      | rule                                   | on
--------------------------+----------+----------+---------------+----------------------------------------+-------
 Book_isbn_edition_unique | unique   | Book     | isbn, edition | null                                   | nodes
 User_email_unique        | unique   | User     | email         | null                                   | nodes
 country_key              | key      | Country  | code          | present and unique together            | nodes
 User_age_integer         | type     | User     | age           | :: INTEGER                             | nodes
 User_email_not_null      | not_null | User     | email         | present, not null                      | nodes
 seat                     | edge     | sits_in  | null          | one per target, on conflict reject     | edges
 works_at_one_per_source  | edge     | works_at | null          | one per source, on conflict invalidate | edges
(7 rows)
```

```text run title="Example"
DROP CONSTRAINT country_key;
DROP CONSTRAINT country_key IF EXISTS;
```

```text result title="Result"
 name        | kind | label   | property | rule                        | on
-------------+------+---------+----------+-----------------------------+-------
 country_key | key  | Country | code     | present and unique together | nodes
(1 row)
 name | label | property | unique | entries | fuzzy | on | key | kind | state
------+-------+----------+--------+---------+-------+----+-----+------+-------
(0 rows)
```

:::tip Good to know
- Inside one statement, rules are checked at its end, so `MERGE (b:Book {isbn: '7'}) ON CREATE SET b.edition = 1` may create the book and then complete its key.
- Unique and key constraints are indexes too: `SHOW INDEXES` lists them.
- A **functional** property keeps its earlier values (`REQUIRE p.city IS FUNCTIONAL`), see [Time travel](time-travel.md#history-of-a-property).
:::
