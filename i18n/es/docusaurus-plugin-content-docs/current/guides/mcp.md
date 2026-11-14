---
title: MCP para agentes
description: Dale a un agente Grafeno como memoria de largo plazo mediante Model Context Protocol, desde su primera sesión hasta la siguiente.
---

# MCP para agentes

Grafeno le da a un agente una memoria de largo plazo mediante MCP, el protocolo con el que los agentes llaman herramientas. El cliente del agente (el programa en el que corre el agente) inicia `grafeno mcp` y habla con él por la entrada y la salida estándar; los registros van a la salida de error. El agente recibe herramientas para recordar, buscar, retomar su trabajo y ordenar lo que sabe en palacios.

## Configurarlo

### 1. Elige dónde vive la memoria

| | El servidor de Grafeno (recomendado) | Un archivo propio |
| --- | --- | --- |
| Cómo | `grafeno mcp --url` ejecuta sus herramientas en un servidor en marcha | `grafeno mcp --db` abre un archivo de base |
| Sirve para | el uso diario: varios agentes a la vez, Grafeno Studio o la consola viendo cómo escribe el agente | probar, un solo agente |
| Qué arrancar a mano | nada si el servidor corre como servicio; si no, `grafeno serve` antes que el agente | nada: lo inicia el cliente |
| Límite | el servidor debe estar en marcha cuando el agente llama una herramienta | solo un proceso puede abrir un archivo: mientras el agente funciona, nada más puede abrirlo |

Los instaladores y paquetes dejan el servidor como un servicio que arranca con el equipo ([Instalación](../get-started/install.md)), en `http://127.0.0.1:7810`. Comprueba que responde:

```bash
curl http://127.0.0.1:7810/health
```

### 2. Dale una clave al agente

El agente firma sus peticiones con una clave propia, limitada a su namespace (aquí `me`, que se crea con la primera escritura). En el equipo del servidor, como administrador, porque solo los administradores pueden leer el archivo de configuración:

```bash
# Linux
sudo grafeno keys create mi-agente --grant me:write --config /etc/grafeno/grafeno.toml
# Windows, en una terminal abierta como administrador
grafeno keys create mi-agente --grant me:write --config C:\ProgramData\Grafeno\grafeno.toml
```

El secreto de la clave se muestra una sola vez: cópialo. Grafeno Studio también crea claves, en **Administration**. Comprueba que la clave funciona; la respuesta lista las herramientas que puede usar:

```bash
curl -H "Authorization: Bearer <la clave>" http://127.0.0.1:7810/v1/me/tools
```

### 3. Añade Grafeno al cliente del agente

Los clientes guardan sus servidores MCP en un archivo de configuración, y algunos tienen un comando que lo escribe; su documentación dice dónde. La mayoría acepta este JSON tal cual:

```json
{
  "mcpServers": {
    "grafeno": {
      "command": "grafeno",
      "args": ["mcp", "--url", "http://127.0.0.1:7810", "--token", "<la clave>", "--namespace", "me"]
    }
  }
}
```

Con un archivo propio en vez del servidor, los argumentos son `["mcp", "--db", "/ruta/a/agente.redb", "--namespace", "me"]`.

Si `grafeno` no está en el `PATH`, o se encuentra antes una copia vieja (`grafeno --version` dice cuál), escribe la ruta completa en `command`, como `C:\\Program Files\\Grafeno\\grafeno.exe`.

Un cliente lee sus servidores MCP al empezar una sesión: abre una sesión nueva después de cambiarlos.

### 4. Comprueba que el agente lo usa

Pídele al agente que llame a `palace_map`. El cliente muestra cada llamada a una herramienta con el nombre del servidor (`grafeno`); un cliente sin las herramientas dice que no tiene ninguna con ese nombre. Si el servidor está apagado, o la clave es incorrecta, la herramienta lo dice (`did not answer`, `refused it (401)`), y la siguiente llamada funciona en cuanto se arregla, sin abrir otra sesión.

### 5. Ordena la memoria

| Nivel | Úsalo para | Ejemplo |
| --- | --- | --- |
| Namespace | una persona o un agente, o lo que deba quedar aparte (otro cliente, los permisos de otro equipo) | `me` |
| Palacio | un proyecto | `Facturación` |
| Sala | un área del proyecto | `API`, `Base de datos`, `Docs` |
| Locus | un tema dentro del área | `Releases` |
| Memoria | una decisión, un problema, algo aprendido, anclada en un locus | "Las facturas se reintentan tres veces" |
| Checkpoint | dónde queda una tarea al terminar una sesión | "Pasar facturación a eventos" |

