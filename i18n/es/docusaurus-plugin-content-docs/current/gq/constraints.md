---
title: Restricciones
description: Reglas que los datos deben cumplir — propiedades obligatorias, tipos, valores únicos y claves — y reglas para hechos que no pueden ser ciertos a la vez.
---

# Restricciones

Una restricción es una regla que Grafeno revisa en cada escritura. Una escritura que la rompe falla y no cambia nada, así que los datos siempre cumplen la regla.

## Sintaxis

```text
CREATE CONSTRAINT [nombre] [IF NOT EXISTS] FOR (n:Etiqueta) REQUIRE n.clave IS NOT NULL
CREATE CONSTRAINT [nombre] FOR (n:Etiqueta) REQUIRE n.clave IS :: INTEGER
CREATE CONSTRAINT [nombre] FOR (n:Etiqueta) REQUIRE n.clave IS UNIQUE
CREATE CONSTRAINT [nombre] FOR (n:Etiqueta) REQUIRE (n.a, n.b) IS KEY
CREATE CONSTRAINT [nombre] FOR ()-[r:ETIQUETA]->() REQUIRE ONE PER SOURCE
SHOW CONSTRAINTS
DROP CONSTRAINT nombre [IF EXISTS]
```

## Obligatoria: IS NOT NULL

Todo `User` debe tener `email`:

```text run title="Ejemplo"
CREATE CONSTRAINT FOR (u:User) REQUIRE u.email IS NOT NULL;
CREATE (:User {name: 'Ana', email: 'ana@example.org'});
CREATE (:User {name: 'Bruno'});
```

```text result title="Resultado"
 name                | kind     | label | property | rule              | on    | contradictions
---------------------+----------+-------+----------+-------------------+-------+----------------
 User_email_not_null | not_null | User  | email    | present, not null | nodes | 0
(1 row)
1 node created
error: invalid input: User_email_not_null: node 01a1cb1f-4893-717d-b9be-9b2a65f2f7a5 has no email
```

## Tipos: IS :: TIPO

Cuando existe, `age` debe ser un entero. Los tipos son `BOOLEAN`, `INTEGER`, `FLOAT`, `STRING`, `LIST`, `MAP` y `DATETIME`:

```text run title="Ejemplo"
CREATE CONSTRAINT FOR (u:User) REQUIRE u.age IS :: INTEGER;
CREATE (:User {name: 'Carla', email: 'carla@example.org', age: 45});
CREATE (:User {name: 'Diego', email: 'diego@example.org', age: 'forty'});
```

```text result title="Resultado"
 name             | kind | label | property | rule       | on    | contradictions
------------------+------+-------+----------+------------+-------+----------------
 User_age_integer | type | User  | age      | :: INTEGER | nodes | 0
(1 row)
1 node created
error: invalid input: User_age_integer: node 01a1cb1f-489d-7750-b14d-5d45e04e4069 has age = "forty", not of type INTEGER
```

## Valores únicos

```text run title="Ejemplo"
CREATE CONSTRAINT FOR (u:User) REQUIRE u.email IS UNIQUE;
CREATE (:User {name: 'Ana again', email: 'ana@example.org'});
```

```text result title="Resultado"
 name              | kind   | label | property | rule | on    | entries
-------------------+--------+-------+----------+------+-------+---------
 User_email_unique | unique | User  | email    | null | nodes | 2
(1 row)
error: invalid input: email must be unique among :User(email): node 01a1cb1f-488f-77a5-9fd3-fa12b9921e6b already has "ana@example.org"
```

Único sobre varias propiedades: dos libros no pueden compartir a la vez `isbn` y `edition`:

```text run title="Ejemplo"
CREATE CONSTRAINT FOR (b:Book) REQUIRE (b.isbn, b.edition) IS UNIQUE;
CREATE (:Book {isbn: '978-1', edition: 1}), (:Book {isbn: '978-1', edition: 2});
CREATE (:Book {isbn: '978-1', edition: 1});
```

```text result title="Resultado"
 name                     | kind   | label | property      | rule | on    | entries
--------------------------+--------+-------+---------------+------+-------+---------
 Book_isbn_edition_unique | unique | Book  | isbn, edition | null | nodes | 0
(1 row)
2 nodes created
error: invalid input: isbn, edition must be unique among :Book(isbn, edition): node 01a1cb1f-48a9-70a1-8cab-1c49beb667b1 already has ("978-1", 1)
```

## Claves

`IS KEY` es único **y** obligatorio: todos los nodos de la etiqueta tienen las propiedades:

```text run title="Ejemplo"
CREATE CONSTRAINT country_key FOR (c:Country) REQUIRE c.code IS KEY;
CREATE (:Country {code: 'PE', name: 'Peru'});
CREATE (:Country {name: 'Nowhere'});
```

