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

El servidor le explica al agente cómo usarlo al conectarse: llamar a `context` (o `recall`) antes de responder algo que pueda depender de lo que sabe, guardar hechos y decisiones nuevas con `remember`, conectar nodos con `relate`, usar `resume` al empezar trabajo en curso y `checkpoint` antes de terminar, y mantener juntos los recuerdos de un proyecto en una sala de un palacio. Cada herramienta acepta un `namespace` opcional; sin él usa `--namespace`. Los ids son los UUID que devuelven las herramientas.

## Las herramientas

| Para… | Herramientas |
| --- | --- |
| Guardar y conectar | `remember` (un recuerdo, una persona, una decisión, con enlaces), `relate` (un hecho con fechas entre dos nodos), `update`, `forget` (un hecho termina, se retracta o se elimina) |
| Encontrar y leer | `recall` (palabras, significado y grafo, cada resultado con el porqué), `context` (recuerdos y hechos como texto dentro de un presupuesto de tokens), `get_node`, `query` ([GQ](../gq/index.md) de solo lectura, 200 filas como máximo), `overview` (resúmenes de comunidades para preguntas amplias) |
| Guardar textos largos | `ingest` (un documento, una conversación o código, cortado en fragmentos) |
| Retomar el trabajo | `checkpoint` (en qué quedó una tarea), `resume` (su último checkpoint y lo que cambió desde entonces) |
| Ordenar los recuerdos en lugares | `palace_create`, `palace_create_room`, `palace_anchor` (un recuerdo que ya existe en un lugar de una sala), `palace_map`, `palace_walk` (de un tema a los recuerdos que lo rodean), `palace_enter` (el contexto de una sala y su checkpoint), `palace_review` (propuestas para ordenarlo mejor), `palace_reflect` (lo que se sabe, y lo que no) |
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

## Los recuerdos por lugar: las herramientas `palace_*`

Un palacio mental ordena en lugares recuerdos que ya existen, para que un agente los vuelva a encontrar por dónde están. Un **palacio** (`Work`) tiene **salas**, una por proyecto o tema; una sala tiene **loci**, lugares dentro de ella (toda sala tiene uno llamado `entrance`); y un recuerdo se **ancla** en uno o varios loci. El recuerdo no se copia ni cambia y conserva sus relaciones: un ancla es una arista más. Un palacio vive en un namespace, y son nodos y aristas normales, así que se guarda con todo lo demás.

Estos ejemplos vienen de otra sesión, con tres notas sobre un motor de almacenamiento.

Un palacio y una sala se crean una vez; pedirlos de nuevo devuelve los que hay. Un palacio o una sala se indican por su nombre o por su id.

```json
{"name": "palace_create", "arguments": {"name": "Work", "description": "Projects I work on"}}
{"name": "palace_create_room", "arguments": {
  "palace": "Work", "name": "Storage", "topic": "the storage engine", "loci": ["Decisions"]}}
```

```json
{
  "created": true,
  "id": "01a1d4a0-93ba-735b-8a34-93a7400f181d",
  "palace": { "id": "01a1d4a0-93b9-779b-b1c4-754c4993cb46", "name": "Work" },
  "room": {
    "name": "Storage",
    "topic": "the storage engine",
    "memories": 0,
    "loci": [
      { "name": "entrance", "position": 0, "count": 0, "…": "…" },
      { "name": "Decisions", "position": 1, "count": 0, "…": "…" }
    ],
    "…": "…"
  }
}
```

Los recuerdos se guardan como siempre, con `remember` y `relate`, y después se anclan. Un locus que todavía no existe se crea; una sala, no. Sin `locus`, el recuerdo va a la entrada; con `"remove": true`, se quita el ancla y el recuerdo queda.

```json
{"name": "palace_anchor", "arguments": {
  "memory": "01a1d4a0-93bc-77f0-bb99-3f87bd487361",
  "room": "Storage", "locus": "Decisions", "note": "why writes are serial"}}
```

```json
{
  "anchored": true,
  "locus_created": false,
  "memory": { "id": "01a1d4a0-93bc-77f0-bb99-3f87bd487361", "name": "Only one transaction writes at a time" },
  "places": [
    {
      "palace_name": "Work",
      "room_name": "Storage",
      "locus_name": "Decisions",
      "note": "why writes are serial",
      "…": "…"
    }
  ],
  "…": "…"
}
```

`palace_map` muestra qué hay y dónde: sin argumentos, cada palacio con sus salas, sus loci y cuántos recuerdos tiene cada uno; con `palace`, ese; con `room`, los recuerdos de cada locus.

