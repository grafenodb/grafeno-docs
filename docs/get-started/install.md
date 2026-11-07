---
title: Install Grafeno
description: Install the Grafeno engine on Windows or Linux, check it, and find its token.
sidebar_position: 1
---

# Install Grafeno

Grafeno comes as two products, installed apart, as PostgreSQL and pgAdmin are:

- **The engine** (`grafeno`): the database. It runs as a service, has no interface of its own, and is reached through its HTTP API, its console (`grafeno shell`), MCP, or a client library.
- **Grafeno Studio**: the graphical interface (a desktop app, Grafeno Desktop). It is optional; see [Grafeno Studio](./studio.md).

This page installs the engine. Pick your system. Every file is also on the [Download](../download.md) page.

## Windows

Download `grafeno-<version>-windows-x64-setup.exe` from the [releases](https://github.com/grafenodb/grafeno/releases) (or run `winget install GrafenoDB.Grafeno`) and run it. It asks for administrator rights, then, like PostgreSQL's installer:

| Question | Default | What it means |
| --- | --- | --- |
| Program folder | `C:\Program Files\Grafeno` | where `grafeno.exe` goes |
| Data folder | `C:\ProgramData\Grafeno\data` | where the database file lives; another disk is fine |
| Port | `7810` | where the API listens |
| Who may connect | only this computer | or other computers too (it opens the port in the firewall) |
| Service account | `NT SERVICE\Grafeno` | a virtual account that may only use Grafeno's folders |
| First administrator | `admin` | a user who signs in with a password (you can skip it) |

When it finishes, the `Grafeno` service is running and starts with Windows. The settings are in `C:\ProgramData\Grafeno\grafeno.toml`.

:::tip Unattended installs
Every answer is also a parameter, for scripts:

```powershell
.\grafeno-0.1.0-windows-x64-setup.exe /VERYSILENT /SUPPRESSMSGBOXES /DATADIR="D:\GrafenoData" /PORT=7810 /ADMIN=admin /ADMINPASSWORD="a-long-password" /TASKS="service,path"
```
:::

## Linux

On RHEL, AlmaLinux, Rocky, Fedora, Debian, Ubuntu and their relatives, one command adds Grafeno's signed package repository and installs the package with your package manager:

```bash
curl -fsSL https://raw.githubusercontent.com/grafenodb/grafeno/main/install.sh | sudo sh
```

It creates the `grafeno` user, the default instance (`/etc/grafeno/grafeno.toml`, data in `/var/lib/grafeno`) and the `grafeno` systemd service, and starts it. Later updates arrive with the system's (`dnf upgrade`, `apt upgrade`).

Prefer doing it by hand? Download the `.deb` or `.rpm` from the releases and install it:

```bash
sudo apt install ./grafeno_0.1.0-1_amd64.deb
```

```bash
sudo dnf install ./grafeno-0.1.0-1.x86_64.rpm
```

Both x86_64 and aarch64 (ARM) are supported. Without root, the same one-liner installs the program into `~/.local/bin` (add `--service` for a user service).

## Check the installation

`grafeno doctor` checks the settings, the folders and their permissions, the database, the free disk space, the port and the service:

```bash
sudo grafeno doctor
```

On Windows, run it in a PowerShell opened **as administrator**:

```powershell
grafeno doctor
```

Every line should say `ok` (a `note` is information, not a problem):

```text
default:
  ok    settings /etc/grafeno/grafeno.toml
  ok    data folder /var/lib/grafeno
  ok    the server answers on http://127.0.0.1:7810 (version 0.1.0)
  ok    37.2 GiB free on the disk
  ok    service grafeno.service running, starts with the system
```

You can also ask the server directly:

```bash
curl http://127.0.0.1:7810/health
```

```json
{"layout":17,"status":"ok","version":"0.1.0"}
```

## Your token

The installer wrote a random **token** in the settings file. It is the key of the server's owner: anything that has it can do everything. Print it with:

```bash
sudo grafeno config token
```

(On Windows, `grafeno config token` in an administrator PowerShell.) You will use it in the next steps. Keep it secret; for people and applications, create [accounts and roles](../guides/access.md) instead.

## Just trying it out?

You do not need to install anything system-wide to experiment. With the `grafeno` program on hand (from the `.tar.gz` or `.zip` of a release), run a throwaway server in memory, which forgets everything when it stops:

```bash
grafeno serve --memory
```

Or open the console on a throwaway database, with no server at all:

```bash
grafeno shell --memory
```

## Next

Continue with [Your first graph](./first-graph.md): you will create a small graph, record facts with dates, ask questions, and search.
