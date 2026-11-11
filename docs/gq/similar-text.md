---
title: Similar text
description: Measure how alike two strings are, find names with typos with fuzzy indexes, and spot duplicate records.
---

# Similar text

People type names in many ways: "Jon Smith", "John Smyth", "SMITH, John". The `text.*` functions measure how alike two strings are, and a **fuzzy index** finds the nodes whose names look like a text without comparing with every node.

## Distances and similarities

A **distance** counts edits (0 means equal). A **similarity** goes from 0 (nothing alike) to 1 (equal):

```text run title="Example"
RETURN text.levenshtein('kitten', 'sitting') AS levenshtein,
       text.damerau('jonh', 'john') AS damerau,
       round(text.jaroWinkler('martha', 'marhta'), 3) AS jaro_winkler,
       round(text.dice('graph memory', 'memory graph'), 3) AS dice;
```

```text result title="Result"
 levenshtein | damerau | jaro_winkler | dice
-------------+---------+--------------+------
 3           | 1       | 0.961        | 1.0
(1 row)
```

| Function | Good for |
| --- | --- |
| `text.levenshtein(a, b)` | edits between two strings (insert, delete, replace) |
| `text.damerau(a, b)` | the same, a swap of two neighbors counting as one edit |
| `text.jaro(a, b)`, `text.jaroWinkler(a, b)` | short strings such as names; Winkler favors a shared start |
| `text.dice(a, b)`, `text.jaccard(a, b)` | shared character groups (n-grams), not fooled by word order |
| `text.lcs(a, b)` | length of the longest common subsequence |
| `text.soundex(s)`, `text.phonetic(s, 'es')` | how a word sounds, in English or Spanish |
| `text.similarity(a, b, measure)` | any measure by name, on normalized text |

## Normalized comparison

`text.similarity` compares **normalized** text: lowercase, without accents or punctuation. `text.normalize` shows what it compares:

```text run title="Example"
RETURN text.normalize('  José  PÉREZ-Gómez ') AS normalized,
       text.similarity('José Pérez', 'jose perez') AS same,
       round(text.similarity('José Pérez', 'Pérez, José', 'tokens'), 3) AS by_words;
```

```text result title="Result"
 normalized       | same | by_words
------------------+------+----------
 jose perez gomez | 1.0  | 1.0
(1 row)
```

## Sounds alike

```text run title="Example"
RETURN text.soundex('Robert') AS robert, text.soundex('Rupert') AS rupert,
       text.phonetic('Vázquez', 'es') AS vazquez, text.phonetic('Basques', 'es') AS basques;
```

```text result title="Result"
 robert | rupert | vazquez | basques
--------+--------+---------+---------
 R163   | R163   | baskes  | baskes
(1 row)
```

## Find similar names in a query

Compare in `WHERE`. This reads every node of the label, fine for small sets:

```text run title="Example"
CREATE (:Person {name: 'John Smith'}), (:Person {name: 'Jon Smyth'}), (:Person {name: 'Joan Smithers'}),
       (:Person {name: 'María García'}), (:Person {name: 'Maria Garsia'}), (:Person {name: 'Pedro Ruiz'});
MATCH (p:Person)
WITH p, text.similarity(p.name, 'john smith') AS score
WHERE score > 0.8
RETURN p.name, round(score, 3) AS score ORDER BY score DESC;
```

```text result title="Result"
6 nodes created
 p.name        | score
---------------+-------
 John Smith    | 1.0
 Jon Smyth     | 0.917
 Joan Smithers | 0.891
(3 rows)
```

## Fuzzy indexes

A fuzzy index keeps the character groups (trigrams) of a property, so `db.searchFuzzy` finds look-alikes quickly, typos, accents, case and word order included:

```text run title="Example"
CREATE FUZZY INDEX FOR (p:Person) ON (p.name);
CALL db.searchFuzzy('Person', 'name', 'maria garsia', 3) YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 name              | label  | property | unique | entries | fuzzy | on    | key   | kind  | state
-------------------+--------+----------+--------+---------+-------+-------+-------+-------+--------
 Person_name_fuzzy | Person | name     | false  | 70      | true  | nodes | false | fuzzy | online
(1 row)
 node.name    | score
--------------+-------
 Maria Garsia | 1.0
 María García | 0.75
(2 rows)
```

The last argument chooses the measure (`dice` by default). `tokens` compares whole words, so the order does not matter:

```text run title="Example"
CALL db.searchFuzzy('Person', 'name', 'smith john', 3, 'tokens') YIELD node, score
RETURN node.name, round(score, 3) AS score;
```

```text result title="Result"
 node.name     | score
---------------+-------
 John Smith    | 1.0
 Jon Smyth     | 0.0
 Joan Smithers | 0.0
(3 rows)
```

## Pairs of likely duplicates

Each person with the most similar other person, above a threshold:

```text run title="Example"
MATCH (a:Person), (b:Person)
WHERE a.name < b.name
WITH a, b, text.similarity(a.name, b.name, 'jaro_winkler') AS score
WHERE score > 0.85
RETURN a.name, b.name, round(score, 3) AS score ORDER BY score DESC;
```

```text result title="Result"
 a.name        | b.name       | score
---------------+--------------+-------
 Maria Garsia  | María García | 0.967
 John Smith    | Jon Smyth    | 0.917
 Joan Smithers | John Smith   | 0.891
 Joan Smithers | Jon Smyth    | 0.868
(4 rows)
```

:::tip Deciding who is the same
Deciding that two records are the same thing takes more than one field. A **match rule** per label (strong keys, weighted fields, thresholds) and `db.match` score candidates and explain each score; they are set up over the HTTP API, see [Agent memory](../guides/agent-memory.md).
:::
