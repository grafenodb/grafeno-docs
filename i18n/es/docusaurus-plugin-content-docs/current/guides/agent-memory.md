---
title: Memoria para agentes
description: Mantén en forma la memoria de un agente — guarda episodios con sus fuentes, encuentra duplicados y fusiónalos, evita que los hechos se contradigan, y consolida.
sidebar_position: 2
---

# Memoria para agentes

Una memoria que solo crece se vuelve ruido: la misma persona escrita de tres formas, un trabajo viejo junto al nuevo, cien notas casi iguales. Esta guía muestra qué hace Grafeno con cada caso, con ejemplos que puedes ejecutar en la consola (`grafeno shell`) o por HTTP. Grafeno lo hace todo con reglas, estadística y algoritmos de grafos en la CPU; nunca llama a un modelo de lenguaje. Un agente que tenga uno igual puede enviar sus propios resultados (entidades extraídas, un resumen), y se guardan con su procedencia como cualquier otra escritura.

## Guarda lo que pasó, y de dónde vino

Guarda el material crudo (un episodio, un mensaje, un documento) como un nodo con su texto, y apunta a él los hechos derivados con `@sources`. Así cada hecho puede decir de dónde salió.

```text
CREATE (e:Episode {at: '2026-11-03', @text: 'Ana said she starts at Orbit Labs next month.'});

MATCH (e:Episode {at: '2026-11-03'}), (a:Person {name: 'Ana Torres'}), (o:Company {name: 'Orbit Labs'})
CREATE (a)-[:works_at {@valid_from: '2025-02-01', @sources: [e.@id]}]->(o);
```

¿Escribes desde una aplicación o un pipeline? Dos herramientas evitan duplicados al entrar:

- **Tus propios ids.** Envía un nodo con el `id` que ya tiene tu sistema (`POST /v1/{ns}/nodes` con `"id": "…"`) y escribirlo de nuevo lo actualiza en vez de crear otro.
- **Claves en un flujo.** `POST /v1/{ns}/ingest` recibe un objeto JSON por línea, cada uno con una `key`; los extremos de las aristas pueden nombrar las claves de otras líneas. Enviar las mismas líneas otra vez no escribe nada:

```json
{"key": "ana",  "node": {"labels": ["Person"],  "props": {"name": "Ana Torres"}}}
{"key": "acme", "node": {"labels": ["Company"], "props": {"name": "Acme Robotics"}}}
{"key": "job1", "edge": {"from": "$ana", "label": "works_at", "to": "$acme"}}
```

```text
primera vez:  {"lines":3,"nodes":2,"edges":1,"duplicates":0,"failed":0}
segunda vez:  {"lines":3,"nodes":0,"edges":0,"duplicates":3,"failed":0}
```

## Encuentra lo mismo con nombres distintos

"Ana Torres", "Ana Torrez" y "A. Torres" pueden ser una persona. Grafeno tiene tres herramientas, de la rápida a la exhaustiva.

**Texto parecido.** Un índice fuzzy encuentra nombres parecidos — errores de tipeo, tildes, mayúsculas, orden de las palabras — sin comparar con cada nodo:

```text
CREATE FUZZY INDEX FOR (p:Person) ON (p.name);
CALL db.searchFuzzy('Person', 'name', 'ana torres', 5) YIELD node, score RETURN node.name, score;
```

```text
 node.name  | score
------------+--------------------
 Ana Torres | 1.0
 Ana Torrez | 0.8181818181818182
(2 rows)
```

Las funciones de similitud están para tus propias reglas: `text.jaroWinkler('Ana Torres', 'Ana Torrez')` da `0.96`; `text.phonetic` compara cómo suenan los nombres (en español o en inglés).

**Reglas de coincidencia.** Decidir que dos registros son lo mismo requiere más que un nombre: dos personas distintas pueden llamarse Ana Torres. Una regla, declarada por etiqueta, pondera varios campos y da dos umbrales — sobre `same` es la misma entidad, entre `review` y `same` debe mirarlo una persona:

```bash
curl -X PUT http://127.0.0.1:7810/v1/demo/match-rules/Person -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{
    "fields": [
      {"key": "name",    "measure": "jaro_winkler", "weight": 2},
      {"key": "born_on", "measure": "date",         "weight": 2},
      {"key": "city",    "measure": "exact",        "weight": 0.5}
    ],
    "same": 0.85, "review": 0.7}'
```

Con dos personas llamadas Ana Torres en el grafo — una nacida en 1990 en Lima, la otra en 1985 en Quito — un registro nuevo con un error de tipeo encuentra a la correcta y descarta a su homónima:

```text
CALL db.match('Person', {name: 'Ana Torrez', born_on: '1990-04-12', city: 'Lima'}, 3)
YIELD node, score, decision RETURN node.city, score, decision;
```

```text
 node.city | score              | decision
-----------+--------------------+-----------
 Lima      | 0.9822222222222222 | same
 Quito     | 0.42666666666666664 | different
(2 rows)
```

**Duplicados probables.** `GET /v1/{ns}/duplicates` lista pares que pueden ser una sola entidad, de mejor a peor, con sus motivos. Una clave fuerte decide: el mismo email (sin importar mayúsculas) es la misma persona; uno distinto, homónimos:

```bash
curl "http://127.0.0.1:7810/v1/demo/duplicates?label=Person&strong_keys=email" -H "Authorization: Bearer $TOKEN"
```

