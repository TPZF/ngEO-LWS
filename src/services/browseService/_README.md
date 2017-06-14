# Browse service

## index.js

Add browse information for each feature related to the given collection identifier

## browseConfiguration.json

This file contains all browse configurations with

- pattern: all attributes matching for a product - if product attributes match this pattern, then add browse information with this url
- url: url of server browses
- crossOrigin: set if server allows cross origin request (CORS) with credentials (set "use-credentials") or anonymous (set "anonymous")

~~~~json
[
    {
        "pattern": {
            "plateformId": "Landsat",
            "serialId": "5",
            "shortName": "TM",
            "operationalMode": "IM",
            "productType": "TM__GTC_1P"
        },
        "url": "http://brow02.ngeo.eox.at/c/wmts/1.0.0/WMTSCapabilities.xml?SERVICE=WMTS&VERSION=1.0.0&LAYER=Landsat",
        "crossOrigin": "anonymous"
    }
]
~~~~
