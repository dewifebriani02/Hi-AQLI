#!/usr/bin/env bash

# ==============================================================================
# Automated Deployment Script for Hi-AQLI -> VPS
# ==============================================================================
#
# SETUP AWAL (1x di mesin lokal):
#   1. Salin konfigurasi contoh & isi nilainya:
#        cp .env.deploy.example .env.deploy
#        chmod 600 .env.deploy
#      Jika belum ada `scripts/deploy.sh` lokal:
#        cp scripts/deploy.example.sh scripts/deploy.sh
#        chmod +x scripts/deploy.sh
#
#   2. Pasang SSH Key ke VPS (direkomendasikan — tanpa password):
#        ssh-keygen -t ed25519 -C "deploy@hiaqli"
#        ssh-copy-id -i ~/.ssh/id_ed25519.pub <SSH_USER>@<VPS_IP>
#        ssh <SSH_USER>@<VPS_IP> "echo SSH key siap"
#      Setelah berhasil login tanpa password, pastikan `SSH_PASS` dihapus atau
#      dikosongkan di `.env.deploy`, lalu rotasi password SSH lama di VPS.
#
#   3. Pastikan file `.env` di VPS (`$REMOTE_PATH/.env`) sudah memiliki:
#        DATABASE_URL='postgresql://...'
#        JWT_SECRET='<minimal 32 karakter acak, mis. openssl rand -hex 32>'
#
#   4. (Opsional tapi disarankan) Penyimpanan upload persisten di luar folder app:
#      Walaupun `rsync` sudah mengecualikan `public/uploads/`, Anda dapat mengisi
#      `UPLOADS_DIR='/home/<SSH_USER>/hiaqli-uploads'` di `.env.deploy`. Skrip akan
#      membuat direktori tersebut di VPS, memindahkan isi `public/uploads/` lama
#      bila belum berupa symlink, lalu menautkan `public/uploads -> $UPLOADS_DIR`
#      sehingga file upload sepenuhnya terpisah dari direktori aplikasi.
#
# PENGGUNAAN:
#   ./scripts/deploy.sh                     # Deploy penuh ke VPS
#   ./scripts/deploy.sh --check             # Dry-run ke VPS (cek pre-flight & itemize rsync tanpa ubah file)
#   ./scripts/deploy.sh --local-test <dir>  # Uji pre-flight & rsync dry-run ke direktori lokal (tanpa SSH/jaringan)
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN=0
LOCAL_TEST_DIR=""

