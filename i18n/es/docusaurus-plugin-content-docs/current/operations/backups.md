---
title: Respaldos y restauración
description: Toma respaldos consistentes mientras el motor corre, restáuralos, revisa un archivo y mueve datos con exportaciones.
sidebar_position: 3
---

# Respaldos y restauración

## Toma un respaldo

Un respaldo es una copia consistente de toda la base — cada namespace, las cuentas, los roles y las claves — tomada mientras el motor sigue atendiendo:

```bash
sudo grafeno backup /backups/grafeno-2026-11-07.redb --config /etc/grafeno/grafeno.toml
```

El archivo nuevo no debe existir todavía; Grafeno nunca sobrescribe. En Windows, en un PowerShell de administrador, con `--config C:\ProgramData\Grafeno\grafeno.toml`. Por HTTP, `GET /v1/backup` devuelve el archivo (con el privilegio `backup`), y Grafeno Studio tiene **Administration → Back up the database**.

Prográmalo como cualquier otra tarea (un timer de systemd, cron, el Programador de tareas de Windows) y guarda copias en otro lugar.

## Restaura

`grafeno restore` convierte un respaldo en un archivo de base que puedes usar. Revisa cada página del respaldo, actualiza su formato si vino de una versión anterior, verifica cada namespace, y recién entonces escribe el archivo nuevo — el respaldo solo se lee:

```bash
grafeno restore /backups/grafeno-2026-11-07.redb /var/lib/grafeno/restored.redb
```

```text
Restored /backups/grafeno-2026-11-07.redb into /var/lib/grafeno/restored.redb (… bytes).
```

Para ponerlo en servicio: detén el motor, apunta `db` de la configuración al archivo restaurado (o muévelo adonde apunta `db`), hazlo del servicio (`chown grafeno:grafeno` en Linux) y vuelve a arrancar el motor. La pantalla de inicio de Grafeno Studio también tiene **Recover a backup…**, que hace lo mismo y abre el resultado.

## Revisa un archivo

¿Una copia de un disco que falla, una transferencia interrumpida, un USB viejo? Revísala antes de confiar en ella, sin que nada más la use:

```bash
grafeno check --db /backups/grafeno-2026-11-07.redb
```

Verifica cada página contra su suma de comprobación, luego que los índices y contadores coincidan con los registros, y termina con error si algo está mal.

## Exportaciones: datos que puedes leer y mover

Una exportación es el otro tipo de copia: JSON Lines, un registro por línea, legible con cualquier herramienta y portable entre versiones — pero sin cuentas ni claves.

Desde un motor en marcha, usa la consola:

```bash
sudo grafeno shell --config /etc/grafeno/grafeno.toml --namespace demo -c '\export demo.jsonl'
```

```text
Wrote 2 records to demo.jsonl.
```

y `\import demo.jsonl` la trae de vuelta, al mismo motor o a otro. Sobre un archivo de base que ningún motor esté usando, lo mismo es un comando propio:

```bash
grafeno export --db memory.redb -n demo -o demo.jsonl
grafeno import --db other.redb demo.jsonl
```

Un namespace también puede salir como CSV (`--format csv`: `nodes.csv` y `edges.csv`, con encabezados tipados como `name:int` y `:LABEL`) o GraphML (`--format graphml`), y entrar desde ellos.

| | Respaldo | Exportación |
| --- | --- | --- |
| Qué | todo el archivo de la base | los registros de uno o más namespaces |
| Cuentas, roles, claves | incluidos | no incluidos |
| Legible | no (un archivo de base) | sí (JSON Lines, CSV, GraphML) |
| Para | recuperarse de un desastre | mover datos, otras herramientas, revisar |
