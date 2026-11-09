
#!/bin/bash

set -e

# Localiza a raiz do projeto.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

DB_USER="manutencao_user"
DB_NAME="condofix_test"

echo "Preparando banco de testes..."

# Remove e recria exclusivamente o banco de testes.
docker compose exec -T postgres psql \
  -v ON_ERROR_STOP=1 \
  -U "$DB_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);" \
  -c "CREATE DATABASE $DB_NAME;"

# Reproduz a estrutura e os dados iniciais.
for arquivo in \
  01-schema.sql \
  02-seed.sql \
  03-functions.sql \
  04-views.sql \
  05-triggers.sql \
  06-constraints.sql \
  07-permissoes.sql \
  08-database-init.sql
do
  echo "Executando $arquivo..."

  docker compose exec -T postgres psql \
    -v ON_ERROR_STOP=1 \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    < "database/$arquivo"
done

echo "Banco de testes preparado com sucesso!"
