---
title: Usuarios, roles y permisos
description: Cuentas que inician sesión, roles con concesiones y denegaciones, permisos hasta etiquetas, propiedades y registros, claves de API y el registro de auditoría.
sidebar_position: 3
---

# Usuarios, roles y permisos

Grafeno tiene control de acceso basado en roles, como la mayoría de las bases de datos: las **cuentas** inician sesión, los **roles** agrupan **privilegios**, y los privilegios llegan hasta etiquetas, propiedades y registros. Todo esto funciona desde la consola, desde las vistas **Scripts** y **Access** de Grafeno Studio, y por HTTP.

## Quién puede qué, de entrada

- El **token** del archivo de configuración es el dueño del servidor: puede hacerlo todo. Guárdalo para emergencias y para la configuración inicial.
- El **primer administrador** que creaste al instalar (un *superusuario*) también puede hacerlo todo, e inicia sesión con contraseña.
- Un servidor sin token ni cuentas está **abierto** para cualquiera que llegue a él — bien en tu propia máquina, nunca en una red.

Ejecuta las sentencias de abajo como administrador o con el token, por ejemplo desde `grafeno shell --config …`.

## Crea un usuario

```text
CREATE USER ana SET PASSWORD 'correct-horse-battery';
```

Las contraseñas necesitan 12 caracteres o más. Un usuario sin rol puede iniciar sesión, pero todavía no ve nada.

## Da permisos mediante un rol

Un rol es un conjunto de privilegios con nombre. Dale lo que necesita un tipo de persona, y luego dale el rol a las personas:

```text
CREATE ROLE note_taker SET DESCRIPTION 'writes notes';
GRANT editor ON NAMESPACE notes TO note_taker;
GRANT ROLE note_taker TO ana;
```

```text
SHOW PRIVILEGES FOR ana;
```

```text
 source     | access | privilege | on
------------+--------+-----------+-----------------
 note_taker | grant  | editor    | namespace notes
(1 row)
```

`reader`, `editor` y `admin` son niveles ya hechos; los privilegios sueltos son más finos (`read`, `create`, `update`, `delete`, `schema`, `export`, `algorithms`, …). `SHOW PRIVILEGES` los lista todos.

## Inicia sesión como ese usuario

```bash
grafeno shell --url http://127.0.0.1:7810 --user ana --namespace notes
```

La consola pide la contraseña. Ana puede escribir notas:

```text
CREATE (:Note {title: 'mine'});
```

```text
1 node created
```

Pero otro namespace está cerrado para ella:

```text
error: the account "ana" has no `read` privilege on the namespace "crm" (HTTP 403)
```

En Grafeno Studio, los usuarios inician sesión en la pantalla de conexión; por HTTP, con `POST /v1/auth/signin` (`{"name": "ana", "password": "…"}`), que devuelve una sesión (un token de acceso que se renueva solo con un token de refresco).

## Deniega, y acota

Una denegación siempre gana sobre una concesión, así puedes dar en general y quitar con precisión:

```text
CREATE ROLE analyst;
GRANT read ON NAMESPACE 'team-*' TO analyst;          // todos los namespaces team-…
DENY read ON NAMESPACE 'team-secret' TO analyst;      // menos este
```

Los permisos llegan dentro de un namespace. Lo que un usuario no puede leer está **ausente** de toda respuesta — conteos, búsquedas, caminos, exportaciones — como si no existiera:

```text
GRANT read ON NODES Person IN crm TO analyst;           // solo los nodos Person
DENY read ON PROPERTY Person.email IN crm TO analyst;   // sin su email
```

Las **políticas de registros** limitan cada cuenta a los registros que cumplen una condición. Con un inquilino por cliente:

```text
RESTRICT analyst ON NAMESPACE crm NODES Customer WHERE tenant = $account.tenant;
ALTER USER ana SET ATTRIBUTE tenant = 'acme';
```

Ahora Ana ve solo los clientes de Acme, en todas partes.

## Aplicaciones y agentes: cuentas de servicio y claves

Los programas no deberían usar la contraseña de una persona. Dale a cada uno una **clave de API**, que pertenece a una **cuenta de servicio** (una cuenta sin contraseña):

```bash
grafeno keys create indexer --grant "team-*:write" --config /etc/grafeno/grafeno.toml
```

```text
  gfk_ba0fb6369a0657a6c43ff19adb763153e526f0bf

Clients send it as `Authorization: Bearer gfk_ba0fb6369a0657a6c43ff19adb763153e526f0bf`.
```

Eso creó la cuenta de servicio `indexer`, con permiso para escribir en todos los namespaces `team-…`, y mostró su clave — una sola vez: guárdala en los secretos de tu programa. Los roles también sirven para cuentas de servicio (`GRANT ROLE analyst TO indexer`), y `CREATE SERVICE ACCOUNT nombre` crea una en GQ.

Los usuarios también pueden crear sus propias claves, limitadas a algunos namespaces o solo a lectura, desde el Studio o con `POST /v1/keys`.

## Administra las cuentas

```text
SHOW USERS;
ALTER USER ana SET STATUS SUSPENDED;      // o ACTIVE; termina sus sesiones
ALTER USER ana SET EXPIRES '2027-01-01';  // null: nunca
ALTER USER ana SET PASSWORD 'una-contraseña-nueva-larga';
REVOKE ROLE note_taker FROM ana;
DROP USER ana;
```

Los inicios de sesión fallidos bloquean una cuenta por un rato (`[auth]` en la [configuración](../reference/configuration.md) define cuántos y por cuánto).

## El registro de auditoría

Cada evento de seguridad queda registrado: inicios de sesión y sus fallos, bloqueos, claves, sesiones, cambios en cuentas y roles, solicitudes rechazadas. Una cuenta con el privilegio `audit` lo lee:

```text
CALL db.audit(0, 1000) YIELD seq, at, kind, account, target, outcome
WHERE kind IN ['signin_failed', 'lockout', 'refused']
RETURN seq, at, kind, account, target ORDER BY seq DESC LIMIT 20;
```

Por HTTP, `GET /v1/audit` (`?format=jsonl` para guardar una copia en otro lado).