Un namespace con un palacio por proyecto guarda en un solo sitio lo que vale para todos (preferencias, formas de trabajar), y permite que una memoria de un proyecto se relacione con otra de otro. Un namespace por sesión perdería el sentido: la sesión siguiente empezaría sin nada. Dile al agente qué palacio usa su proyecto en las instrucciones que su cliente lee para el proyecto, por ejemplo: "Grafeno es la memoria de este proyecto; su palacio es `Facturación`. Al empezar, llama a `palace_enter`; antes de terminar, guarda un `checkpoint`."

### Cuando algo falla

| Ves | Por qué | Qué hacer |
| --- | --- | --- |
| `Database already open. Cannot acquire lock.` | otro proceso tiene el archivo abierto: el `grafeno mcp --db` de otra sesión, o un servidor sobre él | usa el servidor (`--url`), o cierra el otro proceso |
| El agente no tiene herramientas de Grafeno | la sesión empezó antes de añadir Grafeno, o el cliente no pudo iniciar el comando | abre una sesión nueva; revisa `command` con su ruta completa |
| `did not answer` | el servidor no está en marcha | inicia el servicio o `grafeno serve` |
| `refused it (401)` | una clave incorrecta o revocada | revisa la clave en `args` |
| `refused it (403)` | la clave no tiene derechos sobre ese namespace | dáselos (`--grant me:write`) o usa su namespace |

## Cómo lo usa el agente

El servidor le explica al agente cómo usarlo al conectarse: llamar a `context` (o `recall`) antes de responder algo que pueda depender de lo que sabe, guardar hechos y decisiones nuevas con `remember`, conectar nodos con `relate`, usar `resume` al empezar trabajo en curso y `checkpoint` antes de terminar, y mantener juntos los recuerdos de un proyecto en una sala de un palacio. Cada herramienta acepta un `namespace` opcional; sin él usa `--namespace`. Los ids son los UUID que devuelven las herramientas.

## Las herramientas

| Para… | Herramientas |
| --- | --- |
| Guardar y conectar | `remember` (un recuerdo, una persona, una decisión, con enlaces), `relate` (un hecho con fechas entre dos nodos), `update`, `forget` (un hecho termina, se retracta o se elimina) |
| Encontrar y leer | `recall` (palabras, significado y grafo, cada resultado con el porqué), `context` (recuerdos y hechos como texto dentro de un presupuesto de tokens), `get_node`, `query` ([GQ](../gq/index.md) de solo lectura, 200 filas como máximo), `overview` (resúmenes de comunidades para preguntas amplias) |
| Guardar textos largos | `ingest` (un documento, una conversación o código, cortado en fragmentos) |
| Retomar el trabajo | `checkpoint` (en qué quedó una tarea), `resume` (su último checkpoint y lo que cambió desde entonces) |
| Ordenar los recuerdos en lugares | `palace_create`, `palace_create_room`, `palace_anchor` (un recuerdo que ya existe en un lugar de una sala), `palace_map`, `palace_walk` (de un tema a los recuerdos que lo rodean), `palace_enter` (el contexto de una sala y su checkpoint), `palace_route` (relaciones dadas seguidas en orden, hacia un objetivo), `palace_review` (propuestas para ordenarlo mejor), `palace_reflect` (lo que se sabe, y lo que no) |
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

## Tipos, relaciones y procedencia

Un recuerdo dice de qué tipo es con una etiqueta. Estas tienen significado: `Fact`, `Decision`, `Experience`, `Task`, `Question`, `Episode` (material en bruto tal como llegó), `Concept`, `Hypothesis`, `Evidence`, `Constraint` (una regla del dominio) y `Goal`. Un hecho puede tener cualquier etiqueta; estas tienen significado: `related_to`, `depends_on`, `part_of`, `derived_from`, `supported_by`, `contradicts`, `supersedes` y `caused_by`, que `relate` rechaza sin `sources`, porque una causa necesita nombrar su evidencia.

