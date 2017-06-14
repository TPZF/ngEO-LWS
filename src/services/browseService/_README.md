# Browse service

## index.js

## browseConfiguration.json

This file contains all browse configurations with

- pattern : all attributes matching for a product
- url : url of server browses
- crossOrigin: set if server allows cross origin request with credentials (use-credentials) or anonymous

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
