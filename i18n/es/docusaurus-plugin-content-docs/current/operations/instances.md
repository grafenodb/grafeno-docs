---
title: Instancias, actualizaciones y revisiones
description: Corre varios motores en una máquina con grafeno setup, revísalos con grafeno doctor, actualiza con seguridad y vuelve atrás.
sidebar_position: 2
---

# Instancias, actualizaciones y revisiones

Una **instancia** es un motor: un archivo de configuración, una carpeta de datos y un servicio. Los paquetes crean la instancia por defecto al instalarse; puedes correr más, una al lado de otra, como PostgreSQL corre varios clústeres.

## Mira tus instancias

```bash
grafeno instances
```

```text
NAME         ADDRESS                SERVICE                  DATABASE
default      127.0.0.1:7810         running                  /var/lib/grafeno/grafeno.redb
```

| | Instancia por defecto | Otra instancia, `team` |
| --- | --- | --- |
| Configuración | `/etc/grafeno/grafeno.toml` | `/etc/grafeno/team.toml` |
| Datos | `/var/lib/grafeno/` | `/var/lib/grafeno/team/` |
| Servicio | `grafeno.service` | `grafeno@team.service` |
| Logs | `journalctl -u grafeno` | `journalctl -u grafeno@team` |

En Windows hay una instancia, el servicio `Grafeno`, con su configuración en `C:\ProgramData\Grafeno\grafeno.toml`.

## Agrega una instancia: `grafeno setup`

`grafeno setup` inicializa una instancia, como `initdb` en PostgreSQL. Pregunta lo que necesita:

```bash
sudo grafeno setup --instance team
```

Pregunta la carpeta de datos, el puerto (el siguiente libre después de 7810), si otros equipos pueden conectarse, y el nombre y la contraseña del primer administrador. Luego crea todo, habilita el servicio y lo arranca:

```text
Grafeno instance "team" is ready.
  address   http://127.0.0.1:7811
  data      /var/lib/grafeno/team
  settings  /etc/grafeno/team.toml
  admin     root (sign in with its password)
  service   grafeno@team.service, enabled and running (journalctl -u grafeno@team.service)
Connect with: grafeno shell --config /etc/grafeno/team.toml
```

Para scripts, da cada respuesta como opción (o en un archivo TOML con `--answers`) y agrega `--unattended`:

```bash
sudo grafeno setup --unattended --instance team --data /srv/grafeno-team --port 7820 \
  --admin root --admin-password-file /root/team-password
```

Una carpeta de datos fuera de `/var/lib/grafeno` queda permitida por ti en el sandbox del servicio y en las reglas de AppArmor o SELinux del sistema. `--no-admin` deja solo el token; `--no-start` habilita el servicio sin arrancarlo.

Quita una instancia con `sudo grafeno instances drop team` (su servicio y su configuración; agrega `--purge` para borrar también sus datos).

## Revisa una instancia: `grafeno doctor`

```bash
sudo grafeno doctor
```

Revisa cada instancia: la configuración y si otros usuarios pueden leerla (tiene el token), la carpeta de datos y si el servicio puede escribir en ella, el formato de la base, el espacio libre en disco, el puerto y el servicio. Una línea `FAIL` dice qué arreglar y el comando termina con error; las líneas `warn` y `note` son consejos. Ejecútalo después de instalar, de cambiar la configuración y de actualizar. `--instance team` revisa una sola.

## Actualiza

Las actualizaciones llegan como las de cualquier paquete:

```bash
sudo dnf upgrade grafeno        # o: sudo apt upgrade
```

En Windows, ejecuta el instalador nuevo encima del viejo (o `winget upgrade GrafenoDB.Grafeno`); conserva tu configuración, tus datos y la cuenta del servicio.

Cada instancia en marcha se reinicia con la versión nueva. Cuando una versión nueva cambia el formato del archivo de la base (su *layout*), el motor primero **copia el archivo tal como estaba**, a su lado (por ejemplo `grafeno.layout-17.redb`), y recién entonces lo actualiza. Si el disco no tiene espacio para la copia, el motor se niega a arrancar y el archivo queda intacto — `grafeno doctor` avisa antes cuando falta espacio.

## Vuelve atrás

¿Algo anda mal después de una actualización que cambió el formato? Repón la copia e instala la versión anterior:

```bash
sudo grafeno instances rollback default
sudo dnf downgrade grafeno      # o: sudo apt install grafeno=<versión anterior>-1
```

El primer comando detiene el servicio y repone la copia (lo escrito desde entonces se guarda aparte como `grafeno.before-rollback-<hora>.redb`, no se borra); instalar la versión anterior vuelve a arrancar el servicio. Cuando estés conforme con una actualización, borra la copia para recuperar el espacio — `grafeno doctor` la lista con su tamaño.

## Quita Grafeno

Quitar el paquete detiene todas las instancias y conserva la configuración y los datos. En Debian y Ubuntu, `sudo apt purge grafeno` los borra también. En Windows, el desinstalador pregunta si borrar los datos (no, por defecto).