```text result title="Resultado"
 name        | kind | label   | property | rule                        | on    | entries
-------------+------+---------+----------+-----------------------------+-------+---------
 country_key | key  | Country | code     | present and unique together | nodes | 0
(1 row)
1 node created
error: invalid input: country_key: node 01a1cb1f-48b2-717b-94a5-d45c08c5737f has no code ((code) is a key of :Country(code): each needs a boolean, a number or a string)
```

## Se revisan los datos existentes

Declarar una regla que los datos ya rompen falla, y nombra los primeros registros que la rompen:

```text run title="Ejemplo"
CREATE (:Item {sku: 'A'}), (:Item {sku: 'A'});
CREATE CONSTRAINT FOR (i:Item) REQUIRE i.sku IS UNIQUE;
```

```text result title="Resultado"
2 nodes created
error: invalid input: cannot make :Item(sku) unique: nodes 01a1cb1f-48b5-759c-8abe-37475c846db8 and 01a1cb1f-48b5-759d-839c-5b94e1a5feb1 both have "A"
```

## Reglas para hechos

Algunos hechos no pueden ser ciertos a la vez: una persona trabaja en una empresa a la vez. Una **restricción de aristas** lo dice. Por defecto (`ON CONFLICT INVALIDATE`), un hecho nuevo **termina** al que contradice en lugar de fallar, así que la historia se conserva:

```text run title="Ejemplo"
CREATE CONSTRAINT FOR ()-[r:works_at]->() REQUIRE ONE PER SOURCE;
CREATE (ana:Person {name: 'Ana'}), (acme:Company {name: 'Acme'}), (orbit:Company {name: 'Orbit'}),
       (ana)-[:works_at {@valid_from: '2019-01-01'}]->(acme);
MATCH (ana:Person {name: 'Ana'}), (orbit:Company {name: 'Orbit'})
CREATE (ana)-[:works_at {@valid_from: '2024-03-01'}]->(orbit);
MATCH (:Person {name: 'Ana'})-[w:works_at]->(c)
RETURN c.name, date(w.@valid_from) AS from, date(w.@valid_to) AS to ORDER BY from;
```

```text result title="Resultado"
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

| Regla | Un hecho actual por |
| --- | --- |
| `ONE PER SOURCE` | nodo del que sale |
| `ONE PER TARGET` | nodo al que llega |
| `ONE PER PAIR` | par de nodos |

| `ON CONFLICT` | Qué pasa con un hecho que contradice |
| --- | --- |
| `INVALIDATE` (por defecto) | el hecho anterior termina donde empieza el nuevo |
| `FLAG` | se conservan ambos y se registra la contradicción |
| `REJECT` | la escritura nueva falla |

```text run title="Ejemplo"
CREATE CONSTRAINT seat FOR ()-[r:sits_in]->() REQUIRE ONE PER TARGET ON CONFLICT REJECT;
CREATE (a:Person {name: 'Bea'}), (b:Person {name: 'Ciro'}), (s:Seat {code: '1A'}),
       (a)-[:sits_in]->(s);
MATCH (b:Person {name: 'Ciro'}), (s:Seat {code: '1A'}) CREATE (b)-[:sits_in]->(s);
```

```text result title="Resultado"
 name | kind | label   | property | rule                               | on    | contradictions
------+------+---------+----------+------------------------------------+-------+----------------
 seat | edge | sits_in | null     | one per target, on conflict reject | edges | 0
(1 row)
3 nodes created, 1 edge created
error: conflict: seat: 01a1cb1f-48c6-7577-9ac7-bd803bd69de7 already has a current sits_in fact (01a1cb1f-48c6-7578-b6f9-8f2705339f81)
```

## Listar y borrar

```text run title="Ejemplo"
SHOW CONSTRAINTS;
```

```text result title="Resultado"
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

```text run title="Ejemplo"
DROP CONSTRAINT country_key;
DROP CONSTRAINT country_key IF EXISTS;
```

```text result title="Resultado"
 name        | kind | label   | property | rule                        | on
-------------+------+---------+----------+-----------------------------+-------
 country_key | key  | Country | code     | present and unique together | nodes
(1 row)
 name | label | property | unique | entries | fuzzy | on | key | kind | state
------+-------+----------+--------+---------+-------+----+-----+------+-------
(0 rows)
```

:::tip Bueno saber
- Dentro de una sentencia, las reglas se revisan al final, así que `MERGE (b:Book {isbn: '7'}) ON CREATE SET b.edition = 1` puede crear el libro y luego completar su clave.
- Las restricciones de unicidad y de clave también son índices: `SHOW INDEXES` las lista.
- Una propiedad **funcional** guarda sus valores anteriores (`REQUIRE p.city IS FUNCTIONAL`), ver [Viaje en el tiempo](time-travel.md#historia-de-una-propiedad).
:::