usage() {
  cat <<'USAGE'
Penggunaan:
  ./scripts/deploy.sh                     Jalankan deploy penuh ke VPS
  ./scripts/deploy.sh --check             Dry-run rsync (--dry-run --itemize-changes) tanpa mengubah VPS
  ./scripts/deploy.sh --dry-run           Alias untuk --check
  ./scripts/deploy.sh --local-test <dir>  Uji pre-flight .env & rsync dry-run ke direktori lokal (tanpa SSH)
  ./scripts/deploy.sh --help              Tampilkan bantuan ini
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --check|--dry-run|-n)
      DRY_RUN=1
      shift
      ;;
    --local-test)
      if [ $# -lt 2 ] || [ -z "${2:-}" ]; then
        echo "❌ Argumen --local-test membutuhkan path direktori lokal tujuan." >&2
        exit 1
      fi
      LOCAL_TEST_DIR="$2"
      DRY_RUN=1
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "❌ Argumen tidak dikenal: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

# Daftar pengecualian rsync agar data runtime & kredensial di server tidak pernah tertimpa/terhapus
RSYNC_EXCLUDES=(
  --exclude 'node_modules'
  --exclude '.git'
  --exclude '.next'
  --exclude 'tmp'
  --exclude 'backups'
  --exclude '*.log'
  --exclude 'public/uploads'
  --exclude 'public/uploads/'
  --exclude '.env*'
  --exclude '.env.deploy'
  --exclude 'scripts/deploy.sh'
  --exclude '.codex'
  --exclude '.claude'
  --exclude 'docs/DATABASE_ACCESS.md'
)

# Validasi isi file .env (tanpa pernah mencetak nilai rahasia ke terminal/log)
validate_env_file() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    echo "❌ Pre-flight gagal: File .env tidak ditemukan di '$env_file'." >&2
    echo "   Pastikan .env di server memuat DATABASE_URL dan JWT_SECRET sebelum deploy." >&2
    return 1
  fi

  if ! grep -q '^DATABASE_URL=' "$env_file"; then
    echo "❌ Pre-flight gagal: DATABASE_URL tidak ditemukan di '$env_file'." >&2
    return 1
  fi
  local db_len
  db_len="$(awk '/^DATABASE_URL=/{line=$0; sub(/^DATABASE_URL=/,"",line); gsub(/^[[:space:]"'\'']+|[[:space:]"'\''\r]+$/,"",line); print length(line); exit}' "$env_file")"
  if [ "${db_len:-0}" -eq 0 ]; then
    echo "❌ Pre-flight gagal: Nilai DATABASE_URL kosong di '$env_file'." >&2
    return 1
  fi

  if ! grep -q '^JWT_SECRET=' "$env_file"; then
    echo "❌ Pre-flight gagal: JWT_SECRET tidak ditemukan di '$env_file'." >&2
    return 1
  fi
  local jwt_len
  jwt_len="$(awk '/^JWT_SECRET=/{line=$0; sub(/^JWT_SECRET=/,"",line); gsub(/^[[:space:]"'\'']+|[[:space:]"'\''\r]+$/,"",line); print length(line); exit}' "$env_file")"
  if [ "${jwt_len:-0}" -lt 32 ]; then
    echo "❌ Pre-flight gagal: JWT_SECRET di '$env_file' wajib minimal 32 karakter." >&2
    return 1
  fi

  echo "✅ Pre-flight .env lolos (DATABASE_URL & JWT_SECRET terkonfigurasi)."
}

# Mode verifikasi lokal (murni lokal, tanpa koneksi SSH / VPS)
if [ -n "$LOCAL_TEST_DIR" ]; then
  if [ ! -d "$LOCAL_TEST_DIR" ]; then
    echo "❌ Direktori lokal '$LOCAL_TEST_DIR' tidak ditemukan." >&2
    exit 1
  fi
  echo "=================================================="
  echo "🧪 Mode Uji Lokal Deploy Hi-AQLI (Tanpa SSH/VPS)"
  echo "=================================================="
  validate_env_file "${LOCAL_TEST_DIR%/}/.env"
  rsync -avz --delete --dry-run --itemize-changes \
    "${RSYNC_EXCLUDES[@]}" \
    ./ "${LOCAL_TEST_DIR%/}/"
  echo "✅ Uji lokal selesai (tidak ada file yang diubah)."
  exit 0
fi

# ------------------------------------------------------------------------------
# Baca & validasi konfigurasi dari .env.deploy
# ------------------------------------------------------------------------------
ENV_DEPLOY_FILE="${ENV_DEPLOY_FILE:-$ROOT_DIR/.env.deploy}"
if [ ! -f "$ENV_DEPLOY_FILE" ]; then
  echo "❌ File konfigurasi deploy tidak ditemukan: $ENV_DEPLOY_FILE" >&2
  echo "   Salin '.env.deploy.example' menjadi '.env.deploy' lalu isi nilainya." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_DEPLOY_FILE"
set +a

MISSING_VARS=()
for required_var in VPS_IP SSH_USER REMOTE_PATH APP_PORT; do
  val="${!required_var:-}"
  if [ -z "$val" ]; then
    MISSING_VARS+=("$required_var")
  fi
done

if [ "${#MISSING_VARS[@]}" -gt 0 ]; then
  echo "❌ Variabel wajib belum diisi di $ENV_DEPLOY_FILE: ${MISSING_VARS[*]}" >&2
  exit 1
fi

