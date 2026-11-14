---
title: Cliente TypeScript
description: Usa Grafeno desde aplicaciones JavaScript y TypeScript.
---

# Cliente TypeScript

`@grafenodb/client` es el SDK de TypeScript de Grafeno. Envuelve la API HTTP, usa el `fetch` global de la plataforma y no tiene dependencias en tiempo de ejecución. Funciona en Node.js 22.18 o posterior, y donde exista `fetch`.

```bash
npm install @grafenodb/client
```

Su código, sus cambios y sus versiones están en [grafenodb/grafeno-sdk](https://github.com/grafenodb/grafeno-sdk/tree/main/typescript); tiene versiones propias y funciona con todos los motores desde la 0.1.0.

```ts
import {Grafeno} from '@grafenodb/client';

const grafeno = new Grafeno({
  url: 'http://127.0.0.1:7810',
  token: process.env.GRAFENO_TOKEN,
});
const vault = grafeno.namespace('vault-123');
```

## Consulta y recupera

```ts
const people = await vault.query(
  'MATCH (p:Person) WHERE p.age > $age RETURN p.name',
  {age: 30},
);

const context = await vault.context({text: question, budget: 1500});
prompt += context.rendered;
```

## Sincroniza cambios relacionados de forma atómica

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

## Herramientas de memoria y palacios

Las herramientas de memoria que los agentes usan por MCP también funcionan por HTTP (motores con la capacidad `tools`): `tools()` lista las que puede usar quien llama, y `tool()` ejecuta una y devuelve su respuesta como datos; un rechazo lanza un `GrafenoError` con el código `tool_error` y las palabras de la herramienta. `callTool()` devuelve la respuesta completa.

```ts
const map = await vault.tool<{palaces: {name: string}[]}>('palace_map');
const walk = await vault.tool('palace_walk', {topic: 'billing outage', hops: 3});
const reflection = await vault.tool('palace_reflect', {topic: 'invoices'});
const history = await vault.tool('timeline', {id: decisionId});
```

Las herramientas y sus argumentos están en la [guía MCP](../guides/mcp.md). `contradictions()` lista los hechos que chocaron con restricciones, y `compact()` reconstruye un grafo vectorial desgastado por borrados.

## Otras herramientas de grafos

Un namespace sale como GraphML, o como CSV de sus nodos o de sus hechos, y vuelve a entrar:

```ts
const graphml = await grafeno.exportAs('vault-123', 'graphml');
const stats = await grafeno.importAs('copy', 'graphml', graphml);
// {nodes, edges, failed, errors}
```

## Sesiones y clústeres

Los usuarios pueden iniciar sesión con contraseña. `onSession` recibe los tokens renovados para que la aplicación los conserve.

```ts
const client = new Grafeno({url, onSession: saveTokens});
await client.signIn('ana', password);
```

Para un clúster, entrega las URL de varios miembros. El cliente cambia de miembro ante fallos, transmite la última posición observada para conservar la lectura tras escritura y admite consistencia `local`, `bounded` o `linearizable`.

```ts
const cluster = new Grafeno({
  url: ['http://10.0.0.1:7810', 'http://10.0.0.2:7810'],
  token,
});
```

## Revisa el motor primero

El cliente habla la versión 1 de la API HTTP y tiene su propia versión (`CLIENT_VERSION`). `connect()` le pregunta al motor qué es (`GET /v1/about`) y rechaza uno con el que no puede trabajar; `supports()` dice luego qué puede hacer el motor, así tu aplicación apaga lo que le falta a un motor más viejo en vez de fallar:

```ts
const about = await grafeno.connect();   // lanza GrafenoError con código "incompatible" si no comparten ninguna versión de la API
console.log(about.version, about.api.version);
if (grafeno.supports('audit')) showAuditLog();
if (grafeno.supports('cluster.groups')) showPlacement();
```

Los nombres de campos de la API permanecen en `snake_case`. Los fallos HTTP se lanzan como `GrafenoError` con `status` y el `code` del error de la API.
