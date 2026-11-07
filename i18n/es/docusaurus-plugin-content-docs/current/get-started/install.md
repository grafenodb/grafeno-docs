---
title: Instalar Grafeno
description: Instala el motor de Grafeno en Windows o Linux, compruébalo y encuentra su token.
sidebar_position: 1
---

# Instalar Grafeno

Grafeno son dos productos, que se instalan por separado, como PostgreSQL y pgAdmin:

- **El motor** (`grafeno`): la base de datos. Corre como servicio, no tiene interfaz propia y se usa por su API HTTP, su consola (`grafeno shell`), MCP o una biblioteca cliente.
- **Grafeno Studio**: la interfaz gráfica (una app de escritorio, Grafeno Desktop). Es opcional; ve [Grafeno Studio](./studio.md).

Esta página instala el motor. Elige tu sistema. Todos los archivos están también en la página de [Descargas](../download.md).

## Windows

Descarga `grafeno-<versión>-windows-x64-setup.exe` de los [releases](https://github.com/grafenodb/grafeno/releases) (o ejecuta `winget install GrafenoDB.Grafeno`) y ábrelo. Pide permisos de administrador y luego, como el instalador de PostgreSQL, pregunta:

| Pregunta | Por defecto | Qué significa |
| --- | --- | --- |
| Carpeta del programa | `C:\Program Files\Grafeno` | dónde va `grafeno.exe` |
| Carpeta de datos | `C:\ProgramData\Grafeno\data` | dónde vive el archivo de la base; otro disco también sirve |
| Puerto | `7810` | dónde escucha la API |
| Quién puede conectarse | solo este equipo | u otros equipos también (abre el puerto en el firewall) |
| Cuenta del servicio | `NT SERVICE\Grafeno` | una cuenta virtual que solo puede usar las carpetas de Grafeno |
| Primer administrador | `admin` | un usuario que inicia sesión con contraseña (puedes omitirlo) |

Al terminar, el servicio `Grafeno` está corriendo y arranca con Windows. La configuración queda en `C:\ProgramData\Grafeno\grafeno.toml`.

:::tip Instalación desatendida
Cada respuesta también es un parámetro, para scripts:

```powershell
.\grafeno-0.1.0-windows-x64-setup.exe /VERYSILENT /SUPPRESSMSGBOXES /DATADIR="D:\GrafenoData" /PORT=7810 /ADMIN=admin /ADMINPASSWORD="una-contraseña-larga" /TASKS="service,path"
```
:::

## Linux

En RHEL, AlmaLinux, Rocky, Fedora, Debian, Ubuntu y sus parientes, un solo comando agrega el repositorio firmado de paquetes de Grafeno e instala el paquete con tu gestor de paquetes:

```bash
curl -fsSL https://raw.githubusercontent.com/grafenodb/grafeno/main/install.sh | sudo sh
```

Crea el usuario `grafeno`, la instancia por defecto (`/etc/grafeno/grafeno.toml`, datos en `/var/lib/grafeno`) y el servicio systemd `grafeno`, y lo arranca. Las actualizaciones llegan con las del sistema (`dnf upgrade`, `apt upgrade`).

¿Prefieres hacerlo a mano? Descarga el `.deb` o el `.rpm` de los releases e instálalo:

```bash
sudo apt install ./grafeno_0.1.0-1_amd64.deb
```

```bash
sudo dnf install ./grafeno-0.1.0-1.x86_64.rpm
```

Funciona en x86_64 y en aarch64 (ARM). Sin root, el mismo comando instala el programa en `~/.local/bin` (agrega `--service` para un servicio de usuario).

## Comprobar la instalación

`grafeno doctor` revisa la configuración, las carpetas y sus permisos, la base de datos, el espacio libre, el puerto y el servicio:

```bash
sudo grafeno doctor
```

En Windows, en un PowerShell abierto **como administrador**:

```powershell
grafeno doctor
```

Cada línea debería decir `ok` (una `note` es información, no un problema):

```text
default:
  ok    settings /etc/grafeno/grafeno.toml
  ok    data folder /var/lib/grafeno
  ok    the server answers on http://127.0.0.1:7810 (version 0.1.0)
  ok    37.2 GiB free on the disk
  ok    service grafeno.service running, starts with the system
```

También puedes preguntarle al servidor directamente:

```bash
curl http://127.0.0.1:7810/health
```

```json
{"layout":17,"status":"ok","version":"0.1.0"}
```

## Tu token {#your-token}

El instalador escribió un **token** aleatorio en el archivo de configuración. Es la llave del dueño del servidor: quien la tenga puede hacerlo todo. Muéstralo con:

```bash
sudo grafeno config token
```

(En Windows, `grafeno config token` en un PowerShell de administrador.) Lo usarás en los próximos pasos. Guárdalo en secreto; para personas y aplicaciones, crea [cuentas y roles](../guides/access.md).

## ¿Solo quieres probar?

Para experimentar no hace falta instalar nada en el sistema. Con el programa `grafeno` a mano (del `.tar.gz` o `.zip` de un release), levanta un servidor desechable en memoria, que olvida todo al detenerse:

```bash
grafeno serve --memory
```

O abre la consola sobre una base desechable, sin servidor:

```bash
grafeno shell --memory
```

## Siguiente

Sigue con [Tu primer grafo](./first-graph.md): crearás un grafo pequeño, registrarás hechos con fechas, harás preguntas y buscarás.
