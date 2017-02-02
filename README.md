## Synopsis

ngEO-Light Query Server (ngeo-LWS) is the light web server is the project to replace the ngEO-WS only implementing functionality which is needed for hosting the ngEO-client and interfacing with SX-CAT and potentially other external catalogues.
It is not expected to interface with other components such as the ngEO controller or hosted processing facilities.

## Code Example

Show what the library does as concisely as possible, developers should be able to figure out **how** your project solves their problem by looking at the code example. Make sure the API you are showing off is obvious, and that your code is short and concise.

## Motivation

TBD

## Installation

You should install 
node.js version 7.5.0
npm version 4.1.2 (for windows installation it is already contained in)
Create a repository where you want to place you dev folder
CD to this repository
Retrieve the project git in your repository by typing "git clone ssh://gitolite@tuleap.telespazio.fr/ngeo-lws/Ngeo-LWS.git"
Then do npm install and that is it as the "package.json" file contains already lib needed

## Installation Troubleshootings
If by installing node and nm you have troubleshootings by typing "npm -v"
Then uninstall node
In windows, go to {user-home}\AppData\Roaming
and delete npm cache 'npm' and 'npm-cache'
Do the same step on your favourite OS
Reinstall node and normally all is well ;)

## API Reference

agile dashbord, docs .. can be found @ https://tuleap.telespazio.fr/plugins/git/ngeo-lws/Ngeo-LWS

## Tests

TBD

## Contributors

Maxime SBIN (maxime.shubin@telespazio.com)
ALIHOUSSEN Irchad (alihoussen.irchad@telespazio.com)

## License

MIT