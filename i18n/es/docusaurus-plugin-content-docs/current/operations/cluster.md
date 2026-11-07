---
title: Un clúster
description: Tres motores que guardan los mismos datos, eligen un líder y siguen atendiendo cuando uno falla — probado primero en una sola máquina.
sidebar_position: 4
---

# Un clúster

Tres (o cinco) motores pueden guardar los mismos datos, sincronizados con Raft. Eligen un **líder**, que ordena las escrituras; los demás lo siguen. Cuando el líder falla, el resto elige otro en alrededor de un segundo y sigue. Todos los miembros atienden lecturas, y las lecturas grandes se reparten entre ellos.

Pruébalo primero en una sola máquina, y después repártelo en tres.

## Tres miembros en una máquina

Crea una carpeta con tres archivos de configuración. Cada miembro tiene su propio puerto de API (`addr`), su propio puerto para hablar con los demás (`[cluster] addr`) y su propia base; el resto es igual en todos.

`member-1.toml`:

```toml
db = "member-1.redb"
addr = "127.0.0.1:7811"
token = "change-me"

[cluster]
id = 1
addr = "127.0.0.1:7821"
secret = "one long secret, the same on every member"
voters = [1, 2, 3]
peers = [
  { id = 1, addr = "127.0.0.1:7821", api = "127.0.0.1:7811" },
  { id = 2, addr = "127.0.0.1:7822", api = "127.0.0.1:7812" },
  { id = 3, addr = "127.0.0.1:7823", api = "127.0.0.1:7813" },
]
```

`member-2.toml` y `member-3.toml` son iguales con `2` y `3` en `db`, `addr`, `id` y `[cluster] addr` (`member-2.redb`, `127.0.0.1:7812`, `id = 2`, `127.0.0.1:7822`, y así).

Arranca los tres, cada uno en su terminal:

```bash
grafeno serve --config member-1.toml
grafeno serve --config member-2.toml
grafeno serve --config member-3.toml
```

En uno o dos segundos eligen un líder. Pregúntale a cualquier miembro:

```bash
grafeno cluster status --url http://127.0.0.1:7811 --token change-me
```

```json
{
  "applied": 1,
  "commit": 1,
  "id": 1,
  "leader": 3,
  "role": "follower",
  "…": "…"
}
```

## Escribe en cualquiera, lee en cualquiera

Escribe a través del miembro 2 — un seguidor reenvía la escritura al líder — y léela en el miembro 3:

```bash
grafeno shell --url http://127.0.0.1:7812 --token change-me -c '\ns create team'
grafeno shell --url http://127.0.0.1:7812 --token change-me -n team -c "CREATE (:Note {title: 'written on member 2'});"
grafeno shell --url http://127.0.0.1:7813 --token change-me -n team -c "MATCH (n:Note) RETURN n.title;"
```

```text
 n.title
---------------------
 written on member 2
(1 row)
```

Dales a los clientes todos los miembros, separados por comas, y pasan a otro cuando uno falla:

```bash
grafeno shell --url http://127.0.0.1:7811,http://127.0.0.1:7812,http://127.0.0.1:7813 --token change-me -n team
```

Ahora detén el líder (Ctrl+C en su terminal) y sigue escribiendo desde la consola: tras una pausa breve los dos restantes eligen un líder nuevo y las escrituras siguen. Vuelve a arrancar el miembro detenido y se pone al día solo.

## En tres máquinas

La misma configuración, con la dirección de cada máquina en lugar de `127.0.0.1` (y los mismos puertos en cada una, si quieres: `10.0.0.1:7810` para la API y `10.0.0.1:7811` para los miembros, y así). En motores instalados, pon la sección `[cluster]` en el `grafeno.toml` de cada uno y reinicia los servicios. Abre el puerto de los miembros solo entre ellos: el tráfico entre miembros se autentica con el secreto pero no va cifrado, así que mantenlos en una red privada.

## Qué puedes ajustar

| Quieres | Usa |
| --- | --- |
| Leer tus propias escrituras desde cualquier miembro | los clientes lo hacen por ti (`x-grafeno-after`); o envía `x-grafeno-consistency: linearizable` |
| Reintentar una escritura sin riesgo | una cabecera `Idempotency-Key`: la escritura corre una vez, aunque se envíe muchas |
| Más escrituras por segundo | más grupos Raft (`groups = [...]`), cada uno con su líder, y namespaces ubicados en ellos |
| Vigilarlo | `grafeno cluster status`, las series `grafeno_cluster_*` de `/v1/metrics`, la vista **Cluster** de Grafeno Studio |
| Cambiar los miembros | `grafeno cluster voters 1 2 3 4` en el líder |

Perder un miembro, perder la mayoría, reemplazar un disco y actualizar un clúster tienen guías paso a paso en los [runbooks del clúster](https://github.com/grafenodb/grafeno/blob/main/docs/cluster-runbooks.md) del motor.
