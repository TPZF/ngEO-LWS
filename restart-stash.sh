# stop service ngeo
sudo systemctl stop ngeo
# stash items
git stash -q
# retrieve last version
git pull --rebase -q
# stash pop items
git stash pop -q
# install modules
npm install
# start service ngeo
sudo systemctl start ngeo