`remember` y `relate` aceptan `method`, cómo se obtuvo algo (`agent`, `rule`, `stated`, `imported`); `get_node` responde un bloque `provenance` con las fuentes, quién lo registró y cómo, qué lo respalda y qué trajeron las fusiones. El mismo hecho vigente se registra una vez: `relate` responde `"duplicate": true` con el que ya está, y `maintain` lista los hechos guardados dos veces. Una fusión conserva lo que era el nodo fusionado y cómo se conocía, en `merged_from`.

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
- **Relevancia.** `"order": "relevance"` ordena lo alcanzado por cuánto coinciden sus palabras con el tema (palabras enteras) y después por distancia. Un recuerdo alcanzado por relaciones hereda además la mitad de la relevancia de aquel desde el que se llegó, por cada relación, para que lo que sigue a la mejor coincidencia no quede debajo de coincidencias débiles. Cada recuerdo dice su `relevance`.
- **Un contexto.** `"budget": 600` devuelve además los recuerdos alcanzados y los hechos que los unen como texto dentro de ese número de tokens. Una pregunta que necesita unir varios recuerdos, como quién mantiene el servicio al que afectó una caída, se responde con ese texto, con el camino que los unió en el `via` de cada recuerdo.
- **Solo algunas relaciones, o un momento pasado.** `"relations": ["hit", "depends_on", "maintains"]` sigue solo esas etiquetas; `"valid_at": "2025-06-01"` sigue solo los hechos vigentes entonces, así que el recorrido llega a quien mantenía el almacén en esa fecha. Un recorrido `from` una entidad es un recall sobre esa entidad.
- **Cómo y con qué fundamento.** Cada recuerdo dice cómo lo encontró el recorrido (`found_by`, en palabras, junto a `via`) y, aparte, qué lo respalda o lo pone en duda (`justification`: sus `sources`, cómo se sabe (`known`), y qué lo respalda (`supported_by`), lo contradice (`contradicted_by`) o lo reemplazó (`superseded_by`)). `recall` responde la misma `justification` junto a su `why`. Las dos cosas van aparte: una puntuación no es evidencia.
- **La parte siguiente.** `"skip": 20` deja fuera lo ya leído; `recall` y `context` también lo aceptan.

`context`, `palace_enter` y el contexto de un recorrido dejan fuera un recuerdo cuyas palabras son casi las de otro ya incluido, y dicen cuántos dejaron fuera. Ponen juntos los recuerdos unidos por un hecho y declaran que su cuenta de tokens es una estimación (`tokens_estimated`). `recall` y `context` escalan las puntuaciones de cada búsqueda antes de fusionarlas, así que lo relacionado con la mejor coincidencia puede superar a coincidencias débiles; `"fusion": "rank"` fusiona solo por rango.

Un palacio cambia con el trabajo:

- `palace_review` propone cómo ordenarlo mejor, cada propuesta con su motivo y la llamada que la aplica, y no aplica nada: dividir una sala demasiado llena para un contexto, fusionar dos salas que guardan los mismos recuerdos, mover un recuerdo a la sala donde vive su comunidad, quitar salas y loci vacíos, crear una sala para una comunidad de recuerdos que no tiene ninguna, retractar un hecho registrado dos veces; y señala un recuerdo sin relación con ningún otro de su sala, y una sala cuyos recuerdos no se relacionan entre sí. Lo que depende de comunidades necesita antes `summarize_communities`.
- `palace_route` sigue relaciones dadas en orden desde un nodo, hacia un objetivo: `"steps": [{"label": "hit"}, {"label": "depends_on", "repeat": true}, {"label": "maintains", "backward": true}]` va de un incidente al servicio que afectó, todo aquello de lo que depende, y quién mantiene el final de la cadena. `repeat` sigue una relación hasta donde llega, `backward` en contra de su flecha, `to` deja solo las rutas que terminan en un nodo, y `valid_at` sigue solo los hechos vigentes entonces. Las versiones de una decisión son `{"label": "supersedes", "repeat": true}`.
- `get_node` con `"reconstruct": true` reconstruye en una llamada el contexto de un recuerdo, una decisión, una entidad o una sala: dónde está guardado en cada palacio, los hechos vigentes, su línea de tiempo reciente, sus versiones, qué lo respalda y una reflexión.
- Un recuerdo anclado en dos palacios es un solo nodo: un cambio hecho una vez, por un agente con permiso de escritura, se ve en ambos.
- `forget` sobre un palacio, una sala o un locus lo borra con lo que hay debajo (salas, loci, anclas), y nunca un recuerdo. `"dry_run": true` dice antes qué se iría.
- `maintain` lista recuerdos antiguos que uno más nuevo sobre la misma entidad puede haber superado, para que el agente lo juzgue; `feedback` `obsolete` archiva el antiguo.
- `consolidate` con `"undo"` y el id de un resumen borra el resumen y recupera los recuerdos que había archivado.

