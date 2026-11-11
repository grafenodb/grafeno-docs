---
title: Grafeno Studio
description: Instala la app de escritorio, conéctala a tu motor con el token y un administrador, o abre un archivo de base de datos.
sidebar_position: 3
---

# Grafeno Studio

Grafeno Studio es la interfaz gráfica de Grafeno: recorre y edita el grafo, lo dibuja, ejecuta scripts GQ, busca, cuida la memoria y administra usuarios y roles. Es un producto aparte del motor, se instala por su cuenta y habla con los motores solo por su API HTTP, como cualquier otro cliente.

Viene como app de escritorio, **Grafeno Desktop**, para Windows y Linux. No lleva motor dentro: usa el motor que [instalaste](./install.md).

## Instálalo

Descárgalo de la página de [Descargas](../download.md#grafeno-studio) (o de los [releases de Grafeno Studio](https://github.com/grafenodb/grafeno-studio/releases)):

| Sistema | Archivo |
| --- | --- |
| Windows 10 y 11 | `Grafeno Desktop_<versión>_x64-setup.exe` (se instala para tu usuario, sin administrador) o el `.msi` |
| Debian, Ubuntu | `Grafeno Desktop_<versión>_amd64.deb` |
| Fedora, RHEL y parientes | `Grafeno Desktop-<versión>-1.x86_64.rpm` |
| Cualquier Linux | `.AppImage` |

La app de escritorio no instala servicio ni motor, y quitarla deja el motor y sus datos intactos.

## Conéctate a tu motor

Abre Grafeno Desktop. La pantalla de inicio tiene dos lados: archivos de este equipo y servidores.

1. En **A Grafeno server**, pulsa **The Grafeno service on this computer**. La app encontró el motor que instalaste en `127.0.0.1:7810` y llena su dirección.
2. Pega el **token** del servidor en *Token or key* (`grafeno config token`, como administrador, lo muestra — ve [Tu token](./install.md#your-token)) y pulsa **Connect**. La app comprueba que el servidor lo acepte.
3. Inicia sesión como **administrador**: el nombre y la contraseña del primer administrador que creaste al instalar el motor. La ventana trabaja entonces como esa cuenta.

Si el servidor todavía no tiene cuentas, el segundo paso ofrece crear su primer administrador. **Continue with the token only** se salta el inicio de sesión y trabaja con los permisos del token.

Marca **Keep it in the list** para encontrar el servidor en la pantalla de inicio la próxima vez. Los servidores de otras máquinas funcionan igual: escribe su dirección (`http://10.0.0.5:7810`). Para un [clúster](../operations/cluster.md), escribe sus miembros separados por comas; la app pasa a otro miembro si uno falla.

## Abre un archivo de base de datos

También puedes trabajar directo sobre un archivo, sin servicio: **New database…** u **Open…** en *On this computer*. La app arranca para ese archivo el motor que instalaste, en un puerto privado con una llave propia, y lo detiene al cerrar el archivo o la ventana. Si no hay motor instalado, la pantalla de inicio lo dice y enlaza a su instalador.

Puedes tener varias ventanas abiertas a la vez (**File → New window**, Ctrl+Shift+N), cada una con su servidor o archivo.

## Un recorrido por las vistas

| Vista | Qué hace |
| --- | --- |
| **Overview** | los namespaces y qué contiene cada uno |
| **Explorer** | recorre nodos, abre uno con sus hechos, crea y edita |
| **Graph** | dibuja el grafo y lo manipula: expande vecinos, filtra por fecha, arrastra |
| **Scripts** | escribe y ejecuta GQ; resultados como tabla, JSON, grafo o gráfico |
| **Search** | búsqueda de texto, recall y el contexto que recibiría un agente |
| **Memory** | duplicados, memorias débiles, consolidación en resúmenes |
| **Administration** | revisa y reconstruye índices, exporta, importa, respalda |
| **Cluster** | miembros, grupos Raft, retraso, dónde vive cada namespace (en un clúster) |
| **Access** | usuarios, roles y sus privilegios |

Las vistas que el motor no ofrece se ocultan: el Studio le pregunta a cada motor qué puede hacer al conectarse.

:::tip Haz el recorrido del primer grafo en el Studio
Abre **Scripts**, elige el namespace `demo` y pega las sentencias de [Tu primer grafo](./first-graph.md). Luego cambia el resultado a **Graph**.
:::

## En un navegador

El Studio también corre como página web (su build web, alojado en cualquier servidor web). Arranca el motor con `--cors-origin <la dirección de esa página>` para que el navegador pueda llamarlo.
