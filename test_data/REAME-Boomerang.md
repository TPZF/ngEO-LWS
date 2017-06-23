# Boomerang

Boomerang allows you to organize SOAP & REST services in projects, and requests in collections

## Import ngEO-LWS project

- Install boomerang
- Click on right burger, choose Settings
- Import project, select ngEO-Boomerang.json file
- All is done

## Use Boomerang

You need environment settings to use it

- Click on right burger, choose Environments
- First, define a name in input field
- Set a json configuration like this exemple for localhost

```json
{
    "host": "localhost",
    "port": "3000",
    "proxy": ""
}
```

You can add new environments, like QS server on CGI...

When yo use a service, choose in select list under Response tab the wanted environment configuration.
