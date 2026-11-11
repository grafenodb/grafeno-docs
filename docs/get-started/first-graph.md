---
title: Your first graph
description: A guided tour in the console — create people and companies, record facts with dates, change a fact, travel in time, and search.
sidebar_position: 2
---

# Your first graph

In fifteen minutes you will build a small graph of people and the companies they work at, record *when* each fact was true, change a fact without losing history, ask what was true at another time, and search text. Every result below is what Grafeno answers.

## 1. Open the console

`grafeno shell` is Grafeno's console. Connect it to the engine you installed, with the settings file (it holds the address and the token):

```bash
sudo grafeno shell --config /etc/grafeno/grafeno.toml
```

On Windows, in an administrator PowerShell:

```powershell
grafeno shell --config C:\ProgramData\Grafeno\grafeno.toml
```

:::tip No engine installed?
`grafeno shell --memory` opens a throwaway database inside the console itself. Everything below works the same; it is forgotten when you quit.
:::

Statements end with `;` and may span several lines. Commands that start with `\` belong to the console: `\?` lists them, `\q` quits.

## 2. Make a namespace

Everything in Grafeno lives in a **namespace**: one per person, team, application or agent. A query never crosses into another namespace unless you ask it to.

```text
\ns create demo
```

```text
Created namespace "demo"; now on it.
```

## 3. Create nodes

Nodes are the things: people, companies, notes. Each has at least one **label** (`Person`, `Company`) and **properties**. Grafeno's query language is **GQ**, a declarative language of graph patterns:

```text
CREATE (ana:Person {name: 'Ana Torres', role: 'engineer'}),
       (bob:Person {name: 'Bob Rivera', role: 'designer'}),
       (acme:Company {name: 'Acme Robotics', city: 'Lima'}),
       (orbit:Company {name: 'Orbit Labs', city: 'Quito'});
```

```text
4 nodes created
```

## 4. Record facts, with their dates

Relationships between nodes are **facts**. A fact can say since when it is true (`@valid_from`) and until when (`@valid_to`). Ana joined Acme in March 2021, Bob in June 2022, and Ana knows Bob:

```text
MATCH (ana:Person {name: 'Ana Torres'}), (acme:Company {name: 'Acme Robotics'})
CREATE (ana)-[:works_at {@valid_from: '2021-03-01'}]->(acme);

MATCH (bob:Person {name: 'Bob Rivera'}), (acme:Company {name: 'Acme Robotics'})
CREATE (bob)-[:works_at {@valid_from: '2022-06-15'}]->(acme);

MATCH (ana:Person {name: 'Ana Torres'}), (bob:Person {name: 'Bob Rivera'})
CREATE (ana)-[:knows {since: 2022}]->(bob);
```

## 5. Ask questions

`MATCH` describes a shape to find; `RETURN` says what to show:

```text
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

Patterns can go several steps. Where do the people Ana knows work?

```text
MATCH (:Person {name: 'Ana Torres'})-[:knows]->(friend)-[:works_at]->(c)
RETURN friend.name, c.name;
```

```text
 friend.name | c.name
-------------+---------------
 Bob Rivera  | Acme Robotics
(1 row)
```

## 6. Change a fact without losing history

Ana leaves Acme at the end of January 2025 and joins Orbit Labs. Instead of deleting the old fact, end it, then record the new one:

```text
MATCH (:Person {name: 'Ana Torres'})-[w:works_at]->(:Company {name: 'Acme Robotics'})
SET w.@valid_to = '2025-01-31';

MATCH (ana:Person {name: 'Ana Torres'}), (orbit:Company {name: 'Orbit Labs'})
CREATE (ana)-[:works_at {@valid_from: '2025-02-01'}]->(orbit);
```

Both facts are still there, each with its period:

```text
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

:::tip Let Grafeno end old facts for you
A person works at one company at a time. Declare it once, and a new job ends the previous one by itself: see [Memory for agents](../guides/agent-memory.md#keep-facts-from-contradicting-each-other).
:::

## 7. Travel in time

`VALID AT` asks what was true at a moment. Where did Ana work in mid-2023, and where does she work now?

```text
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT '2023-06-01' RETURN c.name;
```

```text
 c.name
---------------
 Acme Robotics
(1 row)
```

```text
MATCH (:Person {name: 'Ana Torres'})-[:works_at]->(c) VALID AT datetime() RETURN c.name;
```

```text
 c.name
------------
 Orbit Labs
(1 row)
```

Grafeno keeps a second time too: when it *learned* each fact. That one answers "what did we believe last Tuesday?" — see [Time](../concepts/time.md).

## 8. Add text, and search it

A node can carry a text (`@text`), which Grafeno indexes for full-text search:

```text
CREATE (:Note {title: 'Robot arm review',
               @text: 'Ana and Bob reviewed the new robot arm design for Acme. The gripper needs a softer grip for fragile parts.'});
CREATE (:Note {title: 'Hiring plan',
               @text: 'Orbit Labs is hiring two engineers to work on satellite telemetry.'});
```

```text
CALL db.search('telemetry', 5) YIELD node, score RETURN node.title, score;
```

```text
 node.title  | score
-------------+-------------------
 Hiring plan | 0.780193567276001
(1 row)
```

The console has shortcuts for it: `\search gripper design` searches, and `\context What is Ana working on?` shows the context an agent would receive for that question — the relevant texts and facts, packed within a token budget:

```text
## Memory
[1] Robot arm review (Note)
Ana and Bob reviewed the new robot arm design for Acme. The gripper needs a softer grip for fragile parts.

(37 tokens)
```

## 9. Look around

```text
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

`\stats` shows the namespace's numbers, `\ns` lists namespaces, and `\export demo.jsonl` saves the namespace to a file.

## What you learned

- **Namespaces** keep each graph apart.
- **Nodes** have labels and properties; **facts** connect them and carry their dates.
- Facts are **ended**, not deleted, so history stays: `VALID AT` asks about any moment.
- Texts are **searched**, and Grafeno assembles **context** for agents from texts and facts.

## Next

- See it all drawn and edited in [Grafeno Studio](./studio.md).
- Understand the model: [Data model](../concepts/data-model.md), [Time](../concepts/time.md), [Search and recall](../concepts/search-and-recall.md).
- Write longer scripts: [GQ scripts](../guides/scripts.md), and the [GQ reference](../reference/gq.md).
