---
title: Índices
description: Acelera las búsquedas por propiedad con índices de una o varias propiedades, sobre aristas y sobre varias etiquetas, y ve cuándo los usa el planificador.
---

# Índices

Sin un índice, encontrar nodos `Person` por `email` lee cada `Person`. Un **índice** sobre la etiqueta y la propiedad va directo a los nodos que calzan. Grafeno mantiene cada índice al día en la misma transacción que la escritura.

## Sintaxis

```text
CREATE INDEX [nombre] [IF NOT EXISTS] FOR (n:Etiqueta) ON (n.clave [, n.otra …])
CREATE INDEX [nombre] FOR ()-[r:ETIQUETA]-() ON (r.clave)
CREATE INDEX [nombre] FOR (n:Etiqueta|Otra) ON (n.clave)
SHOW INDEXES
DROP INDEX nombre [IF EXISTS]
```

## Los datos de ejemplo

```text run title="Ejemplo"
UNWIND range(1, 2000) AS i
CREATE (:Person {id: i, name: 'person ' + toString(i), age: 18 + i % 60,
                 city: CASE i % 4 WHEN 0 THEN 'Lima' WHEN 1 THEN 'Quito' WHEN 2 THEN 'Bogotá' ELSE 'Cusco' END});
```

```text result title="Resultado"
2000 nodes created
```

## Sin índice

`EXPLAIN` muestra el plan sin ejecutarlo. Aquí debe recorrer todos los `Person`:

```text run title="Ejemplo"
EXPLAIN MATCH (p:Person {id: 1234}) RETURN p.name;
```

```text result title="Resultado"
 step | operation | details                                                | rows   | cost
------+-----------+--------------------------------------------------------+--------+--------
 1    | MATCH     | start at (p:Person {id}) (scan of :Person, 2000 nodes) | 2000.0 | 2000.0
 2    | RETURN    | p.name                                                 | 2000.0 | 8000.0
(2 rows)
```

## Crear un índice

Sin nombre, Grafeno lo llama `Etiqueta_propiedad`:

```text run title="Ejemplo"
CREATE INDEX FOR (p:Person) ON (p.id);
EXPLAIN MATCH (p:Person {id: 1234}) RETURN p.name;
```

```text result title="Resultado"
 name      | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-----------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_id | Person | id       | false  | 2000    | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+------
 1    | MATCH     | start at (p:Person {id}) (index Person_id: id = …, ~1 nodes) | 1.0  | 1.0
 2    | RETURN    | p.name                                                       | 1.0  | 4.0
(2 rows)
```

Ahora el plan parte del índice y espera un nodo.

## Varias propiedades

Un índice sobre `(city, age)` sirve para `city = …` y para `city = … AND age …`, pero no para `age` sola: las propiedades se usan en orden:

```text run title="Ejemplo"
CREATE INDEX by_city_age FOR (p:Person) ON (p.city, p.age);
EXPLAIN MATCH (p:Person) WHERE p.city = 'Lima' AND p.age < 20 RETURN p.name;
```

```text result title="Resultado"
 name        | label  | property  | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+-----------+--------+---------+-------+-------+-------+-------+--------
 by_city_age | Person | city, age | false  | 2000    | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows | cost
------+-----------+--------------------------------------------------------------+------+--------
 1    | MATCH     | start at (p:Person) (index by_city_age: city = …, age < …, … | 31.0 | 1250.0
 2    | RETURN    | p.name                                                       | 31.0 | 1344.0
(2 rows)
```

## Qué sirve un índice

Igualdad, `IN`, `STARTS WITH` y rangos (`<`, `<=`, `>`, `>=`):

```text run title="Ejemplo"
CREATE INDEX FOR (p:Person) ON (p.age);
EXPLAIN MATCH (p:Person) WHERE p.age >= 70 RETURN count(p);
```

