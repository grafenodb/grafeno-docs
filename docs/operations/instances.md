---
title: Instances, upgrades and checks
description: Run several engines on one machine with grafeno setup, check them with grafeno doctor, upgrade safely and roll back.
sidebar_position: 2
---

# Instances, upgrades and checks

An **instance** is one engine: a settings file, a data folder and a service. The packages create the default one when they install; you can run more side by side, as PostgreSQL runs several clusters.

## See your instances

```bash
grafeno instances
```

```text
NAME         ADDRESS                SERVICE                  DATABASE
default      127.0.0.1:7810         running                  /var/lib/grafeno/grafeno.redb
```

| | Default instance | Another instance, `team` |
| --- | --- | --- |
| Settings | `/etc/grafeno/grafeno.toml` | `/etc/grafeno/team.toml` |
| Data | `/var/lib/grafeno/` | `/var/lib/grafeno/team/` |
| Service | `grafeno.service` | `grafeno@team.service` |
| Logs | `journalctl -u grafeno` | `journalctl -u grafeno@team` |

On Windows there is one instance, the `Grafeno` service, with its settings in `C:\ProgramData\Grafeno\grafeno.toml`.

## Add an instance: `grafeno setup`

`grafeno setup` initializes an instance, as `initdb` does for PostgreSQL. It asks what it needs:

```bash
sudo grafeno setup --instance team
```

It asks for the data folder, the port (the next free one after 7810), whether other computers may connect, and the first administrator's name and password. Then it creates everything, enables the service and starts it:

```text
Grafeno instance "team" is ready.
  address   http://127.0.0.1:7811
  data      /var/lib/grafeno/team
  settings  /etc/grafeno/team.toml
  admin     root (sign in with its password)
  service   grafeno@team.service, enabled and running (journalctl -u grafeno@team.service)
Connect with: grafeno shell --config /etc/grafeno/team.toml
```

For scripts, give every answer as a flag (or in a TOML file with `--answers`) and add `--unattended`:

```bash
sudo grafeno setup --unattended --instance team --data /srv/grafeno-team --port 7820 \
  --admin root --admin-password-file /root/team-password
```

A data folder outside `/var/lib/grafeno` is allowed through the service's sandbox and the system's AppArmor or SELinux rules for you. `--no-admin` leaves only the token; `--no-start` enables the service without starting it.

Remove an instance with `sudo grafeno instances drop team` (its service and settings; add `--purge` to delete its data too).

## Check an instance: `grafeno doctor`

```bash
sudo grafeno doctor
```

It checks each instance: the settings and whether other users can read them (they hold the token), the data folder and whether the service may write it, the database's format, the free disk space, the port, and the service. A `FAIL` line says what to fix and the command exits with an error; `warn` and `note` lines are advice. Run it after installing, after changing settings, and after upgrading. `--instance team` checks one.

## Upgrade

Upgrades come like any other package's:

```bash
sudo dnf upgrade grafeno        # or: sudo apt upgrade
```

On Windows, run the new installer over the old one (or `winget upgrade GrafenoDB.Grafeno`); it keeps your settings, data and service account.

Every running instance restarts on the new version. When a new version changes the database file's format (its *layout*), the engine first **copies the file as it was**, next to it (`grafeno.layout-17.redb`, say), and only then upgrades it. If the disk has no room for the copy, the engine refuses to start and the file stays untouched — `grafeno doctor` warns about free space ahead of time.

## Roll back

Something wrong after an upgrade that changed the format? Put the copy back, then install the previous version:

```bash
sudo grafeno instances rollback default
sudo dnf downgrade grafeno      # or: sudo apt install grafeno=<previous version>-1
```

The first command stops the service and restores the copy (what was written since is kept aside as `grafeno.before-rollback-<time>.redb`, not deleted); installing the previous version starts the service again. Once you are happy with an upgrade, delete the copy to recover the space — `grafeno doctor` lists it with its size.

## Remove Grafeno

Removing the package stops every instance and keeps the settings and data. On Debian and Ubuntu, `sudo apt purge grafeno` removes them too. On Windows, the uninstaller asks whether to remove the data (no by default).