`palace_walk` va de un tema, o de un nodo (`from`), a los recuerdos que lo rodean. Encuentra las salas y los loci que el tema nombra y los recuerdos anclados que coinciden con él, y desde ellos sigue las relaciones del grafo, hasta `hops` (2 por defecto, 3 como máximo). Aquí dos notas están en la sala, y la tercera, que no está anclada, queda a una relación de una de ellas:

```json
{"name": "palace_walk", "arguments": {"topic": "storage engine"}}
```

```json
{
  "places": [
    { "kind": "Room", "path": "Work / Storage", "…": "…" }
  ],
  "memories": [
    {
      "name": "“The whole database is one file”",
      "hops": 0,
      "places": [{ "room_name": "Storage", "locus_name": "entrance", "…": "…" }],
      "…": "…"
    },
    {
      "name": "“Only one transaction writes at a time”",
      "hops": 0,
      "places": [{ "room_name": "Storage", "locus_name": "Decisions", "note": "why writes are serial", "…": "…" }],
      "…": "…"
    },
    {
      "name": "“A replicated log orders the writes”",
      "hops": 1,
      "origin": "01a1d4a0-93bc-77f0-bb99-3f87bd487361",
      "via": [{ "label": "leads_to", "forward": true, "…": "…" }],
      "…": "…"
    }
  ]
}
```

Un recorrido devuelve solo lo que está en un palacio o se alcanza desde él; un recuerdo que coincide con el tema y no está anclado le toca a `recall`.

Tres cosas más que hace un recorrido:

- **Puertas.** Un hecho `leads_to` de una sala a otra, registrado con `relate`, es una puerta. `palace_map` lista las puertas de una sala, y un recorrido atraviesa las puertas de las salas que encontró: lo anclado al otro lado queda a un paso, con la puerta en su `via`.
- **Relevancia.** `"order": "relevance"` ordena lo alcanzado por cuánto coinciden sus palabras con el tema (palabras enteras) y después por distancia. Cada recuerdo dice su `relevance`.
- **Un contexto.** `"budget": 600` devuelve además los recuerdos alcanzados y los hechos que los unen como texto dentro de ese número de tokens. Una pregunta que necesita unir varios recuerdos, como quién mantiene el servicio al que afectó una caída, se responde con ese texto, con el camino que los unió en el `via` de cada recuerdo.

`context`, `palace_enter` y el contexto de un recorrido dejan fuera un recuerdo cuyas palabras son casi las de otro ya incluido, y dicen cuántos dejaron fuera.

Un palacio cambia con el trabajo:

- `palace_review` propone cómo ordenarlo mejor, cada propuesta con su motivo y la llamada que la aplica, y no aplica nada: dividir una sala demasiado llena para un contexto, fusionar dos salas que guardan los mismos recuerdos, mover un recuerdo a la sala donde vive su comunidad, quitar salas y loci vacíos, crear una sala para una comunidad de recuerdos que no tiene ninguna. Lo que depende de comunidades necesita antes `summarize_communities`.
- `forget` sobre un palacio, una sala o un locus lo borra con lo que hay debajo (salas, loci, anclas), y nunca un recuerdo. `"dry_run": true` dice antes qué se iría.
- `maintain` lista recuerdos antiguos que uno más nuevo sobre la misma entidad puede haber superado, para que el agente lo juzgue; `feedback` `obsolete` archiva el antiguo.
- `consolidate` con `"undo"` y el id de un resumen borra el resumen y recupera los recuerdos que había archivado.

Antes de responder sobre terreno incierto, un agente puede preguntar qué sabe. `palace_reflect` con un `topic`, una `room` o un `node` responde, cada elemento con el registro de donde sale:

- **known**: los recuerdos y hechos encontrados, contados por tipo y por cómo se saben, con los verificados nombrados;
- **uncertain**: lo inferido sin fuente, o con certeza baja;
- **conflicts**: los choques registrados bajo restricciones, primero los no resueltos;
- **stale**: hechos que terminaron, recuerdos archivados u obsoletos, recuerdos sin usar hace mucho, antiguos que uno más nuevo puede haber superado;
- **gaps**: preguntas abiertas, cosas mencionadas y nunca descritas, lugares vacíos, pasos pendientes de un checkpoint;
- **next**: qué comprobar, con la llamada que lo hace.

Un tema sin nada guardado responde `"nothing": true`, sin ofrecer un recuerdo sin relación en su lugar. Una pregunta es un recuerdo con la etiqueta `Question`, abierta hasta que un recuerdo se relaciona con ella con `answers`. La reflexión no escribe ni juzga nada: el origen y la certeza son lo que dijeron los agentes.

`palace_enter` reconstruye el contexto de una sala al empezar una sesión: sus recuerdos, los más fuertes primero, y los hechos que los conectan, como texto dentro de un presupuesto de tokens (`budget`, 1.500 por defecto), y el último checkpoint sobre la sala. Ese checkpoint se guarda con la herramienta `checkpoint`, con `about` igual al id de la sala.

