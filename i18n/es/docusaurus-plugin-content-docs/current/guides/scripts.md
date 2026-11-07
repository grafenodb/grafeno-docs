---
title: Ejecutar scripts
description: Ejecuta archivos GQ y metacomandos de la consola, de forma interactiva o automatizada.
---

# Ejecutar scripts

`grafeno shell` acepta entrada interactiva, un comando, un archivo o la entrada estándar. Devuelve un código distinto de cero si una sentencia falla, por lo que puede usarse en CI y scripts de aplicaciones.

## Ejecuta un comando

Contra un servidor en marcha:

```bash
grafeno shell --url http://127.0.0.1:7810 -n demo \
  -c "MATCH (n) RETURN count(n);"
```

Usa `--json` para obtener resultados procesables por programas:

```bash
grafeno shell --url http://127.0.0.1:7810 -n demo --json \
  -c "MATCH (n:Person) RETURN n.@id, n.name;"
```

## Ejecuta un archivo

Crea `personas.gq`:

```text
CREATE (:Person {name: 'Ana'});
CREATE (:Person {name: 'Luis'});
MATCH (p:Person) RETURN p.name ORDER BY p.name;
```

Ejecútalo:

```bash
grafeno shell --url http://127.0.0.1:7810 -n demo -f personas.gq
```

Usa `-f -` para leer la entrada estándar. Dentro de una sesión interactiva u otro script, `\i ARCHIVO` incluye un archivo.

## Metacomandos

Los metacomandos ocupan su propia línea y no terminan en `;`.

| Comando | Propósito |
| --- | --- |
| `\?` | Mostrar la ayuda. |
| `\ns` | Listar namespaces. |
| `\ns create NOMBRE` | Crear un namespace vacío. |
| `\ns drop NOMBRE --yes` | Eliminar un namespace y sus datos. |
| `\use NOMBRE` | Cambiar de namespace. |
| `\stats`, `\check`, `\rebuild` | Inspeccionar o reparar el namespace actual. |
| `\search TEXTO`, `\recall TEXTO`, `\context TEXTO` | Probar la recuperación. |
| `\export ARCHIVO`, `\import ARCHIVO` | Mover datos JSON Lines. |
| `\format table|json` | Elegir el formato de salida. |
| `\timing on|off` | Mostrar la duración de las sentencias. |
| `\i ARCHIVO` | Ejecutar otro script. |
| `\q` | Salir. |

## Archivo o servidor

`--db datos.redb` abre un archivo directamente. `--url` conecta con un motor en marcha. Prefiere `--url` para scripts operativos: el servidor conserva la propiedad de su base y sigue atendiendo a otros clientes.

Para las credenciales, usa `GRAFENO_TOKEN` en vez de guardar un token en el historial de la terminal. La URL de un clúster puede contener miembros separados por comas; la consola prueba otro si uno no está disponible.
