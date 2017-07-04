# Description of configuration files

## commons.json

Put in this file all commons configuration parameters (independant of environment platform)
You cant find :

- `browseConfigurationPath` : path of json configuration file with all browses parameters
- `catalogPath` : path to json file with description of all catalogs in QS
- `collectionsOptionsPath` : path to json file with options parameters for collections (keywords)
- `collectionService.refreshDelay` : delay to refresh all collections informations (total results, attributes)
- `opensearch` : parameters to find information in opensearch descriptions (param, geo, time, ...)
- `ssoUserId` : value of userId in header transmitted by SSO to be mapped in the database. If this tag is not defined (not the value but entire tag) then we assume that the QS is not behind sso and thus all user will be mapped as `anonymous` user. Otherwise if tag is defined with the sso header where to retrieve the userId, then we assume that QS is behind sso and ssoid will be mapped with the database entry (shopcart and wonload manager). 
- `searchResults.defaultCountPerPage` : default value for pagination on collections - replaced by osdd count value if exists

## development.json / test.json / production.json

Configuration file for specific environment
Each file have :

- `host`: define host (unknown by QS, especially behind a proxy) used only for the service REST ngeo/opensearch. It is mapped with this host.
- `logger` : level and outPath for logs informations
- `database` : datas for connection to database

