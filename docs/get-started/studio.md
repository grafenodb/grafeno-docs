---
title: Grafeno Studio
description: Install the desktop app, connect it to your engine with the token and an administrator, or open a database file.
sidebar_position: 3
---

# Grafeno Studio

Grafeno Studio is Grafeno's graphical interface: browse and edit the graph, draw it, run GQ scripts, search, look after memory, and manage users and roles. It is a separate product from the engine, installed on its own, and it talks to engines only through their HTTP API — like pgAdmin next to PostgreSQL.

It comes as a desktop app, **Grafeno Desktop**, for Windows and Linux. It has no engine inside: it uses the engine you [installed](./install.md).

## Install it

Download it from the [Grafeno Studio releases](https://github.com/grafenodb/grafeno-studio/releases):

| System | File |
| --- | --- |
| Windows 10 and 11 | `Grafeno Desktop_<version>_x64-setup.exe` (installs for your user, no administrator needed) or the `.msi` |
| Debian, Ubuntu | `Grafeno Desktop_<version>_amd64.deb` |
| Fedora, RHEL and relatives | `Grafeno Desktop-<version>-1.x86_64.rpm` |
| Any Linux | `.AppImage` |

The desktop app installs no service and no engine, and removing it leaves the engine and its data alone.

## Connect to your engine

Open Grafeno Desktop. The start screen has two sides: files on this computer, and servers.

1. Under **A Grafeno server**, click **The Grafeno service on this computer**. The app found the engine you installed on `127.0.0.1:7810`, and fills in its address.
2. Paste the server's **token** in *Token or key* (`grafeno config token`, run as administrator, prints it — see [Your token](./install.md#your-token)) and click **Connect**. The app checks that the server accepts it.
3. Sign in as an **administrator**: the name and password of the first administrator you created when installing the engine. The window then works as that account.

If the server has no accounts yet, the second step offers to create its first administrator instead. **Continue with the token only** skips the sign-in and works with the token's rights.

Tick **Keep it in the list** to find the server on the start screen next time. Servers on other machines work the same way: type their address (`http://10.0.0.5:7810`). For a [cluster](../operations/cluster.md), type its members separated by commas; the app moves to another member if one fails.

## Open a database file

You can also work on a database file directly, with no service: **New database…** or **Open…** under *On this computer*. The app starts the engine you installed for that file, on a private port with a key of its own, and stops it when you close the file or the window. If no engine is installed, the start screen says so and links to its installer.

Several windows can be open at once (**File → New window**, Ctrl+Shift+N), each with its own server or file.

## A tour of the views

| View | What it does |
| --- | --- |
| **Overview** | the namespaces and what each holds |
| **Explorer** | browse nodes, open one with its facts, create and edit |
| **Graph** | draw the graph and handle it: expand neighbors, filter by date, drag |
| **Scripts** | write and run GQ, see results as a table, JSON, a graph or a chart |
| **Search** | full-text search, recall and the context an agent would get |
| **Memory** | duplicates, weak memories, consolidation into summaries |
| **Administration** | check and rebuild indexes, export, import, back up |
| **Cluster** | members, Raft groups, lag, where namespaces live (on a cluster) |
| **Access** | users, roles and their privileges |

Views the engine does not offer are hidden: the Studio asks each engine what it can do when it connects.

:::tip Try the first-graph tour in the Studio
Open **Scripts**, pick the `demo` namespace, and paste the statements of [Your first graph](./first-graph.md). Then switch the result to **Graph**.
:::

## In a browser

The Studio also runs as a web page (its web build, hosted on any web server). Start the engine with `--cors-origin <that page's address>` so the browser may call it.