```json
{"name": "palace_enter", "arguments": {"room": "Storage"}}
```

```json
{
  "palace": { "id": "01a1d4a0-93b9-779b-b1c4-754c4993cb46", "name": "Work" },
  "room": { "name": "Storage", "memories": 2, "…": "…" },
  "context": "## Memory\n[1] (Note)\nOnly one transaction writes at a time\n\n[2] (Note)\nThe whole database is one file\n\n## Facts\n- “Only one transaction writes at a time” leads_to “A replicated log orders the writes”\n",
  "tokens": 74,
  "memories": [
    { "id": "01a1d4a0-93bc-77f0-bb99-3f87bd487361", "truncated": false, "…": "…" },
    { "id": "01a1d4a0-93bc-77f1-a9b4-99670d911c39", "truncated": false, "…": "…" }
  ],
  "left_out": 0,
  "checkpoint": {
    "task": "Storage design",
    "summary": "One writer settled",
    "next": ["Measure the file"],
    "…": "…"
  }
}
```

Recall, context, los resúmenes de comunidades, `maintain` y la extracción leen recuerdos y dejan fuera palacios, salas y loci: responden lo mismo con un palacio que sin él, y una sala con el nombre de un proyecto no se toma por el proyecto. Para renombrar o describir una sala usa `update`; `forget` borra una, y deja sus loci sin sala.

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
| `--read-only` | Solo ofrece herramientas de lectura (`recall` no registra accesos; `ingest`, `checkpoint`, `feedback`, `palace_create`, `palace_create_room`, `palace_anchor` y las demás que escriben quedan fuera). |
| `--as NAME` | Guarda `NAME` en `@recorded_by` para las escrituras del agente, y como agente de sus checkpoints. |
| `--own-only` | Con `--as`, solo permite cambiar registros escritos por ese actor. |

## Varios agentes, una memoria

Varios agentes comparten una memoria a través de un servidor dueño del archivo. Da a cada agente una cuenta propia con [cuentas y roles](access.md) y una clave, y haz que su proceso MCP ejecute sus herramientas en el servidor en vez de abrir un archivo:

```bash
grafeno mcp --url http://127.0.0.1:7810 --token "$CLAVE_DEL_AGENTE" --namespace equipo
```

El servidor comprueba los derechos de cada agente por su clave: un agente que solo puede leer un namespace recibe las herramientas que leen allí y se le rechazan las demás; uno sin derechos sobre un namespace es rechazado allí. Un palacio en un namespace que solo una cuenta puede usar es de ese agente; un palacio en un namespace que varios pueden leer es compartido. Cada escritura queda registrada con la cuenta del agente, los rechazos van al registro de auditoría, y el servidor hace pasar las escrituras de todos los agentes por su único escritor, así que pueden trabajar a la vez.

Las mismas herramientas funcionan por HTTP: `GET /v1/{ns}/tools` lista las que puede usar quien llama, y `POST /v1/{ns}/tools/{name}` ejecuta una con un objeto JSON de argumentos y responde como MCP. GQ va por `POST /v1/{ns}/query`. Las herramientas comprueban derechos por namespace: una cuenta con reglas sobre etiquetas, propiedades o registros usa las otras rutas de la API. Todavía no están disponibles en un clúster.

## Ver la memoria del agente mientras escribe

El proceso MCP abre su archivo de base directamente, y solo un proceso puede abrir un archivo: mientras el agente funciona, Grafeno Studio o `grafeno shell --db` no pueden abrirlo a la vez, y dicen que ya está abierto. Haz que el servidor MCP del agente sirva también la API HTTP sobre la misma base, y conéctate a ella:

```bash
grafeno mcp --db agente.redb --namespace yo --listen 127.0.0.1:7810 --token "$GRAFENO_TOKEN"
```

En la configuración del cliente, los mismos argumentos van en `args`. Después conecta Grafeno Studio a `http://127.0.0.1:7810` con ese token, o una consola:

```bash
grafeno shell --url http://127.0.0.1:7810 --token "$GRAFENO_TOKEN"
```

Lo que el agente guarda aparece allí al momento, en las consultas y en el registro de cambios que sigue la vista del grafo, y lo que escribas allí el agente lo recuerda. `--listen` acepta `--token` (o `GRAFENO_TOKEN`) y `--cors-origins`. Sin token, mantén la dirección en `127.0.0.1`.

:::warning Propiedad de la base
Un segundo proceso sobre un archivo abierto se rechaza, con un mensaje que explica cómo conectarse. Usa archivos distintos para agentes separados, salvo que lleguen a la memoria por la API HTTP de un solo servidor.
:::