```json
[{"a": {"props": {"name": "Ana Torres", "email": "ana@acme.example"}, "…": "…"},
  "b": {"props": {"name": "A. Torres", "email": "ANA@acme.example"}, "…": "…"},
  "score": 1.0,
  "reasons": ["same email \"ana@acme.example\"", "\"a torres\" and \"ana torres\" share 1 word(s)"],
  "conflicts": []}]
```

## Fusiónalos — y deshazlo si fue un error

`POST /v1/{ns}/merge` funde un nodo en otro: sus hechos pasan al nodo que se queda, sus propiedades llenan los huecos. Pruébalo primero con `dry_run`, que informa los conflictos (hechos en que no coinciden) y no cambia nada:

```bash
curl -X POST http://127.0.0.1:7810/v1/demo/merge -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"keep": "<id de Ana Torres>", "merge": "<id de A. Torres>", "dry_run": true}'
```

Sin `dry_run`, fusiona y devuelve un registro: `{"id": "…", "kept": "…", "merged": "…", "edges_moved": 0, "conflicts": []}`. Cada fusión queda guardada (`GET /v1/{ns}/merges`), y `POST /v1/{ns}/merges/{id}/undo` devuelve ambos nodos a como estaban. Las fusiones que unirían a personas distintas (claves fuertes distintas, un hecho `distinct_from` entre ellas) se rechazan salvo que se fuercen.

## Evita que los hechos se contradigan {#keep-facts-from-contradicting-each-other}

Una persona trabaja en una empresa a la vez. Dilo una vez, con una restricción, y un hecho nuevo termina el viejo en tiempo válido en vez de dejar dos empleadores "actuales":

```text
CREATE CONSTRAINT FOR ()-[r:works_at]->() REQUIRE ONE PER SOURCE;

MATCH (a:Person {name: 'Ana Torres'}), (c:Company {name: 'Acme Robotics'})
CREATE (a)-[:works_at {@valid_from: '2021-03-01'}]->(c);
MATCH (a:Person {name: 'Ana Torres'}), (c:Company {name: 'Orbit Labs'})
CREATE (a)-[:works_at {@valid_from: '2025-02-01'}]->(c);

MATCH (:Person {name: 'Ana Torres'})-[w:works_at]->(c)
RETURN c.name, date(w.@valid_from) AS since, date(w.@valid_to) AS until ORDER BY since;
```

```text
 c.name        | since      | until
---------------+------------+------------
 Acme Robotics | 2021-03-01 | 2025-02-01
 Orbit Labs    | 2025-02-01 | null
(2 rows)
```

No se borró nada: el trabajo viejo terminó donde empieza el nuevo, y el cambio queda registrado (`GET /v1/{ns}/contradictions` los lista todos). Otras reglas:

| Restricción | Significa |
| --- | --- |
| `REQUIRE ONE PER SOURCE` | un hecho actual por nodo de origen (un empleador por persona) |
| `REQUIRE ONE PER TARGET` | uno por nodo de destino (una persona por asiento) |
| `REQUIRE ONE PER PAIR` | uno entre dos nodos (una calificación de una película por persona) |
| `ON CONFLICT FLAG` | conserva ambos y registra la contradicción para revisarla |
| `ON CONFLICT REJECT` | rechaza el hecho nuevo |
| `REQUIRE p.city IS FUNCTIONAL` | un valor de la propiedad a la vez, conservando los anteriores |

`SHOW CONSTRAINTS` las lista y `DROP CONSTRAINT nombre` quita una.

## Deja que las memorias se desvanezcan, y consolídalas

Cada nodo tiene una **importancia** (de 0 a 1, `SET n.@importance = 0.9`) y recuerda cuándo se usó por última vez (el recall lo cuenta). El recall ordena más arriba las memorias importantes y recientes, y lo viejo, poco importante y sin uso se desvanece:

- `GET /v1/{ns}/weak?half_life_days=30` lista las memorias más débiles; `POST /v1/{ns}/archive` las archiva (salen del recall, pero quedan).
- Los **resúmenes** reemplazan muchas memorias pequeñas por una: `POST /v1/{ns}/summaries` con tu texto y los nodos que resume (`"sources": [...]`, `"archive_sources": true`). El resumen apunta a sus fuentes, así no se pierde nada.

## Resúmenes de lo que va junto {#summaries-of-what-belongs-together}

`POST /v1/{ns}/communities/refresh` encuentra grupos de nodos muy conectados entre sí (comunidades, por niveles) y escribe un nodo de resumen para cada uno — sus miembros centrales, términos frecuentes y hechos principales — que se mantiene al día cuando el grafo cambia si `[background]` lo pide. `GET /v1/{ns}/communities?q=robotics` los busca, y el [contexto](../concepts/search-and-recall.md#context) puede incluir los que coinciden, lo que le da a un agente el panorama antes de los detalles.

## Menciones en los textos

`POST /v1/{ns}/extract` lee los textos nuevos y modificados y enlaza lo que mencionan — nombres que ya están en el grafo, emails, URLs, usuarios, fechas, montos y nombres nuevos que se repiten — así los episodios se conectan con las entidades de las que hablan, sin un modelo. Los enlaces dudosos esperan en una cola de revisión (`GET /v1/{ns}/review`).

## Por MCP

Un agente conectado por [MCP](./mcp.md) tiene todo esto como herramientas: `remember`, `relate`, `forget`, `find_matches`, `merge`, `undo_merge`, `extract`, `maintain` (la salud de la memoria, duplicados, memorias débiles y grupos listos para consolidar, en un solo informe), `consolidate`, `feedback`, `summarize_communities`, y para textos largos, sesiones e historia `ingest`, `checkpoint`, `resume`, `timeline` y `contradictions`.
