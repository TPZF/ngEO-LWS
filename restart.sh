# stop service ngeo
sudo systemctl stop ngeo
# retrieve last version
git pull --rebase -q
# start service ngeo
sudo systemctl start ngeo