```text result title="Resultado"
 name       | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_age | Person | age      | false  | 2000    | false | nodes | false | value | online
(1 row)
 step | operation | details                                                      | rows  | cost
------+-----------+--------------------------------------------------------------+-------+--------
 1    | MATCH     | start at (p:Person) (index Person_age: … <= age, ~266 nodes… | 133.0 | 1328.0
 2    | RETURN    | count(p); aggregates                                         | 1.0   | 1727.0
(2 rows)
```

```text run title="Ejemplo"
MATCH (p:Person) WHERE p.age >= 76 RETURN p.age, count(*) AS people ORDER BY p.age;
```

```text result title="Resultado"
 p.age | people
-------+--------
 76    | 33
 77    | 33
(2 rows)
```

## Índices sobre aristas

```text run title="Ejemplo"
MATCH (a:Person {id: 1}), (b:Person {id: 2}), (c:Person {id: 3})
CREATE (a)-[:rated {stars: 5}]->(b), (a)-[:rated {stars: 2}]->(c);
CREATE INDEX FOR ()-[r:rated]-() ON (r.stars);
MATCH (a)-[r:rated {stars: 5}]->(b) RETURN a.id, b.id, r.stars;
```

```text result title="Resultado"
2 edges created
 name        | label | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------+-------+----------+--------+---------+-------+-------+-------+-------+--------
 rated_stars | rated | stars    | false  | 2       | false | edges | false | value | online
(1 row)
 a.id | b.id | r.stars
------+------+---------
 1    | 2    | 5
(1 row)
```

## Listar y borrar

```text run title="Ejemplo"
SHOW INDEXES;
```

```text result title="Resultado"
 name        | label  | property  | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+-----------+--------+---------+-------+-------+-------+-------+--------
 Person_age  | Person | age       | false  | 2000    | false | nodes | false | value | online
 Person_id   | Person | id        | false  | 2000    | false | nodes | false | value | online
 by_city_age | Person | city, age | false  | 2000    | false | nodes | false | value | online
 rated_stars | rated  | stars     | false  | 2       | false | edges | false | value | online
(4 rows)
```

```text run title="Ejemplo"
DROP INDEX by_city_age;
DROP INDEX by_city_age IF EXISTS;
```

```text result title="Resultado"
 name        | label  | property  | unique | entries | fuzzy | on    | key   | kind  | state
-------------+--------+-----------+--------+---------+-------+-------+-------+-------+--------
 by_city_age | Person | city, age | false  | 0       | false | nodes | false | value | online
(1 row)
 name | label | property | unique | entries | fuzzy | on | key | kind | state
------+-------+----------+--------+---------+-------+----+-----+------+-------
(0 rows)
```

## Valores únicos

Una **restricción de unicidad** es un índice que rechaza un segundo nodo con el mismo valor. Ver [Restricciones](constraints.md):

```text run title="Ejemplo"
CREATE CONSTRAINT FOR (p:Person) REQUIRE p.name IS UNIQUE;
CREATE (:Person {name: 'person 7'});
```

```text result title="Resultado"
 name               | kind   | label  | property | rule | on    | entries
--------------------+--------+--------+----------+------+-------+---------
 Person_name_unique | unique | Person | name     | null | nodes | 2000
(1 row)
error: invalid input: name must be unique among :Person(name): node 01a1cb1f-4b53-778e-93c1-19eea3005e3b already has "person 7"
```

:::tip Bueno saber
- Un índice guarda números, textos y booleanos. Las listas, los mapas y `null` no se indexan.
- Los números se comparan como números: un índice sobre `id` encuentra `7.0` cuando buscas `7`.
- El planificador elige el inicio más barato de cada patrón con estadísticas que guarda en memoria. `CALL db.analyze()` las muestra.
- La búsqueda de texto tiene sus propios [índices de texto completo](full-text.md), los nombres parecidos [índices difusos](similar-text.md#índices-difusos), y los vectores [índices vectoriales](../vectors/vector-indexes.md).
:::