Antes de responder sobre terreno incierto, un agente puede preguntar qué sabe. `palace_reflect` con un `topic`, una `room` o un `node` responde, cada elemento con el registro de donde sale:

- **known**: los recuerdos y hechos encontrados, contados por tipo y por cómo se saben, con los verificados nombrados;
- **uncertain**: lo inferido sin fuente, o con certeza baja;
- **unsupported**: lo que se dijo afirmado u observado sin ninguna fuente detrás;
- **conflicts**: los choques registrados bajo restricciones o con `contradicts`, primero los no resueltos, cada uno un cambio (`change`: el hecho nuevo ocupó el lugar del anterior) o una contradicción (`contradiction`: ambos siguen en pie);
- **stale**: hechos que terminaron, recuerdos archivados u obsoletos, recuerdos sin usar hace mucho, antiguos que uno más nuevo puede haber superado;
- **gaps**: preguntas abiertas, cosas mencionadas y nunca descritas, lugares vacíos, pasos pendientes de un checkpoint, y lo que la forma esperada de un tipo pide y a un recuerdo le falta;
- **next**: qué comprobar, con la llamada que lo hace.

Las fuentes de cada elemento están en `sources`, por su id, y `known.by_evidence` cuenta cada registro una vez según lo que hay guardado detrás (en conflicto, obsoleto, verificado, respaldado, o sin fuente): recuentos, no probabilidades. Lo que un tipo de recuerdo debería tener es su forma esperada: `"expected": {"Decision": {"relations": ["supported_by"], "properties": ["reason"]}}` en la llamada, o declarada una vez como un recuerdo con la etiqueta `Shape` y las propiedades `kind`, `relations` y `properties`. La reflexión recomienda comprobaciones y nunca busca fuera de Grafeno.

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

`timeline` responde además dos preguntas sobre el tiempo:

- **Qué cambió entre dos fechas.** `"compare": "2023-06-01"` (y `"at"`, ahora por defecto) lista los hechos del nodo que **terminaron**, los que **empezaron** y los que **cambiaron**: la misma relación desde el mismo extremo hacia otro nodo. Para Ana Torres, `works_at` cambió de Acme a Globex; un hecho vigente en ambas fechas solo se cuenta (`kept`).
- **La historia de una decisión.** Una decisión que cambia es un recuerdo nuevo que reemplaza (`supersedes`) al anterior, registrado con `relate` y un `reason` (y `sources` para la evidencia). `timeline` sobre cualquier versión responde `history`: todas las versiones, de la más antigua a la vigente, cada una con el motivo y la evidencia de su cambio. No se borra nada; las versiones anteriores siguen legibles.

```json
{"name": "relate", "arguments": {
  "from": "<la nueva decisión>", "label": "supersedes", "to": "<la anterior>",
  "reason": "una sola tabla se volvió lenta", "sources": ["<la medición>"]}}
```

`palace_reflect` distingue un **cambio** (bajo una restricción, un hecho nuevo ocupó el lugar de otro anterior, como `works_at` arriba) de una **contradicción** (ambos siguen en pie: marcados bajo una restricción, o registrados con `contradicts`). Hechos de fuentes distintas no se toman por contradicciones salvo que se registren como tales.

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

Grafeno Studio muestra los palacios de un agente en su vista **Palaces**, leídos con estas herramientas y sin escribir nada. Las mismas herramientas funcionan por HTTP: `GET /v1/{ns}/tools` lista las que puede usar quien llama, y `POST /v1/{ns}/tools/{name}` ejecuta una con un objeto JSON de argumentos y responde como MCP. GQ va por `POST /v1/{ns}/query`. Las herramientas comprueban derechos por namespace: una cuenta con reglas sobre etiquetas, propiedades o registros usa las otras rutas de la API. Todavía no están disponibles en un clúster.

## Ver la memoria del agente mientras escribe

Con el servidor (`--url`), conecta Grafeno Studio o `grafeno shell --url` al mismo servidor y namespace: lo que el agente guarda aparece allí mientras lo escribe.

Con un archivo propio, el proceso MCP lo abre directamente, y solo un proceso puede abrir un archivo: mientras el agente funciona, Grafeno Studio o `grafeno shell --db` no pueden abrirlo a la vez, y dicen que ya está abierto. Haz que el servidor MCP del agente sirva también la API HTTP sobre la misma base, y conéctate a ella:

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
