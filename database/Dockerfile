FROM mysql:8.4
# Copy init scripts into the auto-run directory.
# MySQL runs everything in /docker-entrypoint-initdb.d on FIRST init only.
COPY init.sql /docker-entrypoint-initdb.d/init.sql
