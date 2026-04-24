#!/usr/bin/env sh
set -eu

PACKAGE_DIR="${1:-/tmp/oracle/packages}"
TARGET_ROOT="/opt/oracle"
TARGET_LINK="${TARGET_ROOT}/instantclient"

find_zip() {
  pattern="$1"
  find "$PACKAGE_DIR" -maxdepth 1 -type f -name "$pattern" | sort | head -n 1
}

basic_zip="$(find_zip 'instantclient-basic*linux*.zip')"
if [ -z "${basic_zip}" ]; then
  echo "ERROR: Oracle Instant Client basic zip was not found in ${PACKAGE_DIR}." >&2
  echo "Expected file pattern: instantclient-basic*linux*.zip" >&2
  exit 1
fi

odbc_zip="$(find_zip 'instantclient-odbc*linux*.zip')"
if [ -z "${odbc_zip}" ]; then
  echo "ERROR: Oracle Instant Client ODBC zip was not found in ${PACKAGE_DIR}." >&2
  echo "Expected file pattern: instantclient-odbc*linux*.zip" >&2
  exit 1
fi

mkdir -p "$TARGET_ROOT"
unzip -oq "$basic_zip" -d "$TARGET_ROOT"
unzip -oq "$odbc_zip" -d "$TARGET_ROOT"

client_dir="$(find "$TARGET_ROOT" -maxdepth 1 -type d -name 'instantclient_*' | sort | head -n 1)"
if [ -z "${client_dir}" ]; then
  echo "ERROR: Unable to locate extracted instantclient directory under ${TARGET_ROOT}." >&2
  exit 1
fi

driver_lib="$(find "$client_dir" -maxdepth 1 -type f -name 'libsqora.so*' | sort | head -n 1)"
if [ -z "${driver_lib}" ]; then
  echo "ERROR: Oracle ODBC driver library libsqora.so* was not found in ${client_dir}." >&2
  exit 1
fi

ln -sfn "$client_dir" "$TARGET_LINK"
driver_name="$(basename "$driver_lib")"

cat > /etc/odbcinst.ini <<EOF
[Oracle23IC]
Description=Oracle Instant Client ODBC (alias)
Driver=${TARGET_LINK}/${driver_name}
FileUsage=1

[Oracle 23 ODBC driver]
Description=Oracle Instant Client ODBC
Driver=${TARGET_LINK}/${driver_name}
FileUsage=1
EOF

echo "${TARGET_LINK}" > /etc/ld.so.conf.d/oracle-instantclient.conf
ldconfig

echo "Oracle ODBC driver installed and registered:"
cat /etc/odbcinst.ini
