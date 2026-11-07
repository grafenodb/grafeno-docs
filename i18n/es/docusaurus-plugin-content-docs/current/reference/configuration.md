---
title: Configuración
description: Cada opción de grafeno.toml, qué hace y su valor por defecto.
sidebar_position: 2
---

# Configuración

El motor lee su configuración de `grafeno.toml`: lo leen el servicio, `grafeno serve --config` y `grafeno shell --config`. Reinicia el servicio después de cambiarlo. Dónde está:

| Sistema | Archivo |
| --- | --- |
| Linux (paquetes) | `/etc/grafeno/grafeno.toml` (otras instancias: `/etc/grafeno/<nombre>.toml`) |
| Windows (instalador) | `C:\ProgramData\Grafeno\grafeno.toml` |
| Cualquiera | `grafeno config path` lo muestra |

`grafeno config init` escribe uno nuevo con un token nuevo; `grafeno config token` muestra el token. Las opciones de línea de comandos y las variables de entorno (`GRAFENO_DB`, `GRAFENO_ADDR`, `GRAFENO_TOKEN`) tienen prioridad sobre el archivo. Toda opción es opcional: lo que falta toma el valor por defecto que se muestra.

## Lo esencial

```toml
db = "/var/lib/grafeno/grafeno.redb"   # el archivo de la base
addr = "127.0.0.1:7810"                # dónde escucha la API; "0.0.0.0:7810": todas las interfaces
token = "…"                            # el secreto del dueño; cada solicitud a /v1 lo necesita, o una clave, o una sesión
cors_origins = []                      # páginas web que pueden llamar a la API desde un navegador ("*": cualquiera)
durability = "immediate"               # o "eventual": escrituras más rápidas, un corte pierde a lo sumo 0,5 s
max_requests = 512                     # atendidas a la vez; más reciben 503 con Retry-After
copy_before_upgrade = true             # copia la base antes de que una versión nueva cambie su formato
```

:::warning Antes de abrir el puerto
Escucha más allá de `127.0.0.1` solo con un token (o cuentas) y detrás de TLS, por ejemplo un proxy inverso como Caddy o nginx. El motor habla HTTP sin cifrar.
:::

## `[query]`: límites de cada consulta

```toml
[query]
timeout_secs = 30
max_reads = 50000000        # nodos, aristas y entradas de índice que una consulta puede leer
max_rows = 1000000          # filas a la vez
max_memory_mb = 512         # un valor que arma una consulta, o las filas que retiene
max_cost = 0                # rechaza consultas con un costo estimado mayor (0: desactivado)
scan_threads = 0            # hilos que comparten los recorridos grandes (0: uno por CPU; 1: ninguno)
```

Una consulta que pasa un límite se detiene con un error que lo nombra; `0` desactiva un límite.

## `[memory]`: cachés, en MiB

```toml
[memory]
cache_mb = 256              # páginas del archivo de la base
projection_cache_mb = 256   # grafos guardados para algoritmos
vector_cache_mb = 128       # vectores decodificados al insertar embeddings
```

Estas cachés son la mayor parte de la memoria que guarda Grafeno; el resto es por solicitud y está acotado por `[query]`. Con 10 millones de aristas, el motor se mantiene cerca de 300 MiB con los valores por defecto. En una máquina de 512 MiB, `cache_mb = 128` y `projection_cache_mb = 64`.

## `[writer]`: la confirmación en grupo

```toml
[writer]
max_batch = 512             # escrituras confirmadas juntas, como máximo
queue = 4096                # escrituras que pueden esperar; más reciben 503
flush_ms = 500              # con durabilidad eventual, cada cuánto llegan al disco
import_chunk = 2000         # registros por transacción de una importación masiva
```

Las escrituras concurrentes se confirman juntas, cada una igual todo-o-nada por su cuenta: unas 11 000 escrituras por segundo en un SSD con durabilidad inmediata.

## `[auth]`: cuentas e inicio de sesión

```toml
[auth]
session_minutes = 15        # la vida de un token de acceso (las sesiones lo renuevan)
refresh_days = 30           # la vida de una sesión
lockout_attempts = 5        # inicios de sesión fallidos que bloquean una cuenta por un rato
address_attempts = 20       # inicios de sesión fallidos que rechazan una dirección por un rato
lockout_minutes = 15
```

## `[changes]` y `[audit]`: qué se conserva

```toml
[changes]                   # el registro de cambios que siguen los flujos y webhooks
enabled = true
max_entries = 1000000       # por namespace; 0 sin límite
max_age_days = 7            # 0 sin límite

[audit]                     # el registro de seguridad
max_entries = 10000000
max_age_days = 365
```

## `[background]`: trabajo que sigue a los cambios

```toml
[background]
extract = ["notes"]             # enlaza lo que mencionan los textos nuevos y modificados, en estos namespaces
communities = ["notes"]         # mantiene al día los resúmenes de comunidades
communities_every_secs = 300
communities_min_changes = 50
```

## `[cluster]`: pertenencia a un clúster

```toml
[cluster]
id = 1
addr = "10.0.0.1:7811"          # dónde escucha este miembro a los demás
secret = "…"                    # el mismo en todos los miembros
voters = [1, 2, 3]              # los primeros miembros; [] en un miembro que se suma después
peers = [
  { id = 1, addr = "10.0.0.1:7811", api = "10.0.0.1:7810" },
  { id = 2, addr = "10.0.0.2:7811", api = "10.0.0.2:7810" },
  { id = 3, addr = "10.0.0.3:7811", api = "10.0.0.3:7810" },
]
```

Ve [Un clúster](../operations/cluster.md).

## Ver con qué corre un servidor

Un superusuario puede pedirle a un servidor en marcha su configuración, sin el token ni el secreto del clúster:

```bash
curl http://127.0.0.1:7810/v1/settings -H "Authorization: Bearer $TOKEN"
```
