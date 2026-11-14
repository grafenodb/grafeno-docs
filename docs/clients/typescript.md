---
title: TypeScript client
description: Use Grafeno from JavaScript and TypeScript applications.
---

# TypeScript client

`@grafenodb/client` is Grafeno's TypeScript SDK. It wraps the HTTP API, uses the platform's global `fetch`, and has no runtime dependencies. It runs on Node.js 22.18 or later, and wherever `fetch` exists.

```bash
npm install @grafenodb/client
```

Its source, changelog and releases are in [grafenodb/grafeno-sdk](https://github.com/grafenodb/grafeno-sdk/tree/main/typescript); it has its own versions, and works with every engine from 0.1.0 on.

```ts
import {Grafeno} from '@grafenodb/client';

const grafeno = new Grafeno({
  url: 'http://127.0.0.1:7810',
  token: process.env.GRAFENO_TOKEN,
});
const vault = grafeno.namespace('vault-123');
```

## Query and retrieve

```ts
const people = await vault.query(
  'MATCH (p:Person) WHERE p.age > $age RETURN p.name',
  {age: 30},
);

const context = await vault.context({text: question, budget: 1500});
prompt += context.rendered;
```

## Sync related changes atomically

```ts
await vault.batch([
  {op: 'upsert_node', ref: '$note', node: {
    id: noteId,
    labels: ['Note'],
    props: {title},
    text,
  }},
  {op: 'delete_edges_from', from: '$note', label: 'links_to'},
  ...linkedIds.map((to) => ({
    op: 'create_edge' as const,
    edge: {from: '$note', label: 'links_to', to},
  })),
]);
```

## Memory tools and palaces

The memory tools that agents use over MCP also run over HTTP (engines with the `tools` capability): `tools()` lists those the caller may use, and `tool()` runs one and returns its answer as data; a refusal throws a `GrafenoError` with the code `tool_error` and the tool's own words. `callTool()` returns the whole answer instead.

```ts
const map = await vault.tool<{palaces: {name: string}[]}>('palace_map');
const walk = await vault.tool('palace_walk', {topic: 'billing outage', hops: 3});
const reflection = await vault.tool('palace_reflect', {topic: 'invoices'});
const history = await vault.tool('timeline', {id: decisionId});
```

The tools and their arguments are in the [MCP guide](../guides/mcp.md). `contradictions()` lists the facts that ran into constraints, and `compact()` rebuilds a vector graph worn by removals.

## Other graph tools

A namespace goes out as GraphML, or as CSV of its nodes or its facts, and comes back in:

```ts
const graphml = await grafeno.exportAs('vault-123', 'graphml');
const stats = await grafeno.importAs('copy', 'graphml', graphml);
// {nodes, edges, failed, errors}
```

## Sessions and clusters

Users can sign in with a password. `onSession` receives refreshed tokens so the application can persist them.

```ts
const client = new Grafeno({url, onSession: saveTokens});
await client.signIn('ana', password);
```

For a cluster, pass several member URLs. The client fails over, carries the last observed position to preserve read-your-writes behavior, and supports `local`, `bounded`, or `linearizable` consistency.

```ts
const cluster = new Grafeno({
  url: ['http://10.0.0.1:7810', 'http://10.0.0.2:7810'],
  token,
});
```

## Check the engine first

The client speaks the HTTP API version 1 and has its own version (`CLIENT_VERSION`). `connect()` asks the engine what it is (`GET /v1/about`) and refuses one it cannot work with; `supports()` then says what the engine can do, so your application turns off what an older engine lacks instead of failing:

```ts
const about = await grafeno.connect();   // throws GrafenoError with code "incompatible" if no API version is shared
console.log(about.version, about.api.version);
if (grafeno.supports('audit')) showAuditLog();
if (grafeno.supports('cluster.groups')) showPlacement();
```

API field names remain `snake_case`. HTTP failures are thrown as `GrafenoError` with `status` and the API error `code`.
