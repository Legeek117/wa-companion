#!/usr/bin/env bash
# Promotion / rétrogradation d'un utilisateur (plan + rôle) via la base de production.
# Usage local : ./scripts/promote.sh <email> <free|premium|vip|ban|unban>
# Usage distant : ./scripts/promote.sh <email> <action> --vps
set -euo pipefail

EMAIL="${1:?Usage: propose.sh <email> <action> [--vps]}"
ACTION="${2:?Usage: propose.sh <email> <action> [--vps]}"
MODE="${3:-local}"

PSQL_DOCKER="docker exec -i amda-postgres psql -U postgres -d amda"

run_sql() {
  if [ "$MODE" = "--vps" ]; then
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no root@180.149.197.43 \
      "$PSQL_DOCKER" < /dev/stdin
  else
    exec "$PSQL_DOCKER"
  fi
}

case "$ACTION" in
  free|premium|vip)
    SQL="UPDATE users SET plan = '$ACTION' WHERE email = '$EMAIL'
         RETURNING email, plan, role;"
    ;;
  admin)
    SQL="UPDATE users SET role = 'admin', plan = 'vip' WHERE email = '$EMAIL'
         RETURNING email, plan, role;"
    ;;
  ban)
    SQL="UPDATE users SET banned = true, banned_at = now(),
         ban_reason = 'Ban manuel (admin) ' || now()::date
         WHERE email = '$EMAIL'
         RETURNING email, banned, ban_reason;"
    ;;
  unban)
    SQL="UPDATE users SET banned = false, banned_at = NULL, ban_reason = NULL
         WHERE email = '$EMAIL'
         RETURNING email, banned;"
    ;;
  *) echo "Action inconnue: $ACTION (free|premium|vip|admin|ban|unban)" >&2; exit 1 ;;
esac

run_sql <<SQL
$SQL
SQL