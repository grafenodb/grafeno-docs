---
title: HTTP API
description: Use Grafeno from any language over JSON HTTP — create nodes and facts, query, search, recall, batches.
sidebar_position: 4
---

# HTTP API

Everything Grafeno does is available over JSON HTTP, so any language can use it. The examples use `curl`; set your token first (see [Your token](../get-started/install.md#your-token)):

```bash
export TOKEN="$(sudo grafeno config token)"
```

Routes live under `/v1`, most of them per namespace (`/v1/{namespace}/…`). Every request needs `Authorization: Bearer <secret>`: the token, an API key, or a session's access token.

## What is this server?

`GET /v1/about` is public. It says the engine's version, the API version and what the engine can do — check it first when your program may meet different versions:

```bash
curl http://127.0.0.1:7810/v1/about
```

```json
{"product": "grafeno", "version": "0.1.0", "api": {"version": 1, "supported": [1]},
 "capabilities": ["namespaces", "nodes", "edges", "facts", "search.text", "…"],
 "auth": {"token": true, "accounts": false, "open": false, "password_sign_in": true}}
```

## Create nodes and facts

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/nodes \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"labels": ["Person"], "props": {"name": "Ana Torres"}, "text": "Ana leads the robotics team at Acme."}'
```

```json
{"id": "01a1b68c-2e7b-758b-8caf-3814e0959a92", "created": true}
```

A fact joins two nodes by their ids, with its valid time:

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/edges \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"from": "<id of Ana>", "label": "works_at", "to": "<id of Acme>", "valid_from": "2021-03-01"}'
```

Want your own ids — say, the ids your application already has? `PUT /v1/demo/nodes/{id}` creates the node with that id, or updates it if it exists, so sending it twice never duplicates it.

## Query with GQ

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

Pass values as **parameters**, never by pasting them into the query text:

```json
{"query": "MATCH (p:Person {name: $name}) RETURN p.name", "params": {"name": "Ana Torres"}}
```

## Search, recall and context

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/search/text \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"query": "robotics team", "limit": 5}'
```

```json
[{"node": "01a1b68c-2e7b-758b-8caf-3814e0959a92", "score": 0.575}]
```

`/recall` combines text, vectors and the graph; `/context` packs the result into a token budget for a model — see [Search and recall](../concepts/search-and-recall.md).

## Several writes, all or nothing

A batch commits every operation or none. A `ref` names a node created earlier in the same batch:

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/batch \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"ops": [
        {"op": "create_node", "ref": "$n", "node": {"labels": ["Note"], "props": {"title": "Kickoff"}, "text": "Kickoff meeting notes."}},
        {"op": "create_edge", "edge": {"from": "$n", "label": "about", "to": "<id of Acme>"}}
      ]}'
```

```json
{"results": [{"created": true, "id": "01a1b68c-…"}, {"id": "01a1b68c-…"}], "refs": {"$n": "01a1b68c-…"}}
```

## Errors

Errors come back as JSON with an HTTP status and a code:

```json
{"error": {"code": "unauthorized", "message": "…"}}
```

| Status | When |
| --- | --- |
| 400 | the request or the query is malformed |
| 401 | no secret, or a wrong one |
| 403 | the account lacks a privilege (the message names it) |
| 404 | no such namespace, node or route |
| 409 | a conflict (an existing name, a refused merge) |
| 421 | on a cluster, this member is not the leader and none is known yet: retry |
| 503 | busy (too many requests or writes waiting): retry after `Retry-After` |

## Main routes

| Method | Route | What it does |
| --- | --- | --- |
| `GET` | `/health` | is it up (public) |
| `GET` | `/v1/about` | version, API version, capabilities (public) |
| `GET`, `POST` | `/v1/namespaces` | list namespaces, create one |
| `POST` | `/v1/{ns}/query` | run GQ |
| `GET`, `POST` | `/v1/{ns}/nodes` | list nodes, create one |
| `GET`, `PUT`, `PATCH`, `DELETE` | `/v1/{ns}/nodes/{id}` | read, create-or-replace, change, delete a node |
| `GET`, `POST` | `/v1/{ns}/edges` | list facts, create one |
| `POST` | `/v1/{ns}/edges/{id}/invalidate`, `/retract` | end a fact, or retract it |
| `POST` | `/v1/{ns}/batch` | several writes in one transaction |
| `POST` | `/v1/{ns}/search/text`, `/search/vector` | full-text or vector search |
| `POST` | `/v1/{ns}/recall`, `/context` | hybrid recall; context for a model |
| `POST` | `/v1/{ns}/k-hop`, `/path` | neighbors within k steps; a shortest path |
| `GET` | `/v1/{ns}/changes` | the change log, as pages or a live stream |
| `POST` | `/v1/{ns}/ingest` | NDJSON lines with keys, written once |
| `GET` | `/v1/backup` | a backup of the whole database |

The engine's [server README](https://github.com/grafenodb/grafeno/blob/main/crates/grafeno-server/README.md#http-api) lists every route, with its body and answer.

For JavaScript and TypeScript, the [TypeScript client](../clients/typescript.md) wraps all of this, with sessions, errors and cluster failover handled for you.
