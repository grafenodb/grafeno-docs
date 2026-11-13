---
title: MCP para agentes
description: Dale a un agente Grafeno como memoria de largo plazo mediante Model Context Protocol, desde su primera sesión hasta la siguiente.
---

# MCP para agentes

`grafeno mcp` habla MCP por la entrada y la salida estándar. El cliente del agente inicia el proceso e intercambia JSON-RPC con él; los registros van a la salida de error. No necesita un servidor: el proceso abre su archivo de base por sí mismo.

```bash
grafeno mcp --db agente.redb --namespace yo
```

La configuración de un cliente MCP (dónde está el archivo y cómo se llama dependen del cliente):

```json
{
  "mcpServers": {
    "grafeno": {
      "command": "grafeno",
      "args": ["mcp", "--db", "/ruta/a/agente.redb", "--namespace", "yo"]
    }
  }
}
```

El servidor le explica al agente cómo usarlo al conectarse: llamar a `context` (o `recall`) antes de responder algo que pueda depender de lo que sabe, guardar hechos y decisiones nuevas con `remember`, conectar nodos con `relate`, usar `resume` al empezar trabajo en curso y `checkpoint` antes de terminar. Cada herramienta acepta un `namespace` opcional; sin él usa `--namespace`. Los ids son los UUID que devuelven las herramientas.

## Las herramientas

| Para… | Herramientas |
| --- | --- |
| Guardar y conectar | `remember` (un recuerdo, una persona, una decisión, con enlaces), `relate` (un hecho con fechas entre dos nodos), `update`, `forget` (un hecho termina, se retracta o se elimina) |
| Encontrar y leer | `recall` (palabras, significado y grafo, cada resultado con el porqué), `context` (recuerdos y hechos como texto dentro de un presupuesto de tokens), `get_node`, `query` ([GQ](../gq/index.md) de solo lectura, 200 filas como máximo), `overview` (resúmenes de comunidades para preguntas amplias) |
| Guardar textos largos | `ingest` (un documento, una conversación o código, cortado en fragmentos) |
| Retomar el trabajo | `checkpoint` (en qué quedó una tarea), `resume` (su último checkpoint y lo que cambió desde entonces) |
| Seguir los hechos en el tiempo | `timeline` (cómo cambió un nodo), `contradictions` (hechos que chocaron bajo una restricción), `changes` (lo escrito desde un número de secuencia) |
| Mantener la memoria en forma | `maintain` (salud, posibles duplicados, recuerdos que se desvanecen, grupos para resumir), `feedback` (útil, obsoleto, incorrecto), `merge`, `undo_merge`, `consolidate`, `find_matches` |
| Enlazar lo que mencionan los textos | `extract`, `add_mentions`, `review`, `resolve_review` |
| Resumir el grafo | `summarize_communities`, `set_summary` |

Los ejemplos de abajo vienen de una sesión con un motor: un agente que registró que Ana Torres trabajó en Acme desde 2021 y luego en Globex desde 2024, con la restricción de que una persona tiene un empleador a la vez.

## Textos largos: `ingest`

`remember` guarda un recuerdo. `ingest` toma un texto entero y lo corta como está escrito, sin modelo:

| `kind` | Se corta en |
| --- | --- |
| `document` (por defecto) | encabezados (`#`, `##`, …), luego líneas en blanco, luego finales de oración; cada fragmento empieza con su ruta de encabezados |
| `conversation` | turnos: una línea que empieza con quien habla (`Ana: …`, `[10:30] user: …`) abre uno |
| `code` | definiciones al inicio de una línea (`fn`, `def`, `class`, `function`, `struct`, …), con los comentarios, atributos y decoradores de encima |

El todo se convierte en un nodo (`Document`, `Conversation` o `Code`) y cada fragmento en un recuerdo enlazado a él en orden (`has_part`, `next`), con sus líneas y su parte (ruta de encabezados, quienes hablan o definiciones). Los fragmentos tienen hasta `max_chars` (1 500). Luego la extracción enlaza lo que mencionan. Ingerir la misma `source` de nuevo reemplaza sus fragmentos.

