# MongoDB (replica set) for Prisma

This image is **Bitnami MongoDB 7** with **primary replica-set mode**, so Prisma can use MongoDB features that expect a replica set.

## Railway

1. Create a **new service** → **Dockerfile** → set root directory to repo (or only `docker/mongo` if you use a monorepo layout) and Dockerfile path to `docker/mongo/Dockerfile`.
2. Add a **persistent volume** mounted at `/bitnami/mongodb` (Bitnami data dir).
3. Set variables (example names — adjust to match your app):

| Variable | Example | Notes |
|----------|---------|--------|
| `MONGODB_ROOT_USER` | `mongo` | Root user name |
| `MONGODB_ROOT_PASSWORD` | *(strong secret)* | |
| `MONGODB_DATABASE` | `mongo` | Optional default DB name |
| `MONGODB_REPLICA_SET_MODE` | `primary` | Required for a single primary + RS |
| `MONGODB_REPLICA_SET_NAME` | `rs0` | Must match Prisma URL |
| `MONGODB_REPLICA_SET_KEY` | 64+ hex chars | e.g. `openssl rand -hex 32` |
| `MONGODB_ADVERTISED_HOSTNAME` | see below | **Important** for replica set |

**`MONGODB_ADVERTISED_HOSTNAME`**

- Must be the hostname MongoDB advertises to clients (and for `rs.initiate` members).
- On Railway, use the **private** hostname of the Mongo service (often shown as `*.railway.internal` in the service networking tab), e.g. `mongodb.railway.internal`.
- If this is wrong, drivers may fail to resolve replica set members.

## `MONGO_DATABASE_URL` (Prisma / `prisma-mongo`)

Use your DB name, user, password, host (public proxy or internal), port, and **`replicaSet` must match** `MONGODB_REPLICA_SET_NAME`:

```text
mongodb://mongo:YOUR_PASSWORD@HOST:PORT/YOUR_DB?authSource=admin&replicaSet=rs0
```

If you only have one member and see discovery issues, try adding:

```text
&directConnection=true
```

(URL-encode password if it contains special characters.)

## Docker Compose

See `docker/docker-compose.local.yml` and `docker/docker-compose.prod.yml` for working examples.

## Official `mongo` image

The previous `mongo:7` + keyfile + manual `rs.initiate()` setup is fragile in one container. Bitnami is used here so replica set + auth are consistent across local and Railway.
