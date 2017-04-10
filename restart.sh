# stop service ngeo
sudo systemctl stop ngeo
# retrieve last version
git pull --rebase -q
# install modules
npm install
# start service ngeo
sudo systemctl start ngeo
