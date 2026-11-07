---
title: API HTTP
description: Usa Grafeno desde cualquier lenguaje por HTTP con JSON — crea nodos y hechos, consulta, busca, recall, lotes.
sidebar_position: 4
---

# API HTTP

Todo lo que hace Grafeno está disponible por HTTP con JSON, así que cualquier lenguaje puede usarlo. Los ejemplos usan `curl`; primero guarda tu token (ve [Tu token](../get-started/install.md#your-token)):

```bash
export TOKEN="$(sudo grafeno config token)"
```

Las rutas están bajo `/v1`, la mayoría por namespace (`/v1/{namespace}/…`). Cada solicitud necesita `Authorization: Bearer <secreto>`: el token, una clave de API o el token de acceso de una sesión.

## ¿Qué servidor es este?

`GET /v1/about` es público. Dice la versión del motor, la versión de la API y lo que el motor puede hacer — consúltalo primero cuando tu programa pueda encontrarse con versiones distintas:

```bash
curl http://127.0.0.1:7810/v1/about
```

```json
{"product": "grafeno", "version": "0.1.0", "api": {"version": 1, "supported": [1]},
 "capabilities": ["namespaces", "nodes", "edges", "facts", "search.text", "…"],
 "auth": {"token": true, "accounts": false, "open": false, "password_sign_in": true}}
```

## Crea nodos y hechos

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/nodes \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"labels": ["Person"], "props": {"name": "Ana Torres"}, "text": "Ana leads the robotics team at Acme."}'
```

```json
{"id": "01a1b68c-2e7b-758b-8caf-3814e0959a92", "created": true}
```

Un hecho une dos nodos por sus ids, con su tiempo válido:

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/edges \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"from": "<id de Ana>", "label": "works_at", "to": "<id de Acme>", "valid_from": "2021-03-01"}'
```

¿Quieres tus propios ids — por ejemplo, los que ya tiene tu aplicación? `PUT /v1/demo/nodes/{id}` crea el nodo con ese id, o lo actualiza si existe, así enviarlo dos veces nunca lo duplica.

## Consulta con GQ

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/query \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"query": "MATCH (p:Person)-[w:works_at]->(c) RETURN p.name, c.name, date(w.@valid_from) AS since"}'
```

```json
{"columns": ["p.name", "c.name", "since"],
 "rows": [["Ana Torres", "Acme Robotics", "2021-03-01"]],
 "stats": {"nodes_created": 0, "edges_created": 0, "…": 0}}
```

Pasa los valores como **parámetros**, nunca pegándolos en el texto de la consulta:

```json
{"query": "MATCH (p:Person {name: $name}) RETURN p.name", "params": {"name": "Ana Torres"}}
```

## Búsqueda, recall y contexto

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/search/text \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"query": "robotics team", "limit": 5}'
```

```json
[{"node": "01a1b68c-2e7b-758b-8caf-3814e0959a92", "score": 0.575}]
```

`/recall` combina texto, vectores y el grafo; `/context` empaqueta el resultado en un presupuesto de tokens para un modelo — ve [Búsqueda y recall](../concepts/search-and-recall.md).

## Varias escrituras, todas o ninguna

Un lote confirma todas sus operaciones o ninguna. Un `ref` nombra un nodo creado antes en el mismo lote:

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/batch \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"ops": [
        {"op": "create_node", "ref": "$n", "node": {"labels": ["Note"], "props": {"title": "Kickoff"}, "text": "Kickoff meeting notes."}},
        {"op": "create_edge", "edge": {"from": "$n", "label": "about", "to": "<id de Acme>"}}
      ]}'
```

```json
{"results": [{"created": true, "id": "01a1b68c-…"}, {"id": "01a1b68c-…"}], "refs": {"$n": "01a1b68c-…"}}
```

## Errores

Los errores vuelven como JSON con un estado HTTP y un código:

```json
{"error": {"code": "unauthorized", "message": "…"}}
```

| Estado | Cuándo |
| --- | --- |
| 400 | la solicitud o la consulta están mal formadas |
| 401 | sin secreto, o uno equivocado |
| 403 | a la cuenta le falta un privilegio (el mensaje lo nombra) |
| 404 | no existe ese namespace, nodo o ruta |
| 409 | un conflicto (un nombre que ya existe, una fusión rechazada) |
| 421 | en un clúster, este miembro no es el líder y todavía no conoce a ninguno: reintenta |
| 503 | ocupado (demasiadas solicitudes o escrituras en espera): reintenta tras `Retry-After` |

## Rutas principales

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/health` | si está activo (público) |
| `GET` | `/v1/about` | versión, versión de la API, capacidades (público) |
| `GET`, `POST` | `/v1/namespaces` | lista los namespaces, crea uno |
| `POST` | `/v1/{ns}/query` | ejecuta GQ |
| `GET`, `POST` | `/v1/{ns}/nodes` | lista nodos, crea uno |
| `GET`, `PUT`, `PATCH`, `DELETE` | `/v1/{ns}/nodes/{id}` | lee, crea o reemplaza, cambia, borra un nodo |
| `GET`, `POST` | `/v1/{ns}/edges` | lista hechos, crea uno |
| `POST` | `/v1/{ns}/edges/{id}/invalidate`, `/retract` | termina un hecho, o lo retracta |
| `POST` | `/v1/{ns}/batch` | varias escrituras en una transacción |
| `POST` | `/v1/{ns}/search/text`, `/search/vector` | búsqueda de texto o vectorial |
| `POST` | `/v1/{ns}/recall`, `/context` | recall híbrido; contexto para un modelo |
| `POST` | `/v1/{ns}/k-hop`, `/path` | vecinos a k pasos; un camino más corto |
| `GET` | `/v1/{ns}/changes` | el registro de cambios, por páginas o en vivo |
| `POST` | `/v1/{ns}/ingest` | líneas NDJSON con claves, escritas una vez |
| `GET` | `/v1/backup` | un respaldo de toda la base |

El [README del servidor](https://github.com/grafenodb/grafeno/blob/main/crates/grafeno-server/README.md#http-api) del motor lista todas las rutas, con su cuerpo y su respuesta.

Para JavaScript y TypeScript, el [cliente TypeScript](../clients/typescript.md) envuelve todo esto, y maneja por ti las sesiones, los errores y el cambio de miembro en un clúster.
