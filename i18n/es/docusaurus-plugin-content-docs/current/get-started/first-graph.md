---
title: Tu primer grafo
description: Un recorrido guiado en la consola — crea personas y empresas, registra hechos con fechas, cambia un hecho, viaja en el tiempo y busca.
sidebar_position: 2
---

# Tu primer grafo

En quince minutos vas a armar un grafo pequeño de personas y las empresas donde trabajan, registrar *cuándo* fue cierto cada hecho, cambiar un hecho sin perder la historia, preguntar qué era cierto en otro momento y buscar texto. Cada resultado de abajo es lo que Grafeno responde.

## 1. Abre la consola

`grafeno shell` es la consola de Grafeno, como `psql` para PostgreSQL. Conéctala al motor que instalaste, con el archivo de configuración (tiene la dirección y el token):

```bash
sudo grafeno shell --config /etc/grafeno/grafeno.toml
```

En Windows, en un PowerShell de administrador:

```powershell
grafeno shell --config C:\ProgramData\Grafeno\grafeno.toml
```

:::tip ¿No tienes un motor instalado?
`grafeno shell --memory` abre una base desechable dentro de la misma consola. Todo lo de abajo funciona igual; se olvida al salir.
:::

Las sentencias terminan en `;` y pueden ocupar varias líneas. Los comandos que empiezan con `\` son de la consola: `\?` los lista y `\q` sale.

## 2. Crea un namespace

En Grafeno todo vive en un **namespace**: uno por persona, equipo, aplicación o agente. Una consulta nunca entra en otro namespace salvo que lo pidas.

```text
\ns create demo
```

```text
Created namespace "demo"; now on it.
```

## 3. Crea nodos

Los nodos son las cosas: personas, empresas, notas. Cada uno tiene al menos una **etiqueta** (`Person`, `Company`) y **propiedades**. El lenguaje de consultas de Grafeno es **GQ**, parecido a Cypher:

```cypher
CREATE (ana:Person {name: 'Ana Torres', role: 'engineer'}),
       (bob:Person {name: 'Bob Rivera', role: 'designer'}),
       (acme:Company {name: 'Acme Robotics', city: 'Lima'}),
       (orbit:Company {name: 'Orbit Labs', city: 'Quito'});
```

```text
4 nodes created
```

## 4. Registra hechos, con sus fechas

Las relaciones entre nodos son **hechos**. Un hecho puede decir desde cuándo es cierto (`@valid_from`) y hasta cuándo (`@valid_to`). Ana entró a Acme en marzo de 2021, Bob en junio de 2022, y Ana conoce a Bob:

```cypher
MATCH (ana:Person {name: 'Ana Torres'}), (acme:Company {name: 'Acme Robotics'})
CREATE (ana)-[:works_at {@valid_from: '2021-03-01'}]->(acme);

MATCH (bob:Person {name: 'Bob Rivera'}), (acme:Company {name: 'Acme Robotics'})
CREATE (bob)-[:works_at {@valid_from: '2022-06-15'}]->(acme);

MATCH (ana:Person {name: 'Ana Torres'}), (bob:Person {name: 'Bob Rivera'})
CREATE (ana)-[:knows {since: 2022}]->(bob);
```

## 5. Haz preguntas

`MATCH` describe una forma a encontrar; `RETURN` dice qué mostrar:

```cypher
MATCH (p:Person)-[w:works_at]->(c:Company)
RETURN p.name, c.name, date(w.@valid_from) AS since
ORDER BY since;
```

```text
 p.name     | c.name        | since
------------+---------------+------------
 Ana Torres | Acme Robotics | 2021-03-01
 Bob Rivera | Acme Robotics | 2022-06-15
(2 rows)
```

Los patrones pueden dar varios pasos. ¿Dónde trabajan las personas que Ana conoce?

```cypher
MATCH (:Person {name: 'Ana Torres'})-[:knows]->(friend)-[:works_at]->(c)
RETURN friend.name, c.name;
```

```text
 friend.name | c.name
-------------+---------------
 Bob Rivera  | Acme Robotics
