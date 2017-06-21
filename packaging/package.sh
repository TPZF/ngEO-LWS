#!/bin/sh -e 

export NGEO_VERSION=$1
export NGEO_RELEASE=$2

# Build the tar from the ngEO-QS server
# mkdir esa-ngeo-qs
rm -rf esa-ngeo-qs
mkdir -p esa-ngeo-qs/ngeo-qs/
cd ..

echo "Enabling devtoolset-3-gcc and devtoolset-3-gcc-c++-4.9.2-6"
echo "Nedeed by node-expat ly used by ngEO-QS"
scl enable devtoolset-3 bash

git pull --rebase
npm install --production
cd ./packaging
cp -R ../.mongodb esa-ngeo-qs/ngeo-qs/
cp -R ../node_modules esa-ngeo-qs/ngeo-qs/
cp -R ../public esa-ngeo-qs/ngeo-qs/
cp -R ../src esa-ngeo-qs/ngeo-qs/

echo "------------------------------------------------------------------------------"  
echo "------------------------Deleting unused files for production------------------"
echo "------------------------------------------------------------------------------"  
find ./esa-ngeo-qs/ngeo-qs/ -name "*.gitignore" -type f -delete
find ./esa-ngeo-qs/ngeo-qs/ -name "*.test.js" -type f -delete
#sed -i "s/\.\/ngeo.log/\/tmp/ngeo\.log/g" dist/ngeo-install.sh

echo "------------------------------------------------------------------------------"  
echo "------------------------Moving sources to rpmbuild sources--------------------"
echo "------------------------------------------------------------------------------"  
tar czf esa-ngeo-qs.tar.gz esa-ngeo-qs
rm -rf esa-ngeo-qs
mv esa-ngeo-qs.tar.gz ~/rpmbuild/SOURCES

echo "------------------------------------------------------------------------------"  
echo "------------------------Start building the rpm--------------------------------"
echo "------------------------------------------------------------------------------"  
# Build the rpm
rpmbuild -ba esa-ngeo-qs.spec
echo "------------------------------------------------------------------------------"  
echo "------------------------Finished building the rpm-----------------------------"
echo "------------------------------------------------------------------------------" 

echo " NGEO Web client and Query Server Install"

# build the dist
cd ..
rm -rf dist
mkdir dist
cp ~/rpmbuild/RPMS/x86_64/esa-ngeo-qs-$NGEO_VERSION-$NGEO_RELEASE.x86_64.rpm dist/
#cp ./packaging/ngeo dist
cp ./packaging/ngeo-install.sh dist
sed -i "s/VERSION-RELEASE/$NGEO_VERSION-$NGEO_RELEASE/g" dist/ngeo-install.sh
cp ./packaging/ngeo dist
cp ./packaging/ngeo-commands.sh dist
