---
title: SET y REMOVE
description: Cambia propiedades y etiquetas, guarda null, combina o reemplaza todas las propiedades, y quita claves y etiquetas.
---

# SET y REMOVE

`SET` cambia propiedades y etiquetas de los nodos y aristas encontrados. `REMOVE` las quita.

## Sintaxis

```text
SET n.clave = valor            // una propiedad
SET n += {clave: valor, …}     // combinar varias propiedades
SET n = {clave: valor, …}      // reemplazar todas las propiedades
SET n:Etiqueta                 // agregar una etiqueta
REMOVE n.clave, n:Etiqueta     // quitar una propiedad, una etiqueta
```

## Los datos de ejemplo

```text run title="Ejemplo"
CREATE (:Person {name: 'Ana', age: 34, city: 'Lima'}),
       (:Person {name: 'Bruno', age: 28, city: 'Quito'});
```

```text result title="Resultado"
2 nodes created
```

## Asignar una propiedad

Cambia un valor o agrega una propiedad nueva:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'})
SET p.age = 35, p.title = 'engineer'
RETURN p.name, p.age, p.title;
```

```text result title="Resultado"
 p.name | p.age | p.title
--------+-------+----------
 Ana    | 35    | engineer
(1 row)
2 properties set
```

## Calcular el valor nuevo

El lado derecho es cualquier expresión, y puede leer el valor anterior:

```text run title="Ejemplo"
MATCH (p:Person) SET p.age = p.age + 1 RETURN p.name, p.age ORDER BY p.name;
```

```text result title="Resultado"
 p.name | p.age
--------+-------
 Ana    | 36
 Bruno  | 29
(2 rows)
2 properties set
```

## Combinar propiedades: +=

`+=` asigna las claves del mapa y deja las demás como están:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Bruno'})
SET p += {city: 'Cuenca', team: 'design'}
RETURN properties(p);
```

```text result title="Resultado"
 properties(p)
-----------------------------------------------------------
 {"age":29,"city":"Cuenca","name":"Bruno","team":"design"}
(1 row)
2 properties set
```

## Reemplazar todas las propiedades: =

`=` con un mapa reemplaza todo: las claves que el mapa no tiene se quitan:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Bruno'})
SET p = {name: 'Bruno', age: 30}
RETURN properties(p);
```

```text result title="Resultado"
 properties(p)
---------------------------
 {"age":30,"name":"Bruno"}
(1 row)
2 properties set
```

## Etiquetas

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'}) SET p:Admin:Mentor RETURN labels(p);
```

```text result title="Resultado"
 labels(p)
-------------------------
 [Admin, Mentor, Person]
(1 row)
2 labels added
```

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'}) REMOVE p:Mentor RETURN labels(p);
```

```text result title="Resultado"
 labels(p)
-----------------
 [Admin, Person]
(1 row)
1 label removed
```

## Quitar una propiedad

`REMOVE` borra la clave:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'}) REMOVE p.title RETURN keys(p);
```

```text result title="Resultado"
 keys(p)
-------------------
 [age, city, name]
(1 row)
1 property set
```

## null es un valor

Asignar `null` a una propiedad **conserva la clave** con valor `null`; `REMOVE` la borra. Leer cualquiera de las dos da `null`, y `hasKey` las distingue:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'})
SET p.nickname = null
RETURN p.nickname, hasKey(p, 'nickname') AS has_nickname, hasKey(p, 'title') AS has_title;
```

```text result title="Resultado"
 p.nickname | has_nickname | has_title
------------+--------------+-----------
 null       | true         | false
(1 row)
1 property set
```

Combinar un mapa con valores `null` también los guarda:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Bruno'}) SET p += {city: null} RETURN properties(p);
```

```text result title="Resultado"
 properties(p)
---------------------------------------
 {"age":30,"city":null,"name":"Bruno"}
(1 row)
1 property set
```

## Aristas

Las aristas aceptan `SET` y `REMOVE` de la misma forma:

```text run title="Ejemplo"
MATCH (a:Person {name: 'Ana'}), (b:Person {name: 'Bruno'})
CREATE (a)-[k:knows {since: 2020}]->(b)
SET k.strength = 'close'
RETURN k.since, k.strength;
```

```text result title="Resultado"
 k.since | k.strength
---------+------------
 2020    | close
(1 row)
1 edge created, 1 property set
```

## Texto, importancia y vigencia

Las pseudopropiedades se asignan como propiedades:

```text run title="Ejemplo"
MATCH (p:Person {name: 'Ana'})
SET p.@text = 'Ana leads the robotics team in Lima.', p.@importance = 0.9
RETURN p.@text, p.@importance;
```

```text result title="Resultado"
 p.@text                              | p.@importance
--------------------------------------+---------------
 Ana leads the robotics team in Lima. | 0.9
(1 row)
2 properties set
```

| Sentencia | Efecto |
| --- | --- |
| `SET n.@text = '…'` | indexa el texto para la búsqueda de texto completo (`null` lo quita) |
| `SET n.@embedding = [...]` | guarda el vector del nodo (`null` lo quita) |
| `SET n.@importance = 0.9` | importancia de 0 a 1, usada por el recuerdo (recall) |
| `SET r.@valid_to = '2025-01-01'` | el hecho dejó de ser cierto en esa fecha; la historia se conserva |
| `REMOVE n.@text` | quita el texto |

:::tip Bueno saber
Una sentencia que escribe es una transacción: si alguna parte falla, no queda nada de lo que escribió.
:::