# Guard keamanan path agar rsync --delete tidak pernah mengarah ke root atau path pendek berbahaya
case "$REMOTE_PATH" in
  /*/*/*)
    ;;
  *)
    echo "❌ REMOTE_PATH tidak aman atau terlalu pendek: '$REMOTE_PATH' (harus path absolut minimal 3 level, mis. /home/<user>/htdocs/<app>)." >&2
    exit 1
    ;;
esac

if printf '%s' "$REMOTE_PATH" | grep -q '[[:space:]]'; then
  echo "❌ REMOTE_PATH tidak boleh mengandung spasi." >&2
  exit 1
fi

if ! printf '%s' "$APP_PORT" | grep -Eq '^[0-9]+$' || [ "$APP_PORT" -lt 1 ] || [ "$APP_PORT" -gt 65535 ]; then
  echo "❌ APP_PORT tidak valid: '$APP_PORT' (harus angka 1-65535)." >&2
  exit 1
fi

if [ -n "${UPLOADS_DIR:-}" ]; then
  case "$UPLOADS_DIR" in
    "$REMOTE_PATH"|"$REMOTE_PATH"/*)
      echo "❌ UPLOADS_DIR ('$UPLOADS_DIR') harus berada di luar REMOTE_PATH ('$REMOTE_PATH')." >&2
      exit 1
      ;;
    /*/*)
      ;;
    *)
      echo "❌ UPLOADS_DIR ('$UPLOADS_DIR') harus berupa path absolut yang valid." >&2
      exit 1
      ;;
  esac
fi

APP_DOMAIN="${APP_DOMAIN:-hiaqli.pro}"
PM2_APP_NAME="${PM2_APP_NAME:-hiaqli-app}"

# ------------------------------------------------------------------------------
# Konfigurasi autentikasi SSH (Default: SSH key; Fallback: sshpass bila SSH_PASS diisi)
# ------------------------------------------------------------------------------
USE_SSHPASS=0
SSH_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=15
)
RSYNC_SSH_CMD="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"

if [ -n "${SSH_KEY_PATH:-}" ]; then
  if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ File SSH_KEY_PATH tidak ditemukan: $SSH_KEY_PATH" >&2
    exit 1
  fi
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
  RSYNC_SSH_CMD="$RSYNC_SSH_CMD -i \"$SSH_KEY_PATH\""
fi

if [ -n "${SSH_PASS:-}" ]; then
  USE_SSHPASS=1
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "❌ SSH_PASS diisi di .env.deploy tetapi 'sshpass' tidak terpasang." >&2
    echo "   Pasang SSH key ke server (disarankan) lalu hapus SSH_PASS dari .env.deploy." >&2
    exit 1
  fi
  echo "⚠️  PERINGATAN KEAMANAN: Menggunakan fallback password SSH (SSH_PASS terdeteksi di .env.deploy)." >&2
  echo "   Segera beralih ke SSH key (ssh-keygen & ssh-copy-id), hapus SSH_PASS, dan rotasi password server." >&2
else
  SSH_OPTS+=(-o BatchMode=yes)
  RSYNC_SSH_CMD="$RSYNC_SSH_CMD -o BatchMode=yes"
fi

if [ "${DEPLOY_VALIDATE_CONFIG_ONLY:-0}" = "1" ]; then
  echo "✅ Konfigurasi .env.deploy valid (mode auth: $([ "$USE_SSHPASS" -eq 1 ] && echo 'sshpass-fallback' || echo 'ssh-key'))."
  exit 0
fi

run_ssh() {
  if [ "$USE_SSHPASS" -eq 1 ]; then
    SSHPASS="$SSH_PASS" sshpass -e ssh "${SSH_OPTS[@]}" "${SSH_USER}@${VPS_IP}" "$@"
  else
    ssh "${SSH_OPTS[@]}" "${SSH_USER}@${VPS_IP}" "$@"
  fi
}

