# ngEO-LWS

ngEO-Light Query Server (ngeo-LWS) is the project to replace the ngEO-WS by implementing the functionalities which are needed for hosting the ngEO-client and interfacing with SX-CAT and potentially other external catalogues.
It is not expected to interface with other components such as the ngEO controller or hosted processing facilities.

## Code Example

Show what the library does as concisely as possible, developers should be able to figure out **how** your project solves their problem by looking at the code example. Make sure the API you are showing off is obvious, and that your code is short and concise.

## Motivation

TBD

## Installation

**You should install**

- node.js version 7.5.0
- npm version 4.1.2 (for windows installation it is already contained in)
- Create a repository where you want to place your dev folder
- CD to this repository
- Retrieve the project git in your repository by typing `git clone https://github.com/TPZF/ngEO-LWS.git`
- Then do `npm install` and that is it as the **package.json** file contains already all required libraries
- MongoDB Community Edition version 3.4
- On windows and Mac OS, set mongod path in environment variables (you can call it from everywhere)

## Configuration

See on src/config directory and define :

- database access, account, password,
- host,
- account / password for authentication on catalogs
- etc.

## Starting/Stoping/Testing Server
>Linux commands

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