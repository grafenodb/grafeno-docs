---
title: Parameters
description: Pass values to a statement as $parameters over HTTP and from the TypeScript client, instead of building query strings.
---

# Parameters

A **parameter** is a value sent beside the statement and written in it as `$name`. Use parameters for every value that comes from outside: they cannot change what the statement does (no injection), and the engine parses a statement once and reuses it whatever the values are.

## Syntax

```text
MATCH (p:Product) WHERE p.price < $max RETURN p.sku
```

## Over HTTP

Send `query` and `params` to `POST /v1/{ns}/query`:

```bash
curl -s -X POST http://127.0.0.1:7810/v1/shop/query \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"query": "CREATE (:Product {sku: $sku, price: $price}) RETURN $sku AS sku",
       "params": {"sku": "A-1", "price": 9.5}}'
```

```json
{"columns": ["sku"], "rows": [["A-1"]], "stats": {"nodes_created": 1, …}}
```

```bash
curl -s -X POST http://127.0.0.1:7810/v1/shop/query \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"query": "MATCH (p:Product) WHERE p.price < $max RETURN p.sku, p.price",
       "params": {"max": 10}}'
```

```json
{"columns": ["p.sku", "p.price"], "rows": [["A-1", 9.5]], "stats": {…}}
```

## From the TypeScript client

```ts
const shop = new Grafeno({url, token}).namespace('shop');
const result = await shop.query(
  'MATCH (p:Product) WHERE p.price < $max RETURN p.sku, p.price',
  {max: 10},
);
```

## What a parameter can be

Any JSON value: a string, a number, a boolean, `null`, a list or a map. A list of maps loads many records in one statement:

```ts
await shop.query(
  'UNWIND $rows AS row MERGE (p:Product {sku: row.sku}) SET p.price = row.price',
  {rows: [{sku: 'A-1', price: 9.5}, {sku: 'B-2', price: 4}]},
);
```

## Where parameters go

Anywhere a value goes: properties in patterns, `WHERE`, `SET`, `LIMIT`, procedure arguments and settings maps.

:::caution Not for names
Labels, property names and edge labels cannot be parameters: they are part of the statement's shape. Validate such names in your code before you put them in the text.
:::

:::note Algorithm modes
`mode: 'stats'` and `write:` in an algorithm's settings must be written in the statement, not passed in a parameter: whether a statement writes is decided before it runs. Other settings may be parameters. See [Graph algorithms](../algorithms/index.md#modes-stats-and-write).
:::
