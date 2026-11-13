---
title: CLI de administración
description: Inspecciona, respalda, exporta, importa, comprueba y reconstruye datos.
---

# CLI de administración

Un solo programa, `grafeno`, es el servidor, la consola y todos los comandos de administración. `grafeno --help` los lista, y `grafeno <comando> --help` explica uno.

## La instalación

| Comando | Propósito |
| --- | --- |
| `grafeno setup` | Crea una instancia: carpeta de datos, configuración, primer administrador, servicio ([Instancias](./instances.md)). |
| `grafeno instances` | Lista las instancias; quita una (`drop`) o vuelve atrás una tras actualizar (`rollback`). |
| `grafeno doctor` | Revisa configuración, permisos, la base, el espacio en disco, el puerto y el servicio. |
| `grafeno config token` | Muestra el token del servidor (`config path` muestra dónde está la configuración). |
| `grafeno serve --config F` | Corre el servidor en primer plano (es lo que hacen los servicios). |
| `grafeno restore RESPALDO NUEVO` | Recupera un respaldo en un archivo de base nuevo ([Respaldos](./backups.md)). |

## Acceso

| Comando | Propósito |
| --- | --- |
| `grafeno users list \| create \| password \| disable \| delete` | Cuentas ([Usuarios, roles y permisos](../guides/access.md)). |
| `grafeno keys list \| create \| revoke` | Claves de API para programas y agentes. |
| `grafeno roles`, `grafeno grants` | Roles y sus privilegios. |

Estos aceptan `--config F` para trabajar a través de un servidor en marcha, o `--db F` para abrir un archivo directamente.

## Los datos

Los comandos de abajo inspeccionan y reparan los datos. Los comandos con `--db` abren el archivo directamente; primero detén cualquier servidor o proceso MCP que sea su dueño.

| Comando | Propósito |
| --- | --- |
| `grafeno namespaces --db F` | Listar namespaces y cantidades de nodos y relaciones. |
| `grafeno stats --db F [-n NS]` | Imprimir estadísticas como JSON. |
| `grafeno check --db F [-n NS]` | Verificar checksums, registros, índices y contadores. |
| `grafeno check --db F --recall 100` | También estimar recall@10 de búsqueda vectorial. |
| `grafeno compact --db F -n NS` | Reconstruir el grafo vectorial de un namespace y el de cada uno de sus índices vectoriales. El servidor también lo hace por su cuenta con un grafo desgastado más allá de `compact_vectors_at`. |
| `grafeno rebuild --db F -n NS` | Reconstruir índices y contadores desde los registros. |
| `grafeno extract --db F -n NS` | Enlazar menciones de textos nuevos o modificados. |
| `grafeno export --db F -o datos.jsonl` | Exportar JSON Lines. |
| `grafeno import --db F datos.jsonl` | Importar una exportación en una transacción. |

Usa `--all` en vez de `-n NS` donde corresponda. CSV y GraphML están disponibles con `--format csv` o `--format graphml`; esos formatos se dirigen a un solo namespace.

## Respaldo consistente

`backup` crea un archivo nuevo y se niega a sobrescribir uno existente.

```bash
grafeno backup snapshot.redb --db grafeno.redb
```

Para respaldar un servidor en marcha sin detenerlo, apunta a su URL o configuración en vez de abrir su archivo. El servidor continúa atendiendo mientras produce la copia consistente.

## Una secuencia segura de mantenimiento

1. Crea un respaldo.
2. Ejecuta `check` y conserva su salida.
3. Usa `rebuild` solo si el reporte identifica índices o contadores inconsistentes.
4. Usa `compact` si el problema es el recall o la alcanzabilidad de vectores, o si `check` informa de muchas eliminaciones desde que se construyó un grafo.
5. Vuelve a ejecutar `check`.

`rebuild` y `compact` reparan estructuras derivadas; no sustituyen un respaldo.
