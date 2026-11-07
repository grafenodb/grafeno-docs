---
title: Download
description: Every installer of the Grafeno engine and of Grafeno Studio, for Windows and Linux.
slug: /download
displayed_sidebar: null
hide_table_of_contents: false
---

# Download

Grafeno comes as two products, installed apart: **the engine** (the database, which runs as a service) and **Grafeno Studio** (the graphical interface, a desktop app). Start with the engine; add the Studio if you want an interface. The links always give the latest release.

| Product | Latest release | What changed |
| --- | --- | --- |
| Grafeno engine | 0.1.0 | [Release notes](https://github.com/grafenodb/grafeno/releases/latest) |
| Grafeno Studio | 0.2.0 | [Release notes](https://github.com/grafenodb/grafeno-studio/releases/latest) |

## The Grafeno engine

### Windows

For Windows 10 and 11, and Windows Server 2019 or later (x64).

| Download | What it is |
| --- | --- |
| **[Installer (.exe)](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-windows-x64-setup.exe)** — recommended | A guided setup: the data folder, the port, the service account, the first administrator. It installs the `Grafeno` service. |
| [Portable (.zip)](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-x86_64-pc-windows-msvc.zip) | The bare `grafeno.exe`, for trying it out or setting it up by hand. |

How to install it, step by step: [Install Grafeno → Windows](./get-started/install.md#windows).

### Linux

**The quickest way**, on RHEL, AlmaLinux, Rocky, Fedora, Debian, Ubuntu and their relatives (x86_64 and ARM): one command installs the right package with your package manager, creates the service and starts it.

```bash
curl -fsSL https://raw.githubusercontent.com/grafenodb/grafeno/main/install.sh | sudo sh
```

Or download the package for your system:

| System | x86_64 (Intel, AMD) | aarch64 (ARM) |
| --- | --- | --- |
| Debian, Ubuntu and derivatives (`.deb`) | [grafeno-linux-amd64.deb](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-amd64.deb) | [grafeno-linux-arm64.deb](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-arm64.deb) |
| RHEL, AlmaLinux, Rocky, Fedora, Oracle Linux, Amazon Linux (`.rpm`) | [grafeno-linux-x86_64.rpm](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-x86_64.rpm) | [grafeno-linux-aarch64.rpm](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-aarch64.rpm) |
| Any Linux, without installing (`.tar.gz`, a static binary) | [grafeno-x86_64-unknown-linux-musl.tar.gz](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-x86_64-unknown-linux-musl.tar.gz) | [grafeno-aarch64-unknown-linux-musl.tar.gz](https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-aarch64-unknown-linux-musl.tar.gz) |

```bash
sudo apt install ./grafeno-linux-amd64.deb        # Debian, Ubuntu
sudo dnf install --nogpgcheck ./grafeno-linux-x86_64.rpm   # RHEL, Fedora (after checking its SHA-256)
```

How to install it, step by step: [Install Grafeno → Linux](./get-started/install.md#linux).

## Grafeno Studio

The desktop app, **Grafeno Desktop**. It needs an engine to connect to — the one you installed, or one on another machine — and installs no engine or service of its own.

| System | Download |
| --- | --- |
| Windows 10 and 11 (x64) | **[Installer (.exe)](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-windows-x64-setup.exe)** — installs for your user, no administrator needed · [Windows Installer (.msi)](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-windows-x64.msi) |
| Debian, Ubuntu (x86_64) | [grafeno-desktop-linux-amd64.deb](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-linux-amd64.deb) |
| RHEL, Fedora (x86_64) | [grafeno-desktop-linux-x86_64.rpm](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-linux-x86_64.rpm) |
| Any Linux (x86_64) | [grafeno-desktop-linux-x86_64.AppImage](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-desktop-linux-x86_64.AppImage) — make it executable and run it |
| A web server | [grafeno-studio-web.zip](https://github.com/grafenodb/grafeno-studio/releases/latest/download/grafeno-studio-web.zip) — the Studio as a static web page; start the engine with `--cors-origin <its address>` |

How to connect it to your engine: [Grafeno Studio](./get-started/studio.md).

## Check a download

Every file has its SHA-256 beside it: add `.sha256` to the link. To check a file you downloaded:

```bash
curl -fsSLO https://github.com/grafenodb/grafeno/releases/latest/download/grafeno-linux-amd64.deb.sha256
sha256sum -c grafeno-linux-amd64.deb.sha256
```

On Windows, in PowerShell: `Get-FileHash .\grafeno-windows-x64-setup.exe` and compare it with the `.sha256` file. The one-line installer checks every file it downloads by itself.

## Earlier versions

Every release, with all its files and notes: [the engine's releases](https://github.com/grafenodb/grafeno/releases) and [Grafeno Studio's releases](https://github.com/grafenodb/grafeno-studio/releases).
