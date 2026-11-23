# Docker Compose 3-Tier App Deployment

A three-tier application orchestrated with **Docker Compose**, running three containers:

- **Frontend** — Nginx serving a static page (port `8080`)
- **Backend** — Node.js HTTP API backed by MySQL (port `3000`)
- **Database** — MySQL 8.4 with an init script that creates the schema on first boot

Services communicate over a shared bridge network, the database persists to a named volume, and a healthcheck ensures the backend only starts once MySQL is ready.

---

## Project Structure

```text
docker-compose-demo/
├── compose.yaml
├── README.md
├── frontend/
│   ├── Dockerfile
│   └── index.html
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
└── database/
    ├── Dockerfile
    └── init.sql
```

---

## Architecture

```text
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │─────▶│   Backend    │─────▶│   Database   │
│   (Nginx)    │      │  (Node.js)   │      │   (MySQL)    │
│   :8080→80   │      │    :3000     │      │    :3306     │
└──────────────┘      └──────────────┘      └──────────────┘
        └──────────────────── app_network ─────────────────┘
                                  │
                            db_data (volume)
```

- Frontend talks to the backend at `http://localhost:3000` (from the host) or `http://backend:3000` (inside the network).
- Backend connects to MySQL using the service name `database` as hostname.
- `db_data` persists `/var/lib/mysql` so data survives container restarts.

---

## Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) 20.10+
- Docker Compose v2 (`docker compose`, not `docker-compose`)

Verify:

```bash
docker --version
docker compose version
```

> **Optional:** To run Docker without `sudo`, add your user to the `docker` group:
> ```bash
> sudo usermod -aG docker $USER
> newgrp docker
> ```

---

## Quick Start

```bash
# 1. Clone / cd into the project
cd docker-compose-demo

# 2. Build images and start all containers
sudo docker compose up -d --build

# 3. Check status
sudo docker compose ps
```

You should see:

| Name            | Status   |
|-----------------|----------|
| `app_database`  | healthy  |
| `app_backend`   | running  |
| `app_frontend`  | running  |

---

## Usage

### Frontend

Open in a browser:

```
http://localhost:8080
```

Or:

```bash
curl http://localhost:8080
# → <!DOCTYPE html>...<h1>Frontend is running</h1>...
```

### Backend API

| Method | Endpoint   | Description                |
|--------|------------|----------------------------|
| GET    | `/health`  | DB connectivity check      |
| GET    | `/users`   | List all users             |
| POST   | `/users`   | Create a user (`name`, `email`) |

**Check DB connectivity:**

```bash
curl http://localhost:3000/health
# → {"db":"up"}
```

**Add a user:**

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
# → {"id":1,"name":"Alice","email":"alice@example.com"}
```

**List users:**

```bash
curl http://localhost:3000/users
# → [{"id":1,"name":"Alice","email":"alice@example.com", ...}]
```

### Database

Connect directly with `docker compose exec`:

```bash
sudo docker compose exec database mysql -u app_user -papp_password mydb
```

Or from your host (port `3306` is exposed):

```bash
mysql -h 127.0.0.1 -P 3306 -u app_user -papp_password mydb
```

---

## Configuration

### Environment Variables

Defined in `compose.yaml` for demonstration purposes only. For real deployments, use a `.env` file or Docker secrets.

| Variable              | Service  | Value                |
|-----------------------|----------|----------------------|
| `MYSQL_ROOT_PASSWORD` | database | `root_password`      |
| `MYSQL_DATABASE`      | database | `mydb`               |
| `MYSQL_USER`          | database | `app_user`           |
| `MYSQL_PASSWORD`      | database | `app_password`       |
| `DB_HOST`             | backend  | `database`           |
| `DB_PORT`             | backend  | `3306`               |
| `DB_NAME`             | backend  | `mydb`               |
| `DB_USER`             | backend  | `app_user`           |
| `DB_PASSWORD`         | backend  | `app_password`       |

> ⚠️ **Never commit real credentials.** Replace the values above with `.env` references before pushing to a public repo.

### Ports

| Host  | Container | Service  |
|-------|-----------|----------|
| 8080  | 80        | frontend |
| 3000  | 3000      | backend  |
| 3306  | 3306      | database |

Remove the `3306:3306` mapping if you don't need direct DB access from the host.

### Volumes

- `db_data` → mounted at `/var/lib/mysql` — persists MySQL data across container restarts.

---

## Common Commands

```bash
# Start (detached)
sudo docker compose up -d --build

# View logs
sudo docker compose logs -f
sudo docker compose logs -f backend

# Stop containers (data preserved)
sudo docker compose down

# Stop AND delete the database volume (⚠️ wipes all data)
sudo docker compose down -v

# Rebuild a single service
sudo docker compose up -d --build backend

# Open a shell inside a container
sudo docker compose exec backend sh
sudo docker compose exec database bash

# Run a MySQL query one-liner
sudo docker compose exec database \
  mysql -u app_user -papp_password mydb -e "SELECT * FROM users;"
```

---

## Database Schema

Created automatically on first container start via `database/init.sql`:

```sql
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> **Init scripts run only once** — when the MySQL data directory is empty.
> To re-run `init.sql`, wipe the volume first:
> ```bash
> sudo docker compose down -v
> sudo docker compose up -d --build
> ```

---

## Troubleshooting

### `path "./frontend" not found`

The `compose.yaml` expects `frontend/`, `backend/`, and `database/` folders to exist with a `Dockerfile` in each. Create them or update the `build:` paths in `compose.yaml`.

### `Access denied for user 'app_user'`

`MYSQL_USER` / `MYSQL_PASSWORD` only take effect **on first init**. If the volume was created before these were set:

```bash
sudo docker compose down -v
sudo docker compose up -d --build
```

### Backend can't reach the database

Check that:

1. `DB_HOST` in `compose.yaml` is `database` (the service name).
2. Both services are on `app_network`.
3. `docker compose ps` shows `app_database` as `healthy`.

### Port already in use

If `8080`, `3000`, or `3306` is taken, edit the host-side of the port mapping in `compose.yaml`, e.g.:

```yaml
ports:
  - "8081:80"      # frontend now on 8081
```

---

## Acceptance Criteria

- [x] `docker compose up -d --build` starts all 3 containers
- [x] `app_database` reports `healthy` before backend starts
- [x] Backend reaches MySQL (`GET /health` → `{"db":"up"}`)
- [x] Backend reads/writes rows (`POST /users`, `GET /users`)
- [x] Frontend serves a page on `:8080`
- [x] Data persists across `docker compose down` + `up`
- [x] Services resolve each other via service name, not IP

---

## Tech Stack

| Layer     | Technology                |
|-----------|---------------------------|
| Frontend  | Nginx (`nginx:alpine`)    |
| Backend   | Node.js 20 (`node:20-alpine`) + `mysql2` |
| Database  | MySQL 8.4                 |
| Orchestration | Docker Compose v2     |

---

## License

MIT — use freely for learning and experimentation.
