# Description of configuration files

## account.json

Put all credentials (username, password) for each catalogs
Structure :
credentials : Array of credential
credential : {
    'name of catalog' : { username, password }
}

## commons.json

Put in this file all commons configuration parameters (independant of environment platform)
You cant find :

- browseConfigurationPath : path of json configuration file with all browses parameters
- catalogPath : path to json file with description of all catalogs in QS
- collectionsOptionsPath : path to json file with options parameters for collections (keywords)
- collectionService.refreshDelay : delay to refresh all collections informations (total results, attributes)
- opensearch : parameters to find information in opensearch descriptions
- ssoUserId : value of userId in header transmitted by SSO

## development.json / test.json / production.json

Configuration file for specific environment
Each file have :

- host: define host (unknown by QS, especially behind a proxy)
- logger : level and outPath for logs informations
- database : datas for connection to database

