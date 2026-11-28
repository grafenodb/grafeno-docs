---
title: Almacenamiento y migraciones
description: Lo que ocupa la base de datos en disco, cómo llevar un archivo escrito por una versión anterior a los formatos actuales, devolver espacio y volver atrás.
sidebar_position: 5
---

# Almacenamiento y migraciones

Desde la 0.6.0 el motor guarda los datos en formatos más pequeños y rápidos: valores comprimidos con un diccionario por namespace, nodos y aristas como registros binarios tipados, índices de texto completo con una entrada por término y nodo, grafos vectoriales que guardan los vecinos como números pequeños, e índices creados automáticamente en los namespaces nuevos de un servidor. Juntos ocupan entre un 21% y un 47% menos que la 0.5.3, cargan hasta un 35% más rápido y leen muchos registros entre un 10% y un 24% más rápido, con las mismas respuestas en cada consulta.

Una base escrita por una versión anterior se abre tal como está: no se reescribe nada al abrirla, y lo que guarda se queda en el formato en que se escribió. Las escrituras y los índices nuevos usan los formatos nuevos. `grafeno storage` pone al día lo que ya está guardado, y lo devuelve.

## Lo que ocupa una base

```bash
grafeno storage stats --config /etc/grafeno/grafeno.toml
grafeno storage status --config /etc/grafeno/grafeno.toml
```

`stats` muestra lo que ocupa cada tabla y el espacio libre y fragmentado (`--namespaces` por namespace). `status` lista el trabajo pendiente: el espacio que devolvería una compactación, los namespaces sin diccionarios o sin política de indexación, y las migraciones registradas. Por HTTP, los propietarios tienen `GET /v1/storage`.

## Poner un archivo al día

Detén el servidor que usa el archivo (o mira [Con el servidor en marcha](#con-el-servidor-en-marcha)) y deja sitio para el doble del archivo: la migración lo copia primero, como `<archivo>.before-<id>.redb`. Luego mira el plan, que no cambia nada:

```bash
grafeno storage plan --config /etc/grafeno/grafeno.toml \
  --encoding compressed --reindex-existing --fulltext postings \
  --vector-links numbers --verify --compact
```

y aplícalo:

```bash
grafeno storage apply --config /etc/grafeno/grafeno.toml \
  --encoding compressed --reindex-existing --fulltext postings \
  --vector-links numbers --verify --compact
```

| Opción | Qué hace |
| --- | --- |
| `--encoding compressed` | Entrena diccionarios y reescribe registros, textos y registros de cambios comprimidos (`json` vuelve atrás) |
| `--reindex-existing` | Reconstruye todos los índices; los de texto completo en el formato de `--fulltext` |
| `--fulltext postings\|entries` | El formato de los índices de texto completo |
| `--vector-links numbers\|ids` | Compacta cada espacio vectorial en este formato |
| `--indexing automatic\|hybrid\|manual` | Da a los namespaces esta [política de indexación](../gq/namespaces.md#política-de-indexación) y crea los índices que pide para sus datos |
| `-n <namespace>` | Solo estos namespaces (todos por defecto) |
| `--verify` | Comprueba cada namespace al final contra un resumen de sus registros tomado antes |
| `--compact` | Compacta el archivo después |

La migración avanza por lotes, cada uno confirmado con su punto de control. Si se detiene, el archivo es válido y queda migrado en parte, y `grafeno storage resume --config …` la termina. Volver a ejecutar `apply` con las mismas opciones no cambia nada; `grafeno storage verify` comprueba los namespaces en cualquier momento. Con 100.000 entidades de catálogo (1 GiB), una migración completa con compactación tardó cerca de un minuto.

El repositorio del motor tiene scripts que hacen todo esto para un servicio, deteniéndolo y arrancándolo alrededor de la migración: `packaging/scripts/storage-upgrade.sh` para un servicio de systemd, `storage-upgrade.ps1` para el servicio de Windows y `storage-upgrade-container.sh` para un contenedor o un servicio de Compose.

### En un contenedor

La imagen ejecuta cualquier comando de `grafeno`, así que el volumen de un contenedor detenido se migra con la misma imagen:

```bash
docker stop grafeno
docker run --rm --volumes-from grafeno ghcr.io/grafenodb/grafeno:0.6.0 \
  storage apply --config /data/grafeno.toml --encoding compressed \
  --reindex-existing --fulltext postings --vector-links numbers --verify --compact
docker start grafeno
```

### Con el servidor en marcha

Los propietarios pueden migrar sin detener el servidor: `POST /v1/storage/migrations` con `{"options": {...}, "dry_run": true}` hace el plan, y sin `dry_run` la ejecuta lote a lote entre otras escrituras; `GET /v1/storage/migrations` las lista.

## Devolver espacio

Los borrados dejan páginas libres en el archivo. `grafeno vacuum --db F` las devuelve con el servidor detenido (`--maximum` también junta las páginas a medio llenar). Un servidor en marcha se compacta solo, sin detenerse: `POST /v1/storage/compact` (propietarios), o con un horario:

```toml
[maintenance]
compact = "window"
window = "02:00-04:00"   # UTC
```

Las peticiones que llegan durante una pasada la esperan, una fracción de segundo: en un archivo de 272 MiB con tres cuartas partes borradas, una compactación tardó 0,4 s y dejó 57 MiB.

## Volver atrás

La 0.5.x rechaza, con un mensaje (nunca lo lee mal), un archivo que tiene un formato nuevo. Para volver a abrirlo con una versión anterior, deja cada formato con su ajuste y una migración:

| Para dejar | Ejecuta |
| --- | --- |
| Registros comprimidos | `[storage] compression = "off"`, luego `grafeno storage apply --encoding json --verify` |
| Postings de texto completo | `[storage] fulltext = "entries"`, luego `grafeno storage apply --fulltext entries --reindex-existing --verify` |
| Enlaces vectoriales por número | `[storage] vector_links = "ids"`, luego `grafeno storage apply --vector-links ids --verify` |

Restaurar la copia que hizo `apply` también vuelve atrás, perdiendo lo escrito después.

## En un clúster

Un miembro que se queda atrás recibe una instantánea del archivo de otro, que una versión anterior rechaza en cuanto tiene un formato nuevo. Primero pasa todos los miembros a la 0.6.0 con los formatos nuevos apagados:

```toml
[storage]
compression = "off"
fulltext = "entries"
vector_links = "ids"
```

Cuando todos la ejecuten, quita esas líneas y reinicia los miembros de uno en uno; luego migra un miembro cada vez, con su servidor detenido, esperando a que `grafeno cluster status` lo muestre al día antes de pasar al siguiente.