```json
{"name": "ingest", "arguments": {
  "content": "# Billing runbook\n\nWhat to do when invoices stop going out.\n\n## Restart\n\nRestart the consumer with `systemctl restart billing-consumer`.\n\n## Escalate\n\nCall Ana Torres at ana@example.com if it does not come back.",
  "source": "docs/billing-runbook.md"}}
```

```json
{
  "chunks": 3,
  "extraction": { "created": 1, "linked": 6, "mentions": 7, "texts_read": 4, "texts_unchanged": 0, "waiting_for_review": 2 },
  "id": "01a1d2a7-2add-76bd-8b76-9925d6d3a5a7",
  "replaced": 0,
  "chunk_ids": ["…"]
}
```

Después, recall encuentra el fragmento, y el grafo trae a su vecino:

```json
{"name": "recall", "arguments": {"query": "restart the consumer", "limit": 2}}
```

```json
{
  "results": [
    {
      "labels": ["Chunk"],
      "text": "Billing runbook > Restart\n\nRestart the consumer with `systemctl restart billing-consumer`.",
      "why": ["text match #1", "importance 0.50"],
      "…": "…"
    },
    {
      "labels": ["Chunk"],
      "text": "Billing runbook\n\nWhat to do when invoices stop going out.",
      "why": ["1 hop(s) from Chunk c8ed297d", "importance 0.50"],
      "…": "…"
    }
  ]
}
```

## Retomar el trabajo: `checkpoint` y `resume`

Antes de terminar, el agente guarda en qué quedó la tarea. Los checkpoints de una tarea (que coincide por sus palabras, sin importar mayúsculas ni espacios) forman una cadena, y se registra el agente que guarda cada uno (`agent`, o el nombre dado con `--as`).

```json
{"name": "checkpoint", "arguments": {
  "task": "Move billing to events",
  "summary": "The producer publishes invoice events; the consumer is next.",
  "done": ["producer publishes invoice.created"],
  "next": ["consumer", "backfill old invoices"],
  "decisions": ["at-least-once delivery, idempotent consumer"],
  "files": ["src/producer.rs"],
  "about": "01a1d2a7-2ad7-72b4-93b1-dfd88852d1ec"}}
```

En la siguiente sesión, este agente u otro la retoma, y se entera de lo que se escribió en la memoria desde entonces:

```json
{"name": "resume", "arguments": {"task": "move billing to events"}}
```

```json
{
  "found": true,
  "checkpoint": {
    "task": "Move billing to events",
    "summary": "The producer publishes invoice events; the consumer is next.",
    "done": ["producer publishes invoice.created"],
    "next": ["consumer", "backfill old invoices"],
    "decisions": ["at-least-once delivery, idempotent consumer"],
    "files": ["src/producer.rs"],
    "agent": "assistant",
    "…": "…"
  },
  "about": { "id": "01a1d2a7-2ad7-72b4-93b1-dfd88852d1ec", "name": "Billing" },
  "checkpoints_of_this_task": 1,
  "changed_since": [
    { "op": "created", "labels": ["Memory"], "what": "The invoices queue keeps messages for 7 days." }
  ],
  "more_changes": false
}
```

`resume` sin tarea devuelve el último checkpoint de cualquiera; `about` o `agent` lo acotan. Si nada coincide, lista las tareas que tienen checkpoints.

## Los hechos en el tiempo: `contradictions` y `timeline`

Con una [restricción](../gq/constraints.md) como un empleador por persona, registrar que Ana trabaja en Globex desde 2024 terminó el hecho de Acme en esa fecha. `contradictions` lista esos choques, del más reciente al más antiguo, y lo que se hizo (el hecho anterior terminó, el nuevo se rechazó, o ambos quedaron marcados):

```json
{"name": "contradictions", "arguments": {"node": "01a1d2a7-2ad1-747a-8de7-291978bd0c57"}}
```

