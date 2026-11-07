---
title: MCP para agentes
description: Expón herramientas de memoria y grafos mediante Model Context Protocol.
---

# MCP para agentes

`grafeno mcp` habla MCP por la entrada y salida estándar. El cliente inicia el proceso e intercambia JSON-RPC; los logs van a la salida de error.

```bash
grafeno mcp --db agente.redb --namespace yo
```

Cada herramienta acepta un `namespace` opcional. Si se omite, usa `--namespace`.

## Flujo de memoria

| Herramienta | Propósito |
| --- | --- |
| `remember` | Guardar una memoria y enlaces opcionales. |
| `recall` | Recuperación híbrida con razones de coincidencia. |
| `context` | Renderizar memorias y hechos dentro de un presupuesto de tokens. |
| `relate` | Registrar un hecho fechado entre nodos. |
| `update` | Cambiar texto, nombre, propiedades, etiquetas o importancia. |
| `forget` | Invalidar, retractar o eliminar un hecho; eliminar un nodo. |
| `get_node` | Leer un nodo y los hechos que lo conectan. |
| `query` | Ejecutar GQ de solo lectura, hasta 200 filas. |

Las herramientas de mantenimiento incluyen `find_matches`, `merge`, `undo_merge`, `extract`, `add_mentions`, `review`, `resolve_review`, `maintain`, `consolidate`, `overview`, `summarize_communities`, `set_summary` y `changes`.

## Limita un agente

```bash
grafeno mcp --db agente.redb --namespace yo \
  --allow yo,compartido-* --read-only
```

| Opción | Efecto |
| --- | --- |
| `--allow vault,team-*` | Limitar los namespaces que puede usar el agente. |
| `--read-only` | Ofrecer solo herramientas de lectura; recall no registra accesos. |
| `--as NOMBRE` | Guardar `NOMBRE` en `@recorded_by` para sus escrituras. |
| `--own-only` | Con `--as`, permitir cambios solo a registros de ese actor. |

:::warning Propiedad de la base
El proceso MCP abre su archivo directamente. No puede compartirlo con `grafeno serve` ni con otro proceso MCP. Usa archivos distintos para agentes separados, salvo que el cliente se integre mediante la API HTTP.
:::
