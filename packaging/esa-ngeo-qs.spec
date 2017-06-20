%define	version %(echo $NGEO_VERSION)
%define	release %(echo $NGEO_RELEASE)

Name:           esa-ngeo-qs
Version:        %version
Release:        %release
Summary:        The ngEO Client and Query Server

Group:       	NGEO   
License:     	2017, ESA   
BuildArch: 	x86_64
Source0:  	esa-ngeo-qs.tar.gz
Requires:  	httpd, nodejs 

%description


%prep
%setup -n esa-ngeo-qs

%build
%install
install -m 0755 -d $RPM_BUILD_ROOT/usr/local/ngeo
pwd
mv ngeo-qs/ $RPM_BUILD_ROOT/usr/local/ngeo

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
/usr/local/ngeo/ngeo-qs

%changelog
