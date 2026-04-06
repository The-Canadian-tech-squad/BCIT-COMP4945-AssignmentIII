## Docker Oracle Runtime Inputs

This folder is used only for local Docker builds.

### `packages/`

Put Oracle Linux Instant Client zip files here before `docker compose up --build`:

- `instantclient-basic*linux*.zip`
- `instantclient-odbc*linux*.zip`

### `wallet/`

Put wallet files here:

- `tnsnames.ora`
- `sqlnet.ora`
- `cwallet.sso`
- other wallet files

`docker-compose.yml` mounts this folder to `/opt/oracle/wallet` inside both API containers.
