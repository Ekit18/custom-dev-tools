# MongoDB with replica set (required by Prisma for transactional upserts, etc.).
# Bitnami wires up a single-node replica set when MONGODB_REPLICA_SET_MODE=primary.
#
# Railway: set env vars in the Mongo service (see docker/mongo/README.md).
# Compose: see docker-compose.local.yml / docker-compose.prod.yml

FROM bitnami/mongodb:7.0

EXPOSE 27017

# Runtime configuration is via env (do not bake secrets here):
# - MONGODB_ROOT_USER / MONGODB_ROOT_PASSWORD
# - MONGODB_REPLICA_SET_MODE=primary
# - MONGODB_REPLICA_SET_NAME=rs0
# - MONGODB_REPLICA_SET_KEY (>=6 hex chars; use a long random hex string)
# - MONGODB_ADVERTISED_HOSTNAME (hostname clients/RS use — critical on Railway)
