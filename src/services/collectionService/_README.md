# collection service

This service proposes to search products in collection.
For this, it initializes each collection with number of total results, attributes, keywords

## collection.js

Model of collection object

- id
- name
- url
- options

## collections-options.json

This file contains all configuration paramaters for each collection.

- keywords : structured like an array of groups with array of keywords in each group

~~~~json
[
    {"groupe1": [ "key1", "key2" ]},
    {"group2": ["key3", "key4"]}
]
~~~~

## index.js

To complete