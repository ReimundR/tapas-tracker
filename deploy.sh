SRV=test.tapas-tracker.app
ssh="ssh -l root"
TARGET=/var/www/tapas-tracker
DEPLOY="*.json *.js *.ts node_modules public .next"
ARCHIVE=tapas-tracker.tar.gz
SSH_EXEC="ssh root@$SRV"

echo \* building application
npm run build

echo \* stop application
$SSH_EXEC /root/stop_all.sh

echo \* packing application for deploy
tar cf - $DEPLOY | pv -s $(du -sb $DEPLOY | awk '{sum += $1} END {print sum}') | gzip > $ARCHIVE
#tar cfz tapas-tracker.tar.gz $DEPLOY & progress -mp $!

echo \* clean target
$SSH_EXEC rm -rf $TARGET/*

echo \* send packed data to target
rsync -a --info=progress2 --rsh="$ssh" $ARCHIVE $SRV:$TARGET

echo \* extracting application
$SSH_EXEC "pv -f $TARGET/$ARCHIVE | tar -xzf - -C $TARGET"

echo \* remove deploy package
$SSH_EXEC rm -rf $TARGET/$ARCHIVE
rm -rf $ARCHIVE

echo \* start application
$SSH_EXEC /root/start_all.sh
