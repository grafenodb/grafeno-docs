---
title: Transacciones
description: Haz de varias sentencias una transacción con BEGIN, COMMIT y ROLLBACK, y lee una sola instantánea con BEGIN READ ONLY.
---

# Transacciones

Cada sentencia ya es una transacción: o se aplican todos sus cambios o ninguno. Para que **varias** sentencias tengan éxito o fallen juntas, ponlas entre `BEGIN` y `COMMIT`.

## Sintaxis

```text
BEGIN [READ ONLY];
sentencia; sentencia; …
COMMIT;      // conservar todo
ROLLBACK;    // deshacer todo
```

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (:Account {id: 'a', balance: 500}), (:Account {id: 'b', balance: 100});
```

```text result title="Resultado"
2 nodes created
```

## Confirmar

Mueve 100 de `a` a `b`. Ambos cambios se ven juntos al hacer `COMMIT`; hasta entonces nadie más ve ninguno:

```text run title="Ejemplo"
BEGIN;
MATCH (a:Account {id: 'a'}) SET a.balance = a.balance - 100;
MATCH (b:Account {id: 'b'}) SET b.balance = b.balance + 100;
COMMIT;
MATCH (x:Account) RETURN x.id, x.balance ORDER BY x.id;
```

```text result title="Resultado"
BEGIN
1 property set
1 property set
COMMIT
 x.id | x.balance
------+-----------
 a    | 400
 b    | 200
(2 rows)
```

## Deshacer

`ROLLBACK` deshace todo desde `BEGIN`:

```text run title="Ejemplo"
BEGIN;
MATCH (a:Account {id: 'a'}) SET a.balance = 0;
MATCH (a:Account {id: 'a'}) RETURN a.balance AS inside;
ROLLBACK;
MATCH (a:Account {id: 'a'}) RETURN a.balance AS after;
```

```text result title="Resultado"
BEGIN
1 property set
 inside
--------
 0
(1 row)
ROLLBACK
 after
-------
 400
(1 row)
```

Dentro de la transacción se ven sus propios cambios; después del rollback ya no están.

## Una sentencia que falla

Si una sentencia de una transacción falla, la transacción solo puede deshacerse: la sentencia fallida pudo haber escrito parte de su trabajo.

```text run title="Ejemplo"
CREATE CONSTRAINT FOR (x:Account) REQUIRE x.id IS UNIQUE;
BEGIN;
MATCH (a:Account {id: 'a'}) SET a.balance = a.balance - 50;
CREATE (:Account {id: 'b', balance: 0});
ROLLBACK;
MATCH (x:Account) RETURN x.id, x.balance ORDER BY x.id;
```

```text result title="Resultado"
 name              | kind   | label   | property | rule | on    | entries
-------------------+--------+---------+----------+------+-------+---------
 Account_id_unique | unique | Account | id       | null | nodes | 2
(1 row)
BEGIN
1 property set
error: invalid input: id must be unique among :Account(id): node 01a1cb1f-5051-7755-8266-b45ddfa6328a already has "b"
ROLLBACK
 x.id | x.balance
------+-----------
 a    | 400
 b    | 200
(2 rows)
```

## Solo lectura

`BEGIN READ ONLY` lee una sola instantánea de principio a fin: no ve las escrituras de otros en medio, así que varias lecturas coinciden entre sí.

```text run title="Ejemplo"
BEGIN READ ONLY;
MATCH (x:Account) RETURN sum(x.balance) AS total;
MATCH (x:Account) RETURN count(x) AS accounts;
COMMIT;
```

```text result title="Resultado"
BEGIN
 total
-------
 600
(1 row)
 accounts
----------
 2
(1 row)
COMMIT
```

## Por HTTP

Los clientes que no son la consola abren una transacción con `POST /v1/{ns}/transactions`, envían sentencias a `/v1/{ns}/transactions/{id}/query` y terminan con `/commit` o `/rollback`. El cliente de TypeScript lo envuelve:

```ts
await ns.transaction(async (tx) => {
  await tx.query("MATCH (a:Account {id: 'a'}) SET a.balance = a.balance - 100");
  await tx.query("MATCH (b:Account {id: 'b'}) SET b.balance = b.balance + 100");
}); // se confirma cuando la función termina, se deshace si lanza un error
```

:::tip Bueno saber
- Una transacción que escribe ocupa al escritor mientras está abierta: las escrituras van de una en una, así que las transacciones son serializables. Mantenlas cortas; un servidor deshace una que queda inactiva demasiado tiempo (`[transactions]` en la configuración).
- `BEGIN`, `COMMIT` y `ROLLBACK` enviados a `POST /v1/{ns}/query` se rechazan: esa ruta ejecuta una sentencia como una transacción.
:::