run_rsync() {
  local extra_flags=()
  if [ "$DRY_RUN" -eq 1 ]; then
    extra_flags+=(--dry-run --itemize-changes)
  fi
  if [ "$USE_SSHPASS" -eq 1 ]; then
    SSHPASS="$SSH_PASS" sshpass -e rsync -avz --delete \
      ${extra_flags[@]+"${extra_flags[@]}"} \
      "${RSYNC_EXCLUDES[@]}" \
      -e "$RSYNC_SSH_CMD" \
      ./ "${SSH_USER}@${VPS_IP}:${REMOTE_PATH}/"
  else
    rsync -avz --delete \
      ${extra_flags[@]+"${extra_flags[@]}"} \
      "${RSYNC_EXCLUDES[@]}" \
      -e "$RSYNC_SSH_CMD" \
      ./ "${SSH_USER}@${VPS_IP}:${REMOTE_PATH}/"
  fi
}

echo "=================================================="
if [ "$DRY_RUN" -eq 1 ]; then
  echo "🔍 Mode Dry-Run (--check) Deploy Hi-AQLI ke VPS"
else
  echo "🚀 Memulai Deploy Otomatis Hi-AQLI ke VPS"
fi
echo "=================================================="
echo "📡 Target Server : ${SSH_USER}@${VPS_IP}:${REMOTE_PATH}"
echo "🌐 Port Target   : ${APP_PORT}"
echo "🔑 Autentikasi   : $([ "$USE_SSHPASS" -eq 1 ] && echo 'Fallback Password (sshpass)' || echo 'SSH Key')"

# 1. Pre-flight check di VPS sebelum menyentuh file apa pun
echo ""
echo "🛡️  [1/4] Memeriksa .env (DATABASE_URL & JWT_SECRET) di VPS..."
REMOTE_PATH_ESCAPED="$(printf '%q' "$REMOTE_PATH")"
run_ssh "REMOTE_PATH=${REMOTE_PATH_ESCAPED} bash -s" <<'EOF'
set -euo pipefail

if [ ! -d "$REMOTE_PATH" ]; then
  echo "❌ Pre-flight gagal: Direktori REMOTE_PATH '$REMOTE_PATH' tidak ditemukan di server." >&2
  exit 1
fi

cd "$REMOTE_PATH"

if [ ! -f .env ]; then
  echo "❌ Pre-flight gagal: File .env tidak ditemukan di $REMOTE_PATH/.env." >&2
  echo "   Buat file .env dengan DATABASE_URL dan JWT_SECRET (minimal 32 karakter) terlebih dahulu." >&2
  exit 1
fi

if ! grep -q '^DATABASE_URL=' .env; then
  echo "❌ Pre-flight gagal: DATABASE_URL belum ada di $REMOTE_PATH/.env." >&2
  exit 1
