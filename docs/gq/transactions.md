---
title: Transactions
description: Make several statements one transaction with BEGIN, COMMIT and ROLLBACK, and read one snapshot with BEGIN READ ONLY.
---

# Transactions

Every statement is already a transaction: all of its changes happen, or none. To make **several** statements succeed or fail together, put them between `BEGIN` and `COMMIT`.

## Syntax

```text
BEGIN [READ ONLY];
statement; statement; …
COMMIT;      // keep everything
ROLLBACK;    // undo everything
```

## The example data

```text run title="Example"
CREATE (:Account {id: 'a', balance: 500}), (:Account {id: 'b', balance: 100});
```

```text result title="Result"
2 nodes created
```

## Commit

Move 100 from `a` to `b`. Both changes become visible together at `COMMIT`; until then, nobody else sees either:

```text run title="Example"
BEGIN;
MATCH (a:Account {id: 'a'}) SET a.balance = a.balance - 100;
MATCH (b:Account {id: 'b'}) SET b.balance = b.balance + 100;
COMMIT;
MATCH (x:Account) RETURN x.id, x.balance ORDER BY x.id;
```

```text result title="Result"
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

## Rollback

`ROLLBACK` undoes everything since `BEGIN`:

```text run title="Example"
BEGIN;
MATCH (a:Account {id: 'a'}) SET a.balance = 0;
MATCH (a:Account {id: 'a'}) RETURN a.balance AS inside;
ROLLBACK;
MATCH (a:Account {id: 'a'}) RETURN a.balance AS after;
```

```text result title="Result"
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

Inside the transaction its own changes are visible; after the rollback they are gone.

## A failed statement

If a statement in a transaction fails, the transaction can only be rolled back: the failed statement may have written part of its work.

```text run title="Example"
CREATE CONSTRAINT FOR (x:Account) REQUIRE x.id IS UNIQUE;
BEGIN;
MATCH (a:Account {id: 'a'}) SET a.balance = a.balance - 50;
CREATE (:Account {id: 'b', balance: 0});
ROLLBACK;
MATCH (x:Account) RETURN x.id, x.balance ORDER BY x.id;
```

```text result title="Result"
 name              | kind   | label   | property | rule | on    | entries
-------------------+--------+---------+----------+------+-------+---------
 Account_id_unique | unique | Account | id       | null | nodes | 2
(1 row)
BEGIN
1 property set
error: invalid input: id must be unique among :Account(id): node 01a1cb1f-4195-7746-81a6-62a8de996401 already has "b"
ROLLBACK
 x.id | x.balance
------+-----------
 a    | 400
 b    | 200
(2 rows)
```

## Read only

`BEGIN READ ONLY` reads one snapshot from start to end: writes by others in between are not seen, so several reads agree with each other.

```text run title="Example"
BEGIN READ ONLY;
MATCH (x:Account) RETURN sum(x.balance) AS total;
MATCH (x:Account) RETURN count(x) AS accounts;
COMMIT;
```

```text result title="Result"
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

## Over HTTP

Clients that are not the console open a transaction with `POST /v1/{ns}/transactions`, send statements to `/v1/{ns}/transactions/{id}/query`, and finish with `/commit` or `/rollback`. The TypeScript client wraps it:

```ts
await ns.transaction(async (tx) => {
  await tx.query("MATCH (a:Account {id: 'a'}) SET a.balance = a.balance - 100");
  await tx.query("MATCH (b:Account {id: 'b'}) SET b.balance = b.balance + 100");
}); // committed when the function returns, rolled back if it throws
```

:::tip Good to know
- A writing transaction holds the writer while it is open: writes happen one at a time, so transactions are serializable. Keep them short; a server rolls back one that stays idle too long (`[transactions]` in the settings).
- `BEGIN`, `COMMIT` and `ROLLBACK` sent to `POST /v1/{ns}/query` are refused: that endpoint runs one statement as one transaction.
:::
