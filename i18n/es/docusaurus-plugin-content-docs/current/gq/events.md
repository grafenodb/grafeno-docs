---
title: Suscripciones a eventos
description: Sigue los cambios con sus valores — antes, después y qué cambió — leídos como un flujo o enviados a un webhook. Apagadas hasta que la configuración las active.
---

# Suscripciones a eventos

El registro de cambios dice **qué** registros cambiaron. Una suscripción a eventos también registra **sus valores**: las propiedades antes y después, las claves que cambiaron, el texto o vector nuevo. Así una aplicación puede reaccionar a "el precio pasó de 9,5 a 11" sin volver a leer el registro.

Las suscripciones a eventos están **apagadas por defecto**. Actívalas en la configuración del servidor:

```toml
[events]
enabled = true
```

## Sintaxis

```text
CREATE EVENT SUBSCRIPTION nombre [IF NOT EXISTS]
  ON NODES | EDGES | PROPERTIES | TEXT | VECTORS [, …]
  [FOR :Etiqueta|Otra]
  [KEYS clave, …]
  [WHERE clave = valor [AND …]]
  [WITH VECTORS]
  [DELIVER TO STREAM | DELIVER TO WEBHOOK 'url' [SECRET 'secreto']]
DROP EVENT SUBSCRIPTION nombre [IF EXISTS]
SHOW EVENT SUBSCRIPTIONS
```

| Parte | Sigue |
| --- | --- |
| `ON NODES`, `ON EDGES` | registros creados, cambiados o borrados |
| `ON PROPERTIES` | registros cuyas propiedades cambiaron; `KEYS` lo limita a algunas claves |
| `ON TEXT` | nodos cuyo texto cambió |
| `ON VECTORS` | nodos cuyo vector cambió; `WITH VECTORS` incluye el vector |
| `FOR :A\|B` | solo registros con una de estas etiquetas |
| `WHERE clave = valor` | solo registros con estos valores, antes o después del cambio |

## Crear una suscripción

Seguir los cambios de precio de los productos:

```text run title="Ejemplo"
CREATE EVENT SUBSCRIPTION prices ON PROPERTIES FOR :Product KEYS price;
```

```text result title="Resultado"
 name   | on           | labels    | keys    | where | vectors | delivery | created_at                  | created_by
--------+--------------+-----------+---------+-------+---------+----------+-----------------------------+------------
 prices | [properties] | [Product] | [price] | {}    | false   | stream   | 2026-11-11T14:59:47.864698Z | null
(1 row)
```

Luego escribe como siempre:

```text run title="Ejemplo"
CREATE (:Product {sku: 'A-1', price: 9.5});
MATCH (p:Product {sku: 'A-1'}) SET p.price = 11.0;
MATCH (p:Product {sku: 'A-1'}) SET p.stock = 3;
```

```text result title="Resultado"
1 node created
1 property set
1 property set
```

El último cambio toca `stock`, no `price`, así que la suscripción lo salta.

## Leer los eventos

Los eventos se leen por HTTP, como una página de JSON o como un flujo de server-sent events:

```bash
curl -s "http://127.0.0.1:7810/v1/shop/events/prices?since=0" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "changes": [
    {
      "seq": 1, "op": "created", "node": "01a1cafe-2cf2-7233-85c6-c701c3824b6d",
      "labels": ["Product"],
      "values": {
        "after": {"price": 9.5, "sku": "A-1"},
        "changed": ["price", "sku"],
        "subscriptions": ["prices"]
      }
    },
    {
      "seq": 2, "op": "updated", "node": "01a1cafe-2cf2-7233-85c6-c701c3824b6d",
      "labels": ["Product"],
      "values": {
        "before": {"price": 9.5, "sku": "A-1"},
        "after": {"price": 11.0, "sku": "A-1"},
        "changed": ["price"],
        "subscriptions": ["prices"]
      }
    }
  ],
  "last": 2, "oldest": 1, "gap": false, "through": 2
}
```

Sigue con `?since=` el `through` de la página. Para un flujo, agrega `?stream=true` (o `Accept: text/event-stream`); un cliente que se reconecta retoma con `Last-Event-ID`. El cliente de TypeScript tiene `ns.events('prices', {since})`.

## Entregar a un webhook

Grafeno también puede enviar los eventos a una URL, en orden, en lotes, firmados con `X-Grafeno-Signature: sha256=<HMAC>` cuando hay un secreto, y con reintentos cuando la URL falla:

```text run title="Ejemplo"
CREATE EVENT SUBSCRIPTION lima_people ON NODES FOR :Person WHERE city = 'Lima'
  DELIVER TO WEBHOOK 'https://example.org/hooks/grafeno' SECRET 's3cret';
```

```text result title="Resultado"
 name        | on      | labels   | keys | where           | vectors | delivery                          | created_at                  | created_by
-------------+---------+----------+------+-----------------+---------+-----------------------------------+-----------------------------+------------
 lima_people | [nodes] | [Person] | []   | {"city":"Lima"} | false   | https://example.org/hooks/grafeno | 2026-11-11T14:59:47.878320Z | null
(1 row)
```

## Listar y borrar

El secreto nunca se muestra:

```text run title="Ejemplo"
SHOW EVENT SUBSCRIPTIONS;
```

```text result title="Resultado"
 name        | on           | labels    | keys    | where           | vectors | delivery                          | created_at                  | created_by
-------------+--------------+-----------+---------+-----------------+---------+-----------------------------------+-----------------------------+------------
 lima_people | [nodes]      | [Person]  | []      | {"city":"Lima"} | false   | https://example.org/hooks/grafeno | 2026-11-11T14:59:47.878320Z | null
 prices      | [properties] | [Product] | [price] | {}              | false   | stream                            | 2026-11-11T14:59:47.864698Z | null
(2 rows)
```

```text run title="Ejemplo"
DROP EVENT SUBSCRIPTION lima_people;
DROP EVENT SUBSCRIPTION lima_people IF EXISTS;
```

```text result title="Resultado"
 name | on | labels | keys | where | vectors | delivery | created_at | created_by
------+----+--------+------+-------+---------+----------+------------+------------
(0 rows)
 name | on | labels | keys | where | vectors | delivery | created_at | created_by
------+----+--------+------+-------+---------+----------+------------+------------
(0 rows)
```

## Valores de un evento

| Campo | Contiene |
| --- | --- |
| `before` | las propiedades antes del cambio (no está en una creación) |
| `after` | las propiedades después (no está en un borrado) |
| `changed` | las claves cuyos valores difieren |
| `text` | el texto del nodo, para `ON TEXT` |
| `vector`, `vector_changed` | el vector nuevo (con `WITH VECTORS`), o solo que cambió |
| `subscriptions` | las suscripciones a las que corresponde el evento |

:::tip Bueno saber
- Varios cambios a un registro en una transacción son un solo evento.
- Los eventos mantienen el orden y la ventana del registro de cambios (`[changes]` en la configuración); un lector que se queda atrás de la ventana recibe `gap: true`.
- Crear suscripciones y leer eventos requiere el privilegio `events` sobre el namespace (los administradores lo tienen) y `read`.
- `WITH VECTORS` hace eventos grandes: con vectores de 384 dimensiones el registro crece unas treinta veces. Usa una ventana más chica.
:::