(1 row)
```

## 6. Cambia un hecho sin perder la historia

Ana deja Acme a fines de enero de 2025 y entra a Orbit Labs. En vez de borrar el hecho viejo, termínalo, y registra el nuevo:

```cypher
MATCH (:Person {name: 'Ana Torres'})-[w:works_at]->(:Company {name: 'Acme Robotics'})
SET w.@valid_to = '2025-01-31';

MATCH (ana:Person {name: 'Ana Torres'}), (orbit:Company {name: 'Orbit Labs'})
CREATE (ana)-[:works_at {@valid_from: '2025-02-01'}]->(orbit);
```

Los dos hechos siguen ahí, cada uno con su período:

```cypher
MATCH (:Person {name: 'Ana Torres'})-[w:works_at]->(c)
RETURN c.name, date(w.@valid_from) AS since, date(w.@valid_to) AS until
ORDER BY since;
```

```text
 c.name        | since      | until
---------------+------------+------------
 Acme Robotics | 2021-03-01 | 2025-01-31
 Orbit Labs    | 2025-02-01 | null
(2 rows)
```

:::tip Deja que Grafeno termine los hechos viejos
Una persona trabaja en una empresa a la vez. Decláralo una vez y un trabajo nuevo termina el anterior solo: ve [Memoria para agentes](../guides/agent-memory.md#keep-facts-from-contradicting-each-other).
:::

## 7. Viaja en el tiempo

`VALID AT` pregunta qué era cierto en un momento. ¿Dónde trabajaba Ana a mediados de 2023, y dónde trabaja ahora?

```cypher
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT '2023-06-01' RETURN c.name;
```

```text
 c.name
---------------
 Acme Robotics
(1 row)
```

```cypher
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT datetime() RETURN c.name;
```

```text
 c.name
------------
 Orbit Labs
(1 row)
```

Grafeno guarda además un segundo tiempo: cuándo *supo* cada hecho. Ese responde "¿qué creíamos el martes pasado?" — ve [Tiempo](../concepts/time.md).

## 8. Agrega texto y búscalo

Un nodo puede llevar un texto (`@text`), que Grafeno indexa para la búsqueda de texto completo:

```cypher
CREATE (:Note {title: 'Robot arm review',
               @text: 'Ana and Bob reviewed the new robot arm design for Acme. The gripper needs a softer grip for fragile parts.'});
CREATE (:Note {title: 'Hiring plan',
               @text: 'Orbit Labs is hiring two engineers to work on satellite telemetry.'});
```

```cypher
CALL db.search('telemetry', 5) YIELD node, score RETURN node.title, score;
```

```text
 node.title  | score
-------------+-------------------
 Hiring plan | 0.780193567276001
(1 row)
```

La consola tiene atajos: `\search gripper design` busca, y `\context What is Ana working on?` muestra el contexto que recibiría un agente para esa pregunta — los textos y hechos relevantes, dentro de un presupuesto de tokens:

```text
## Memory
[1] Robot arm review (Note)
Ana and Bob reviewed the new robot arm design for Acme. The gripper needs a softer grip for fragile parts.

(37 tokens)
```

## 9. Mira alrededor

```cypher
CALL db.labels();
```

```text
 label   | count
---------+-------
 Company | 2
 Note    | 2
 Person  | 2
(3 rows)
```

`\stats` muestra las cifras del namespace, `\ns` lista los namespaces y `\export demo.jsonl` guarda el namespace en un archivo.

## Lo que aprendiste

- Los **namespaces** separan cada grafo.
- Los **nodos** tienen etiquetas y propiedades; los **hechos** los conectan y llevan sus fechas.
- Los hechos se **terminan**, no se borran, así la historia queda: `VALID AT` pregunta por cualquier momento.
- Los textos se **buscan**, y Grafeno arma **contexto** para agentes con textos y hechos.

## Siguiente

- Míralo dibujado y edítalo en [Grafeno Studio](./studio.md).
- Entiende el modelo: [Modelo de datos](../concepts/data-model.md), [Tiempo](../concepts/time.md), [Búsqueda y recall](../concepts/search-and-recall.md).
- Escribe scripts más largos: [Scripts GQ](../guides/scripts.md) y la [referencia de GQ](../reference/gq.md).
