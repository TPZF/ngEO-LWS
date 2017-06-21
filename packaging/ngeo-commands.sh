#! /bin/sh
##############################################################################
# @copyright Telespazio France 2017. Property of Telespazio France; all rights reserved
# @project NGEO Query Server
# @version $Rev:  $
# @date $LastChangedDate: 20170620 $
# @purpose NGEO Query Server as a service script.
##############################################################################
### BEGIN INIT INFO
# Prerequistes: before rning this scipt, please place the file named ngeo (make sure that it is chmod 755) under /etc/init.d/ 
# Short-Description: NGEO Query Server service script
# Description: To start, stop, restart NGEO Query Server as a service 
### END INIT INFO

# ----------------------------------------------------------------------------
# End of configuration section
# ----------------------------------------------------------------------------

# ----------------------------------------------------------------------------
# Start
# ----------------------------------------------------------------------------
ngeo_start() {  
    echo "------------------------------------------------------------------------------"
    echo " NGEO Query Server service Start"
    echo "------------------------------------------------------------------------------"
	service ngeo start
}

# ----------------------------------------------------------------------------
# Start
# ----------------------------------------------------------------------------
ngeo_stop() {
    echo "------------------------------------------------------------------------------"
    echo " NGEO Query Server service Stop"
    echo "------------------------------------------------------------------------------"
	service ngeo stop

}

# ----------------------------------------------------------------------------
# Start
# ----------------------------------------------------------------------------
ngeo_status() {
    echo -n "Checking for service ${MYSELF}:"
	service ngeo status
}

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
case "$1" in
start)
    ngeo_start
    ngeo_status
;;
stop)
    ngeo_stop
;;
restart)
    ngeo_stop
    ngeo_start
    ngeo_status
;;
status)
    ngeo_status
;;
*)
    echo "Usage: $0 {start|stop|restart|status}"
exit 1
;;
esac

# END ########################################################################
