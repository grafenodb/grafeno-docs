---
title: Event subscriptions
description: Follow changes with their values — before, after and what changed — read as a stream or posted to a webhook. Off until the settings turn them on.
---

# Event subscriptions

The change log says **which** records changed. An event subscription also records **their values**: the properties before and after, the keys that changed, the new text or vector. An application can then react to "the price went from 9.5 to 11" without reading the record again.

Event subscriptions are **off by default**. Turn them on in the server's settings:

```toml
[events]
enabled = true
```

## Syntax

```text
CREATE EVENT SUBSCRIPTION name [IF NOT EXISTS]
  ON NODES | EDGES | PROPERTIES | TEXT | VECTORS [, …]
  [FOR :Label|Other]
  [KEYS key, …]
  [WHERE key = value [AND …]]
  [WITH VECTORS]
  [DELIVER TO STREAM | DELIVER TO WEBHOOK 'url' [SECRET 'secret']]
DROP EVENT SUBSCRIPTION name [IF EXISTS]
SHOW EVENT SUBSCRIPTIONS
```

| Part | Follows |
| --- | --- |
| `ON NODES`, `ON EDGES` | records created, changed or deleted |
| `ON PROPERTIES` | records whose properties changed; `KEYS` narrows to some keys |
| `ON TEXT` | nodes whose text changed |
| `ON VECTORS` | nodes whose vector changed; `WITH VECTORS` includes the vector |
| `FOR :A\|B` | only records with one of these labels |
| `WHERE key = value` | only records with these values, before or after the change |

## Create a subscription

Follow price changes of products:

```text run title="Example"
CREATE EVENT SUBSCRIPTION prices ON PROPERTIES FOR :Product KEYS price;
```

```text result title="Result"
 name   | on           | labels    | keys    | where | vectors | delivery | created_at                  | created_by
--------+--------------+-----------+---------+-------+---------+----------+-----------------------------+------------
 prices | [properties] | [Product] | [price] | {}    | false   | stream   | 2026-11-11T14:59:44.066523Z | null
(1 row)
```

Then write as usual:

```text run title="Example"
CREATE (:Product {sku: 'A-1', price: 9.5});
MATCH (p:Product {sku: 'A-1'}) SET p.price = 11.0;
MATCH (p:Product {sku: 'A-1'}) SET p.stock = 3;
```

```text result title="Result"
1 node created
1 property set
1 property set
```

The last change touches `stock`, not `price`, so the subscription skips it.

## Read the events

Events are read over HTTP, as a page of JSON or as a stream of server-sent events:

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

Continue with `?since=` the page's `through`. For a stream, add `?stream=true` (or `Accept: text/event-stream`); a reconnecting client resumes with `Last-Event-ID`. The TypeScript client has `ns.events('prices', {since})`.

## Deliver to a webhook

Grafeno can post the events to a URL instead, in order, in batches, signed with `X-Grafeno-Signature: sha256=<HMAC>` when there is a secret, and retried when the URL fails:

```text run title="Example"
CREATE EVENT SUBSCRIPTION lima_people ON NODES FOR :Person WHERE city = 'Lima'
  DELIVER TO WEBHOOK 'https://example.org/hooks/grafeno' SECRET 's3cret';
```

```text result title="Result"
 name        | on      | labels   | keys | where           | vectors | delivery                          | created_at                  | created_by
-------------+---------+----------+------+-----------------+---------+-----------------------------------+-----------------------------+------------
 lima_people | [nodes] | [Person] | []   | {"city":"Lima"} | false   | https://example.org/hooks/grafeno | 2026-11-11T14:59:44.080794Z | null
(1 row)
```

## List and drop

The secret is never shown:

```text run title="Example"
SHOW EVENT SUBSCRIPTIONS;
```

```text result title="Result"
 name        | on           | labels    | keys    | where           | vectors | delivery                          | created_at                  | created_by
-------------+--------------+-----------+---------+-----------------+---------+-----------------------------------+-----------------------------+------------
 lima_people | [nodes]      | [Person]  | []      | {"city":"Lima"} | false   | https://example.org/hooks/grafeno | 2026-11-11T14:59:44.080794Z | null
 prices      | [properties] | [Product] | [price] | {}              | false   | stream                            | 2026-11-11T14:59:44.066523Z | null
(2 rows)
```

```text run title="Example"
DROP EVENT SUBSCRIPTION lima_people;
DROP EVENT SUBSCRIPTION lima_people IF EXISTS;
```

```text result title="Result"
 name | on | labels | keys | where | vectors | delivery | created_at | created_by
------+----+--------+------+-------+---------+----------+------------+------------
(0 rows)
 name | on | labels | keys | where | vectors | delivery | created_at | created_by
------+----+--------+------+-------+---------+----------+------------+------------
(0 rows)
```

## Values in an event

| Field | Holds |
| --- | --- |
| `before` | the properties before the change (absent for a creation) |
| `after` | the properties after (absent for a deletion) |
| `changed` | the keys whose values differ |
| `text` | the node's text, for `ON TEXT` |
| `vector`, `vector_changed` | the new vector (with `WITH VECTORS`), or only that it changed |
| `subscriptions` | the subscriptions the event is for |

:::tip Good to know
- Several changes to one record in one transaction are one event.
- Events keep the change log's order and its window (`[changes]` in the settings); a reader that falls behind the window gets `gap: true`.
- Creating subscriptions and reading events needs the `events` privilege on the namespace (administrators have it) and `read`.
- `WITH VECTORS` makes events large: with 384-dimension vectors the log grows about thirty times. Keep a smaller window.
:::
