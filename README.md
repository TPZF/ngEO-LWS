## Synopsis

ngEO-Light Query Server (ngeo-LWS) is the light web server is the project to replace the ngEO-WS only implementing functionality which is needed for hosting the ngEO-client and interfacing with SX-CAT and potentially other external catalogues.
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
- Retrieve the project git in your repository by typing git clone `ssh://gitolite@tuleap.telespazio.fr/ngeo-lws/Ngeo-LWS.git`
- Then do npm install and that is it as the **package.json** file contains already lib needed

As we install also library `xml2json`, it depends on `node-gyp`
and you have to install manually specific OS dependant lib according to your OS
@see `https://github.com/nodejs/node-gyp`

on windows we did by opening the command tools in admminstrative mode(you need to be admin to install python)

`npm install --global --production windows-build-tools`

For other OS please see `https://github.com/nodejs/node-gyp` as on linux, python is already installed natively.
- You need python version 2.7 for linux , so if this version is not used then you have to upgrade the version to 2.7

## Installation Troubleshootings
If by installing node and npm you have troubleshootings by typing `npm -v`
Then uninstall node
In windows, go to **{user-home}\AppData\Roaming**
and delete npm cache **npm** and **npm-cache**
Do the same step on your favourite OS
Reinstall node and normally all is well ;)

## Dev Installation
TO DO

## API Reference

agile dashbord, docs .. can be found @ https://tuleap.telespazio.fr/plugins/git/ngeo-lws/Ngeo-LWS

## Tests

Type `npm test`

## Troubleshootings
- If you are in centos 6.x then you need to install python 2.7 as it i the version working with node-gyp
- We have followed this and please read carefully till the end because you have to create a file manually in order to let python v2.7 working
- Please read `http://sametmax.com/installer-python-2-7-x-sur-centos-6-x-les-doigts-dans-le-nez/`
- You have also to install c++11 on centos `https://edwards.sdsu.edu/research/c11-on-centos-6/`

## Contributors

- Maxime SBIN (maxime.shubin@telespazio.com)
- ALIHOUSSEN Irchad (alihoussen.irchad@telespazio.com)

## License

MIT