fi
DB_LEN="$(awk '/^DATABASE_URL=/{line=$0; sub(/^DATABASE_URL=/,"",line); gsub(/^[[:space:]"'\'']+|[[:space:]"'\''\r]+$/,"",line); print length(line); exit}' .env)"
if [ "${DB_LEN:-0}" -eq 0 ]; then
  echo "❌ Pre-flight gagal: Nilai DATABASE_URL kosong di $REMOTE_PATH/.env." >&2
  exit 1
fi

if ! grep -q '^JWT_SECRET=' .env; then
  echo "❌ Pre-flight gagal: JWT_SECRET belum ada di $REMOTE_PATH/.env." >&2
  exit 1
fi
JWT_LEN="$(awk '/^JWT_SECRET=/{line=$0; sub(/^JWT_SECRET=/,"",line); gsub(/^[[:space:]"'\'']+|[[:space:]"'\''\r]+$/,"",line); print length(line); exit}' .env)"
if [ "${JWT_LEN:-0}" -lt 32 ]; then
  echo "❌ Pre-flight gagal: Nilai JWT_SECRET di $REMOTE_PATH/.env wajib minimal 32 karakter." >&2
  exit 1
fi

echo "✅ Pre-flight .env di server lolos."
EOF

# 2. Sinkronisasi Kode via Rsync (mengecualikan public/uploads/ & .env*)
echo ""
if [ "$DRY_RUN" -eq 1 ]; then
  echo "📦 [2/4] Menjalankan simulasi rsync (--dry-run --itemize-changes)..."
  run_rsync
  echo ""
  echo "✅ Mode --check selesai. Tidak ada file di VPS yang diubah dan PM2 tidak di-restart."
  exit 0
fi

echo "📦 [2/4] Mengunggah file project ke VPS..."
run_rsync
echo "✅ File berhasil diunggah (public/uploads/ dan .env* terlindungi)."

# 3. Eksekusi Remote Pre-flight Ulang, Symlink Upload (Opsional), Build & Restart PM2
echo ""
echo "⚙️  [3/4] Menginstall dependensi, Build & Restart PM2 di VPS..."
APP_PORT_ESCAPED="$(printf '%q' "$APP_PORT")"
PM2_NAME_ESCAPED="$(printf '%q' "$PM2_APP_NAME")"
UPLOADS_DIR_ESCAPED="$(printf '%q' "${UPLOADS_DIR:-}")"

run_ssh "REMOTE_PATH=${REMOTE_PATH_ESCAPED} APP_PORT=${APP_PORT_ESCAPED} PM2_APP_NAME=${PM2_NAME_ESCAPED} UPLOADS_DIR=${UPLOADS_DIR_ESCAPED} bash -s" <<'EOF'
set -euo pipefail
cd "$REMOTE_PATH"

# Pastikan kembali .env utuh sebelum build/restart
grep -q '^DATABASE_URL=' .env || { echo "❌ DATABASE_URL hilang dari .env!" >&2; exit 1; }
grep -q '^JWT_SECRET=' .env || { echo "❌ JWT_SECRET hilang dari .env!" >&2; exit 1; }

# Opsional: penyimpanan upload persisten di luar REMOTE_PATH via symlink
if [ -n "${UPLOADS_DIR:-}" ]; then
  mkdir -p "$UPLOADS_DIR"
  chmod 755 "$UPLOADS_DIR"
  if [ -e "public/uploads" ] && [ ! -L "public/uploads" ]; then
    echo "-> Memindahkan isi public/uploads ke penyimpanan persisten ($UPLOADS_DIR)..."
    cp -a public/uploads/. "$UPLOADS_DIR/"
    rm -rf public/uploads
  fi
  mkdir -p public
  ln -sfn "$UPLOADS_DIR" public/uploads
  echo "-> Symlink upload aktif: public/uploads -> $UPLOADS_DIR"
fi

echo "-> Installing npm packages..."
npm install --silent

echo "-> Building Next.js application..."
npm run build

echo "-> Restarting Application with PM2 ($PM2_APP_NAME) on port $APP_PORT..."
if npx pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
  npx pm2 reload "$PM2_APP_NAME" --update-env
else
  npx pm2 start npm --name "$PM2_APP_NAME" -- start -- -p "$APP_PORT"
fi
npx pm2 save
EOF

echo "✅ Build & Restart PM2 selesai."

# 4. Health Check
echo ""
echo "🩺 [4/4] Memeriksa status website..."
HTTP_STATUS="$(curl -s -k -o /dev/null -w "%{http_code}" --resolve "${APP_DOMAIN}:443:${VPS_IP}" "https://${APP_DOMAIN}/" || true)"
DNS_IP="$(dig +short "$APP_DOMAIN" | tail -n1 || true)"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "308" ]; then
  echo "🎉 DEPLOY BERHASIL! Aplikasi aktif dan merespon HTTP $HTTP_STATUS OK."
  if [ -n "$DNS_IP" ] && [ "$DNS_IP" != "$VPS_IP" ]; then
    echo "ℹ️  Catatan DNS: Domain $APP_DOMAIN mengarah ke IP berbeda dari VPS_IP. Periksa konfigurasi DNS/proxy bila diperlukan."
  else
    echo "🌐 Domain $APP_DOMAIN terhubung ke VPS!"
  fi
else
  echo "⚠️  VPS mengembalikan HTTP status: $HTTP_STATUS (cek logs PM2 jika diperlukan)."
fi

echo "=================================================="
