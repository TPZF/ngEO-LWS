# ngEO-LWS

ngEO-Light Query Server (ngeo-LWS) is the project to replace the ngEO-WS by implementing the functionalities which are needed for hosting the ngEO-client and interfacing with SX-CAT and potentially other external catalogues.
It is not expected to interface with other components such as the ngEO controller or hosted processing facilities.

## Code Example

Show what the library does as concisely as possible, developers should be able to figure out **how** your project solves their problem by looking at the code example. Make sure the API you are showing off is obvious, and that your code is short and concise.

## Motivation

TBD

## Post installation

- Install Git
- Create a repository where you want to place your ngEO-LWS folder
- CD to this repository
- Retrieve the project git in your repository by typing `git clone https://github.com/TPZF/ngEO-LWS.git`

As ngEO Query Server uses some libraries that uses some OS dependant libraries, you have to install first some dependencies that are used in this project to run it well.
For example, ngEO-LWS uses expat-lib which depends on node-gyp which depends on gcc version 4.9+ (c++11).

>**Redhat/Centos 6.x post installation** (Thanks to Antoine Jammes for help)
 
For that we have compiled for you the .repo needed in order to install them in the simpliest manner.
The list of libraries to install is:
- node.js version 7.x latest (nodesource-el6.repo)
- mongo db version 3.4 (mongodb-org-3.4.repo)
- devtoolset-3 owned by rhscl (rhscl-devtoolset-3-epel-6.repo)

Steps installing rhel/centos dependant libraries:

Before going forward, we assume that you already did `git clone https://github.com/TPZF/ngEO-LWS.git`
- `cd` to your git project (`ngEO-LWS`)
- `cp ./os-dependant-lib/rhel-centos/v6/*.repo /etc/yum.repo.d/`
- `yum clean all ; yum repolist`
- `yum install nodejs mongodb-org`
- `yum install devtoolset-3-gcc.x86_64 devtoolset-3-gcc-c++-4.9.2-6.el6.x86_64`
- `scl enable devtoolset-3 bash`

At this step you have all you need to launch the ngEO-QS

>**Other Linux post installation**

You have to install

- node.js version 7.5.0
- npm version 4.1.2 (for windows installation it is already contained in)
- devtoolset-3-gcc.x86_64 and devtoolset-3-gcc-c++-4.9.2-6.el6.x86_64
- MongoDB Community Edition version 3.4

>**Windows post installation**

You have to install

- node.js version 7.5.0
- npm version 4.1.2 (for windows installation it is already contained in)
- in windows, because of expat-lib used in this project, you have to install in admin mode this module `npm install -g windows-build-tools`
- MongoDB Community Edition version 3.4
- set mongod path in environment variables as well described in mongo web site (you can call it from everywhere)

>**MacOsx post installation**

You have to install

- node.js version 7.5.0
- npm version 4.1.2 (for windows installation it is already contained in)
- MongoDB Community Edition version 3.4
- set mongod path in environment variables as well described in mongo web site (you can call it from everywhere)

## Installation of ngEO-LWS

**From the project folder**

- CD to this repository (`ngEO-LWS`)
- At this step, you already retrieve the project git in your repository by typing `git clone https://github.com/TPZF/ngEO-LWS.git`
- Then do `npm install` and that is it as the **package.json** file contains already all required libraries

## Configuration

See on src/config directory and define :

- database access, account, password,
- host,
- etc.

## Starting/Stoping/Testing Server
>Linux or Macosx commands

|Commands | Production command | Development command | Test command      |
|-------- | ------------------ | ------------------- | ------------      |
|*Starting server*| `npm start`| `npm run start-dev` |                   | 
|*Stoping server*  | `npm stop` | `npm run stop-dev`  |                   | 
|*Test with Coverage*|         |                     |`npm run coverage` | 

open in your favourite browser `localhost:3000`, you should see the ngeo project as the ngeo client is also integrated into the project

>Windows commands

* *__You need to run the `cmd` command with adminstrator rigths because of mongoDB database__*
* *__Before running mongod and mongo from Command Prompt, you need to add Path Environment Variables for MongoDB__*
* *in the file located @ `src/mongodWindows.conf`, you need to put the absolute path of the mongo log file in `path` attribute located @ in the `systemLog` attribute, because windows does not like relative path*
* *__On windows you need to run the `cmd` command with adminstrator rigths because of mongoDB database__*
* *__Then type this command `mongod --config "<path where is installed your project>/.mongodb/conf/mongodWindows.conf" --install`__*


|Commands | Production command | Development command | Test command      |
|-------- | ------------------ | ------------------- | ------------      |
|*Starting server*| `npm run start-windows`| `npm run start-windows-dev` |                   | 
|*Stoping server*  | `npm run stop-windows` | `npm run stop-windows-dev`  |                   | 
|*Test with Coverage*|         |                     |`npm run coverage-windows` | 

Open in your favourite browser `localhost:3000`, you should see the ngeo project as the ngeo client is also integrated into the project

>For other OS, please adapt the script

## ngEO-LWS as service on linux machine

This topic explain some files that are provided in this project and are only used/write for linux platfrom.
It aims is to put ngEO-LWS as service in a linux server.

The service file is called `ngeo.service` and can be found @ https://github.com/TPZF/ngEO-LWS
Be aware to update the `host ip adress` in this file before running it as service so it targets the rigth machine.

The aim of this file is to create a service, so when you logout from the machine, the service ngeo (the ngEO-LWS server) is still runnning.

Once it is runing you have two options:

- Either, you have modified some configuration files (for example, files that needs some credentials and are not and SHALL not be pushed in the gitHUB), 
- either not:

If you have modified some files (for example in our case, in the operational platform ywe changed the credential of some configuration that are needed in feed), then before checkouting new files you have to put your modified files appart, retrieve new files from gitHib configuration and re-apply your modified files:
For that we have put a single script that those all our needs, and is name `restart-stash.sh`

If you want just restart without retrieving up to date new files from gitHub then just do `restart.sh`

Be ware also that we have not put credentials in the configurations files in gitHub in some catalog that needs credential (for example for FEDEO founded) for EOP-ESA-SENTINEL targeting url 
http://geo.spacebel.be/opensearch/request/?httpAccept=application/atom%2Bxml&amp;uid=%22EOP:ESA:SENTINEL%22"

But we have modified the credentials configuration in the operational host machine.

So if we need to retrieve up to date new files from gitHub, then we do in our case the command `restart-stash.sh`  which allow us to put the local modified file (in our case the catalogs.json) apart, retrieve new files from github, apply our modification file locally (calalogs.json) and restarting the ngeo-service. 


## Installation Troubleshootings
If by installing node and npm you have troubleshootings by typing `npm -v`

- Then uninstall node
- In windows, go to **{user-home}\AppData\Roaming** and delete npm cache **npm** and **npm-cache**
- Do the same step on your favourite OS
- Reinstall node and normally all is well ;)


## API Reference

TODO

## Tests

Follow chapter **Starting/Stoping/Testing server**

## Tests coverage

Follow chapter **Starting/Stoping/Testing server**

## Troubleshootings

TODO

## Contributors

- SHUBIN Maxime (maxime.shubin@telespazio.com)
- ALIHOUSSEN Irchad (alihoussen.irchad@telespazio.com)
- MANOEL Olivier (manoel.olivier@gmail.com)

## License

Licensed under LGPLv3