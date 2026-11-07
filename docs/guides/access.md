---
title: Users, roles and permissions
description: Accounts that sign in, roles with grants and denials, rights down to labels, properties and records, API keys and the audit log.
sidebar_position: 3
---

# Users, roles and permissions

Grafeno has role-based access control, as most databases do: **accounts** sign in, **roles** bundle **privileges**, and privileges reach down to labels, properties and records. Everything here works from the console, from Grafeno Studio's **Scripts** and **Access** views, and over HTTP.

## Who can do what, out of the box

- The **token** in the settings file is the server's owner: it can do everything. Keep it for emergencies and setup.
- The **first administrator** you created when installing (a *superuser*) can also do everything, and signs in with a password.
- A server with neither a token nor accounts is **open** to anyone who reaches it — fine on your own machine, never on a network.

Run the statements below as the administrator or with the token, for example from `grafeno shell --config …`.

## Create a user

```cypher
CREATE USER ana SET PASSWORD 'correct-horse-battery';
```

Passwords need 12 characters or more. A user with no role can sign in but sees nothing yet.

## Give rights through a role

A role is a named set of privileges. Give it what a kind of person needs, then give the role to people:

```cypher
CREATE ROLE note_taker SET DESCRIPTION 'writes notes';
GRANT editor ON NAMESPACE notes TO note_taker;
GRANT ROLE note_taker TO ana;
```

```cypher
SHOW PRIVILEGES FOR ana;
```

```text
 source     | access | privilege | on
------------+--------+-----------+-----------------
 note_taker | grant  | editor    | namespace notes
(1 row)
```

`reader`, `editor` and `admin` are ready-made levels; single privileges are finer (`read`, `create`, `update`, `delete`, `schema`, `export`, `algorithms`, …). `SHOW PRIVILEGES` lists them all.

## Sign in as the user

```bash
grafeno shell --url http://127.0.0.1:7810 --user ana --namespace notes
```

The console asks for the password. Ana can write notes:

```cypher
CREATE (:Note {title: 'mine'});
```

```text
1 node created
```

But another namespace is closed to her:

```text
error: the account "ana" has no `read` privilege on the namespace "crm" (HTTP 403)
```

In Grafeno Studio, users sign in on the connect screen; over HTTP, with `POST /v1/auth/signin` (`{"name": "ana", "password": "…"}`), which returns a session (an access token that renews itself with a refresh token).

## Deny, and narrow down

A denial always wins over a grant, so you can give broadly and take back precisely:

```cypher
CREATE ROLE analyst;
GRANT read ON NAMESPACE 'team-*' TO analyst;          // every team-… namespace
DENY read ON NAMESPACE 'team-secret' TO analyst;      // but this one
```

Rights reach inside a namespace. What a user may not read is **absent** from every answer — counts, searches, paths, exports — as if it did not exist:

```cypher
GRANT read ON NODES Person IN crm TO analyst;           // only Person nodes
DENY read ON PROPERTY Person.email IN crm TO analyst;   // without their email
```

**Record policies** keep each account to the records that match a condition. With one tenant per customer:

```cypher
RESTRICT analyst ON NAMESPACE crm NODES Customer WHERE tenant = $account.tenant;
ALTER USER ana SET ATTRIBUTE tenant = 'acme';
```

Now Ana sees only Acme's customers, everywhere.

## Applications and agents: service accounts and keys

Programs should not use a person's password. Give each one an **API key**, which belongs to a **service account** (an account with no password):

```bash
grafeno keys create indexer --grant "team-*:write" --config /etc/grafeno/grafeno.toml
```

```text
  gfk_ba0fb6369a0657a6c43ff19adb763153e526f0bf

Clients send it as `Authorization: Bearer gfk_ba0fb6369a0657a6c43ff19adb763153e526f0bf`.
```

That made the service account `indexer`, allowed to write every `team-…` namespace, and printed its key — once: keep it in your program's secrets. Roles work for service accounts too (`GRANT ROLE analyst TO indexer`), and `CREATE SERVICE ACCOUNT name` makes one in GQ. Users can make their own keys too, scoped down to some namespaces or to reading, from the Studio or `POST /v1/keys`.

## Manage accounts

```cypher
SHOW USERS;
ALTER USER ana SET STATUS SUSPENDED;      // or ACTIVE; ends her sessions
ALTER USER ana SET EXPIRES '2027-01-01';  // null: never
ALTER USER ana SET PASSWORD 'a-new-long-password';
REVOKE ROLE note_taker FROM ana;
DROP USER ana;
```

Failed sign-ins lock an account for a while (`[auth]` in the [settings](../reference/configuration.md) sets how many and how long).

## The audit log

Every security event is recorded: sign-ins and failures, lockouts, keys, sessions, changes to accounts and roles, refused requests. An account with the `audit` privilege reads it:

```cypher
CALL db.audit(0, 1000) YIELD seq, at, kind, account, target, outcome
WHERE kind IN ['signin_failed', 'lockout', 'refused']
RETURN seq, at, kind, account, target ORDER BY seq DESC LIMIT 20;
```

Over HTTP, `GET /v1/audit` (`?format=jsonl` to keep a copy elsewhere).
