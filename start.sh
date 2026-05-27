#!/bin/bash
# KRL.KR startup script
# Uses Next.js standalone server (output: standalone)

# Kill any process holding port 3000
PORT=3000
INODE=$(awk 'NR>1 && $4=="0A" {split($2,a,":"); if(a[2]=="0BB8") print $10}' /proc/net/tcp6 2>/dev/null)
if [ -n "$INODE" ]; then
  for pid_dir in /proc/[0-9]*/fd; do
    pid="${pid_dir%/fd}"
    pid="${pid#/proc/}"
    ls -la "/proc/$pid/fd" 2>/dev/null | grep -q "socket:\[$INODE\]" && kill -9 "$pid" 2>/dev/null && echo "Killed stale process $pid holding port $PORT"
  done
  sleep 2
fi

cd /var/www/krl-kr
# Use standalone server.js for proper output: standalone mode
exec node .next/standalone/server.js
