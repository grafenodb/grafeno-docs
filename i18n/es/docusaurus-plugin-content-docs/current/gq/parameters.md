---
title: Parámetros
description: Pasa valores a una sentencia como $parámetros por HTTP y desde el cliente de TypeScript, en lugar de armar textos de consulta.
---

# Parámetros

Un **parámetro** es un valor que se envía junto a la sentencia y se escribe en ella como `$nombre`. Usa parámetros para todo valor que venga de afuera: no pueden cambiar lo que hace la sentencia (sin inyección), y el motor interpreta la sentencia una vez y la reutiliza sean cuales sean los valores.

## Sintaxis

```text
MATCH (p:Product) WHERE p.price < $max RETURN p.sku
```

## Por HTTP

Envía `query` y `params` a `POST /v1/{ns}/query`:

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

## Desde el cliente de TypeScript

```ts
const shop = new Grafeno({url, token}).namespace('shop');
const result = await shop.query(
  'MATCH (p:Product) WHERE p.price < $max RETURN p.sku, p.price',
  {max: 10},
);
```

## Qué puede ser un parámetro

Cualquier valor JSON: un texto, un número, un booleano, `null`, una lista o un mapa. Una lista de mapas carga muchos registros en una sentencia:

```ts
await shop.query(
  'UNWIND $rows AS row MERGE (p:Product {sku: row.sku}) SET p.price = row.price',
  {rows: [{sku: 'A-1', price: 9.5}, {sku: 'B-2', price: 4}]},
);
```

## Dónde van los parámetros

Donde sea que va un valor: propiedades en patrones, `WHERE`, `SET`, `LIMIT`, argumentos de procedimientos y mapas de configuración.

:::caution No para nombres
Las etiquetas, los nombres de propiedades y las etiquetas de aristas no pueden ser parámetros: son parte de la forma de la sentencia. Valida esos nombres en tu código antes de ponerlos en el texto.
:::

:::note Modos de los algoritmos
`mode: 'stats'` y `write:` en la configuración de un algoritmo deben escribirse en la sentencia, no pasarse en un parámetro: si una sentencia escribe se decide antes de ejecutarla. Las demás opciones pueden ser parámetros. Ver [Algoritmos de grafos](../algorithms/index.md#modos-stats-y-write).
:::
