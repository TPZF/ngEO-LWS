# Description of packaging and Lanching rpm for ngEO-QS

## Packaging

This section to explain how to build a rpm package for ngEO-qs containing all needed.

 - Type `./package.sh <version> <date>` from this folder where `version` is the version (example `1.0`) and `date` is the date (exmaple `20170620`)
 - The rpm name's nomenclature is `esa-ngeo-qs-<version>-<date>.x86_64.rpm` and is generated @ `../dist/`

## Install generated rpm
 - At this step, it means that you have already generated your rpm under `../dist/` folder
 - To install it go to `../dist/` and type `./ngeo-install.sh install`
 - It will install the software under `/usr/local//usr/local/ngeo/ngeo-qs/`

 ## UnInstall generated rpm
 - At this step, it means that you have already generated your rpm under `../dist/` folder
 - To uninstall it go to `../dist/` and type `./ngeo-install.sh uninstall`

## Status if ngEO-QS is installed or not
 - At this step, it means that you have already generated your rpm under `../dist/` folder
 - To check the status if it is installed or not, go to `../dist/` and type `./ngeo-install.sh status`

## Set ngEO-QS as service on your machine (rhel/centos)

 - To set the ngEO-QS as service just place the file named `ngeo` under folder `/etc/init.d/`
 - Set chmod 755 on this file `/etc/init.d/ngeo`
 - Change the [IPADRESS] in this file by your machine's ip adress and you can also change the PORT if needed
 - Start ngeo from eveywhere by just typing `service ngeo start`
 - Stop ngeo from eveywhere by just typing `service ngeo stop`
 - Restart ngeo from eveywhere by just typing `service ngeo restart`
 - Check ngeo status from eveywhere by just typing `service ngeo status`
 - All those commands can be found in the file named `ngeo-commands.sh` found under `../dist/` folder

 ## Change the log file location of ngEO-QS

 - After the installation, you can change the log file location if you want for ngEO-QS.
 - You can change it @ `/usr/local/ngeo/ngeo-qs/src/config/production.json`
 - Do not forget to restart ngEO-QS by typing `service ngeo restart`
 - Same for other configuration files that you want to change (those are found in the document `ngEO-WEBC-QS-ICD-001_1.0.docx`, and they are also explained in the REDAME.md of the project)