```json
{
  "contradictions": [
    {
      "constraint": "one_employer",
      "action": "invalidated",
      "ends_at": "2024-01-15",
      "new": { "text": "Ana Torres works_at Globex", "valid_from": "2024-01-15", "…": "…" },
      "old": { "text": "Ana Torres works_at Acme", "valid_from": "2021-03-01", "…": "…" },
      "at": "2026-11-13",
      "by": "assistant"
    }
  ]
}
```

`timeline` cuenta cómo cambió un nodo, del momento más antiguo al más reciente: sus hechos comenzando y terminando, cuándo se registró cada uno, valores anteriores de sus propiedades, fusiones y contradicciones.

```json
{"name": "timeline", "arguments": {"id": "01a1d2a7-2ad1-747a-8de7-291978bd0c57"}}
```

```json
{
  "name": "Ana Torres",
  "timeline": [
    { "at": "2021-03-01", "kind": "fact_began", "text": "began: Ana Torres works_at Acme" },
    { "at": "2024-01-15", "kind": "fact_began", "text": "began: Ana Torres works_at Globex" },
    { "at": "2024-01-15", "kind": "fact_ended", "text": "ended: Ana Torres works_at Acme" },
    { "at": "2026-11-13", "kind": "created", "text": "Ana Torres was recorded", "by": "assistant" },
    { "at": "2026-11-13", "kind": "contradiction", "text": "Ana Torres works_at Globex contradicted Ana Torres works_at Acme under one_employer (invalidated)" },
    { "at": "2026-11-13", "kind": "fact_recorded", "text": "recorded: “Billing runbook > Escalate” mentions Ana Torres" }
  ]
}
```

(Arriba se omiten algunos momentos `fact_recorded`.)

## Mantener la memoria en forma: `feedback` y `maintain`

`feedback` dice cómo resultó un recuerdo o un hecho. No se elimina nada, y el veredicto queda en el recuerdo (`feedback`, `feedback_note`):

| `verdict` | Un recuerdo | Un hecho |
| --- | --- | --- |
| `useful` | gana importancia (0,1) y un acceso | — |
| `obsolete` | se archiva: se conserva, fuera de recall | termina ahora (invalidado) |
| `wrong` | se archiva sin importancia | se retracta como error |

```json
{"name": "feedback", "arguments": {"id": "01a1d2a7-2ad3-71b1-9f3c-632ced0d2469", "verdict": "obsolete", "note": "Ana left Acme"}}
```

```json
{ "result": "archived: kept, but left out of recall", "verdict": "obsolete", "…": "…" }
```

`maintain` revisa la memoria sin cambiarla: su tamaño, el [desgaste de sus grafos vectoriales](../vectors/sizing.md), las contradicciones registradas, posibles duplicados, recuerdos que se desvanecen y grupos de recuerdos antiguos para resumir con `consolidate`. Con `"check": true` además revisa cada registro e índice (los lee todos).

```json
{
  "health": { "nodes": 11, "edges": 16, "texts": 10, "contradictions": 1, "vector_graphs": [] },
  "duplicates": [],
  "weak": [],
  "consolidation": [],
  "hint": "…"
}
```

## Acotar a un agente

```bash
grafeno mcp --db agente.redb --namespace yo \
  --allow yo,compartido-* --read-only
```

| Opción | Efecto |
| --- | --- |
| `--allow vault,team-*` | Limita los namespaces que puede usar el agente. |
| `--read-only` | Solo ofrece herramientas de lectura (`recall` no registra accesos; `ingest`, `checkpoint`, `feedback` y las demás que escriben quedan fuera). |
| `--as NAME` | Guarda `NAME` en `@recorded_by` para las escrituras del agente, y como agente de sus checkpoints. |
| `--own-only` | Con `--as`, solo permite cambiar registros escritos por ese actor. |

Varios agentes que comparten una memoria, cada uno con sus permisos, usan en cambio la API HTTP con [cuentas y roles](access.md): un servidor, un archivo y una clave por agente.

:::warning Propiedad de la base
El proceso MCP abre su archivo de base directamente. No puede compartirlo con `grafeno serve` ni con otro proceso MCP. Usa archivos distintos para agentes separados, salvo que lleguen a la memoria por la API HTTP.
:::
