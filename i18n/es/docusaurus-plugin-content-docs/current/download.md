---
title: Descargas
description: Todos los instaladores del motor de Grafeno y de Grafeno Studio, para Windows y Linux.
slug: /download
displayed_sidebar: null
hide_table_of_contents: false
---

# Descargas

Grafeno son dos productos, que se instalan por separado: **el motor** (la base de datos, que corre como servicio) y **Grafeno Studio** (la interfaz gráfica, una app de escritorio). Empieza por el motor; agrega el Studio si quieres una interfaz. Los enlaces siempre dan el último release.

| Producto | Último release | Qué cambió |
| --- | --- | --- |
| Motor de Grafeno | 0.3.0 | [Notas del release](https://github.com/grafenodb/grafeno/releases/latest) |
| Grafeno Studio | 0.3.0 | [Notas del release](https://github.com/grafenodb/grafeno-studio/releases/latest) |

## El motor de Grafeno

### Windows

Para Windows 10 y 11, y Windows Server 2019 o posterior (x64).

| Descarga | Qué es |
| --- | --- |
| **[Instalador (.exe)](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-windows-x64-setup.exe)** — recomendado | Un asistente: la carpeta de datos, el puerto, la cuenta del servicio, el primer administrador. Instala el servicio `Grafeno`. |
| [Portable (.zip)](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-x86_64-pc-windows-msvc.zip) | Solo `grafeno.exe`, para probarlo o configurarlo a mano. |

Cómo instalarlo, paso a paso: [Instalar Grafeno → Windows](./get-started/install.md#windows).

### Linux

**La forma más rápida**, en RHEL, AlmaLinux, Rocky, Fedora, Debian, Ubuntu y sus parientes (x86_64 y ARM): un comando instala el paquete correcto con tu gestor de paquetes, crea el servicio y lo arranca.

```bash
curl -fsSL https://raw.githubusercontent.com/grafenodb/grafeno/main/install.sh | sudo sh
```

O descarga el paquete de tu sistema:

| Sistema | x86_64 (Intel, AMD) | aarch64 (ARM) |
| --- | --- | --- |
| Debian, Ubuntu y derivados (`.deb`) | [grafeno-linux-amd64.deb](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-amd64.deb) | [grafeno-linux-arm64.deb](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-arm64.deb) |
| RHEL, AlmaLinux, Rocky, Fedora, Oracle Linux, Amazon Linux (`.rpm`) | [grafeno-linux-x86_64.rpm](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-x86_64.rpm) | [grafeno-linux-aarch64.rpm](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-aarch64.rpm) |
| Cualquier Linux, sin instalar (`.tar.gz`, un binario estático) | [grafeno-x86_64-unknown-linux-musl.tar.gz](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-x86_64-unknown-linux-musl.tar.gz) | [grafeno-aarch64-unknown-linux-musl.tar.gz](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-aarch64-unknown-linux-musl.tar.gz) |

```bash
sudo apt install ./grafeno-linux-amd64.deb        # Debian, Ubuntu
sudo dnf install --nogpgcheck ./grafeno-linux-x86_64.rpm   # RHEL, Fedora (tras revisar su SHA-256)
```

Cómo instalarlo, paso a paso: [Instalar Grafeno → Linux](./get-started/install.md#linux).

## Grafeno Studio

La app de escritorio, **Grafeno Desktop**. Necesita un motor al cual conectarse — el que instalaste, o uno en otra máquina — y no instala motor ni servicio propios.

| Sistema | Descarga |
| --- | --- |
| Windows 10 y 11 (x64) | **[Instalador (.exe)](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-windows-x64-setup.exe)** — se instala para tu usuario, sin administrador · [Windows Installer (.msi)](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-windows-x64.msi) |
| Debian, Ubuntu (x86_64) | [grafeno-desktop-linux-amd64.deb](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-linux-amd64.deb) |
| RHEL, Fedora (x86_64) | [grafeno-desktop-linux-x86_64.rpm](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-linux-x86_64.rpm) |
| Cualquier Linux (x86_64) | [grafeno-desktop-linux-x86_64.AppImage](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-linux-x86_64.AppImage) — hazlo ejecutable y ábrelo |
| Un servidor web | [grafeno-studio-web.zip](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-studio-web.zip) — el Studio como página web estática; arranca el motor con `--cors-origin <su dirección>` |

Cómo conectarlo a tu motor: [Grafeno Studio](./get-started/studio.md).

## Revisa una descarga

Cada archivo tiene su SHA-256 al lado: agrega `.sha256` al enlace. Para revisar un archivo que descargaste:

```bash
curl -fsSLO https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-amd64.deb.sha256
sha256sum -c grafeno-linux-amd64.deb.sha256
```

En Windows, en PowerShell: `Get-FileHash .\grafeno-windows-x64-setup.exe` y compáralo con el archivo `.sha256`. El instalador de una línea revisa solo cada archivo que descarga.

## Versiones anteriores

Cada release, con todos sus archivos y notas: [los releases del motor](https://github.com/grafenodb/grafeno/releases) y [los releases de Grafeno Studio](https://github.com/grafenodb/grafeno-studio/releases).
