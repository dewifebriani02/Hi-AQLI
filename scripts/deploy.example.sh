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
#   3. Pastikan file environment aplikasi di VPS (`$REMOTE_PATH/.env.local` atau
#      sesuai urutan prioritas Next.js production:
#      `.env.production.local` > `.env.local` > `.env.production` > `.env`)
#      memuat:
#        DATABASE_URL='postgresql://...'
#        JWT_SECRET='<minimal 32 karakter acak, mis. openssl rand -hex 32>'
#        CRON_SECRET='<secret untuk /api/cron/daily-report>'   # disarankan
#      Catatan: VPS produksi saat ini menggunakan `$REMOTE_PATH/.env.local`.
#
#   4. (Opsional tapi disarankan) Penyimpanan upload persisten di luar folder app:
#      Walaupun `rsync` sudah mengecualikan `public/uploads/`, Anda dapat mengisi
#      `UPLOADS_DIR='/home/<SSH_USER>/hiaqli-uploads'` di `.env.deploy` (wajib path
#      absolut >= 3 level, di luar `REMOTE_PATH` dan bukan induk dari `REMOTE_PATH`).
#      Skrip akan membuat direktori tersebut di VPS, memindahkan isi `public/uploads/`
#      lama bila belum berupa symlink, lalu menautkan `public/uploads -> $UPLOADS_DIR`.
#      Jika `public/uploads` sudah berupa symlink ke target lain, deploy dihentikan
#      agar tidak memutus akses file lama secara diam-diam.
#
# PENGGUNAAN:
#   ./scripts/deploy.sh                     # Deploy penuh ke VPS
#   ./scripts/deploy.sh --check             # Dry-run ke VPS (cek pre-flight & itemize rsync tanpa ubah file)
#   ./scripts/deploy.sh --validate-config   # Validasi .env.deploy secara lokal tanpa koneksi jaringan
#   ./scripts/deploy.sh --local-test <dir>  # Uji pre-flight env & rsync dry-run ke direktori lokal (tanpa SSH)
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

INITIAL_VALIDATE_CONFIG="${DEPLOY_VALIDATE_CONFIG_ONLY:-0}"

usage() {
  cat <<'USAGE'
Penggunaan:
  ./scripts/deploy.sh                     Jalankan deploy penuh ke VPS
  ./scripts/deploy.sh --check             Dry-run rsync (--dry-run --itemize-changes) tanpa mengubah VPS
  ./scripts/deploy.sh --dry-run           Alias untuk --check
  ./scripts/deploy.sh --validate-config   Validasi file .env.deploy lokal tanpa koneksi SSH
  ./scripts/deploy.sh --local-test <dir>  Uji pre-flight env & rsync dry-run ke direktori lokal (tanpa SSH)
  ./scripts/deploy.sh --help              Tampilkan bantuan ini
USAGE
}

parse_cli_args() {
  DRY_RUN=0
  LOCAL_TEST_DIR=""
  VALIDATE_CONFIG_ONLY="$INITIAL_VALIDATE_CONFIG"

  while [ $# -gt 0 ]; do
    case "$1" in
      --check|--dry-run|-n)
        DRY_RUN=1
        shift
        ;;
      --validate-config)
        VALIDATE_CONFIG_ONLY=1
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
}

parse_cli_args "$@"

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

# Hitung panjang nilai variabel di satu file .env* (-1 bila variabel tidak didefinisikan).
# Tidak pernah mencetak nilai rahasia ke stdout/stderr.
env_var_len_in_file() {
  local file_path="$1"
  local var_name="$2"
  awk -v key="$var_name" '
    BEGIN { found = 0; val = "" }
    {
      line = $0
      sub(/\r$/, "", line)
      pattern = "^[[:space:]]*(export[[:space:]]+)?" key "[[:space:]]*="
      if (line ~ pattern) {
        found = 1
        sub(pattern, "", line)
        sub(/^[[:space:]]+/, "", line)
        sub(/[[:space:]]+$/, "", line)
        if ((line ~ /^".*"$/) || (line ~ /^'\''.*'\''$/)) {
          line = substr(line, 2, length(line) - 2)
        }
        sub(/^[[:space:]]+/, "", line)
        sub(/[[:space:]]+$/, "", line)
        val = line
      }
    }
    END {
      if (found) print length(val)
      else print -1
    }
  ' "$file_path"
}

# Validasi environment aplikasi mengikuti prioritas Next.js production:
#   .env.production.local > .env.local > .env.production > .env
validate_env_dir() {
  local app_dir="${1%/}"
  local mode="${2:-verbose}"
  local env_candidates=(".env.production.local" ".env.local" ".env.production" ".env")
  local found_files=()
  local f

  for f in "${env_candidates[@]}"; do
    if [ -f "$app_dir/$f" ]; then
      found_files+=("$f")
    fi
  done

  if [ "${#found_files[@]}" -eq 0 ]; then
    echo "❌ Pre-flight gagal: Tidak ditemukan file environment (.env.production.local, .env.local, .env.production, atau .env) di '$app_dir'." >&2
    echo "   VPS produksi menggunakan '$app_dir/.env.local' — pastikan memuat DATABASE_URL dan JWT_SECRET (minimal 32 karakter)." >&2
    return 1
  fi

  local db_src="" db_len=-1 len
  for f in "${found_files[@]}"; do
    len="$(env_var_len_in_file "$app_dir/$f" "DATABASE_URL")"
    if [ "$len" -ge 0 ]; then
      db_src="$f"
      db_len="$len"
      break
    fi
  done
  if [ -z "$db_src" ]; then
    echo "❌ Pre-flight gagal: DATABASE_URL tidak ditemukan di file environment ($app_dir: ${found_files[*]})." >&2
    return 1
  fi
  if [ "$db_len" -eq 0 ]; then
    echo "❌ Pre-flight gagal: Nilai DATABASE_URL kosong di '$app_dir/$db_src' (file prioritas tertinggi yang mendefinisikannya)." >&2
    return 1
  fi

  local jwt_src="" jwt_len=-1
  for f in "${found_files[@]}"; do
    len="$(env_var_len_in_file "$app_dir/$f" "JWT_SECRET")"
    if [ "$len" -ge 0 ]; then
      jwt_src="$f"
      jwt_len="$len"
      break
    fi
  done
  if [ -z "$jwt_src" ]; then
    echo "❌ Pre-flight gagal: JWT_SECRET tidak ditemukan di file environment ($app_dir: ${found_files[*]})." >&2
    return 1
  fi
  if [ "$jwt_len" -lt 32 ]; then
    echo "❌ Pre-flight gagal: JWT_SECRET di '$app_dir/$jwt_src' kurang dari 32 karakter (wajib minimal 32 karakter)." >&2
    return 1
  fi

  local cron_src="" cron_len=-1
  for f in "${found_files[@]}"; do
    len="$(env_var_len_in_file "$app_dir/$f" "CRON_SECRET")"
    if [ "$len" -ge 0 ]; then
      cron_src="$f"
      cron_len="$len"
      break
    fi
  done

  if [ "$mode" != "quiet" ]; then
    if [ -z "$cron_src" ] || [ "$cron_len" -le 0 ]; then
      echo "⚠️  Peringatan pre-flight: CRON_SECRET belum disetel (atau kosong) di file environment ($app_dir: ${found_files[*]}) — endpoint /api/cron/daily-report akan menolak request (fail-closed)." >&2
    fi

    local cron_note="belum disetel"
    if [ -n "$cron_src" ] && [ "$cron_len" -gt 0 ]; then
      cron_note="dari $cron_src"
    fi
    echo "✅ Pre-flight environment lolos (DATABASE_URL dari $db_src, JWT_SECRET dari $jwt_src, CRON_SECRET $cron_note)."
  fi
}

# Helper penyiapan direktori upload persisten + symlink (dipakai di remote & uji lokal)
prepare_uploads_symlink() {
  local app_dir="${1%/}"
  local uploads_dir="${2%/}"

  mkdir -p "$uploads_dir"
  chmod 755 "$uploads_dir"

  local real_app real_uploads
  real_app="$(cd "$app_dir" && pwd -P)"
  real_uploads="$(cd "$uploads_dir" && pwd -P)"

  if [ "$real_uploads" = "$real_app" ]; then
    echo "❌ UPLOADS_DIR ('$real_uploads') tidak boleh sama dengan REMOTE_PATH ('$real_app')." >&2
    return 1
  fi
  case "$real_uploads/" in
    "$real_app/"*)
      echo "❌ UPLOADS_DIR ('$real_uploads') tidak boleh berada di dalam REMOTE_PATH ('$real_app')." >&2
      return 1
      ;;
  esac
  case "$real_app/" in
    "$real_uploads/"*)
      echo "❌ UPLOADS_DIR ('$real_uploads') tidak boleh menjadi direktori induk dari REMOTE_PATH ('$real_app')." >&2
      return 1
      ;;
  esac

  local link_path="$app_dir/public/uploads"
  if [ -L "$link_path" ]; then
    local current_target current_clean
    current_target="$(readlink "$link_path")"
    current_clean="${current_target%/}"
    if [ "$current_clean" != "$uploads_dir" ] && [ "$current_clean" != "$real_uploads" ]; then
      echo "❌ Konflik symlink public/uploads: saat ini mengarah ke '$current_target', berbeda dari UPLOADS_DIR ('$uploads_dir')." >&2
      echo "   Deploy dihentikan agar file upload lama tidak hilang dari akses publik. Lakukan migrasi manual terlebih dahulu." >&2
      return 1
    fi
    echo "-> Symlink upload sudah aktif & sesuai: public/uploads -> $current_target"
    return 0
  fi

  if [ -e "$link_path" ]; then
    echo "-> Memindahkan isi public/uploads ke penyimpanan persisten ($uploads_dir)..."
    cp -a "$link_path/." "$uploads_dir/"
    rm -rf "$link_path"
  fi

  mkdir -p "$app_dir/public"
  ln -s "$uploads_dir" "$link_path"
  echo "-> Symlink upload aktif: public/uploads -> $uploads_dir"
}

validate_safe_abs_path_3levels() {
  local label="$1"
  local raw_path="$2"

  if [ -z "$raw_path" ]; then
    echo "❌ $label tidak boleh kosong." >&2
    return 1
  fi
  if printf '%s' "$raw_path" | grep -q '[[:space:]]'; then
    echo "❌ $label tidak boleh mengandung spasi atau karakter whitespace." >&2
    return 1
  fi
  case "$raw_path" in
    /*) ;;
    *)
      echo "❌ $label ('$raw_path') harus berupa path absolut (diawali '/')." >&2
      return 1
      ;;
  esac
  case "$raw_path" in
    *//*)
      echo "❌ $label ('$raw_path') tidak boleh mengandung '//'." >&2
      return 1
      ;;
  esac

  local clean_path="${raw_path%/}"
  case "${clean_path}/" in
    */../*|*/./*)
      echo "❌ $label ('$raw_path') tidak boleh mengandung segmen '..' atau '.'." >&2
      return 1
      ;;
  esac
  if printf '%s' "$raw_path" | grep -q '\.\.'; then
    echo "❌ $label ('$raw_path') tidak boleh mengandung '..'." >&2
    return 1
  fi

  case "$clean_path" in
    /*/*/*) ;;
    *)
      echo "❌ $label ('$raw_path') terlalu pendek: wajib path absolut minimal 3 level (mis. /home/<user>/...)." >&2
      return 1
      ;;
  esac
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
  validate_env_dir "$LOCAL_TEST_DIR"
  if [ -n "${LOCAL_TEST_UPLOADS_DIR:-}" ]; then
    validate_safe_abs_path_3levels "UPLOADS_DIR" "$LOCAL_TEST_UPLOADS_DIR"
    prepare_uploads_symlink "$LOCAL_TEST_DIR" "$LOCAL_TEST_UPLOADS_DIR"
  fi
  rsync -avz --delete --dry-run --itemize-changes \
    "${RSYNC_EXCLUDES[@]}" \
    ./ "${LOCAL_TEST_DIR%/}/"
  echo "✅ Uji lokal selesai (rsync berjalan dalam mode --dry-run)."
  exit 0
fi

# ------------------------------------------------------------------------------
# Baca & validasi konfigurasi dari .env.deploy (tanpa `set -a` agar secret tidak
# ter-export ke seluruh proses anak, lalu evaluasi ulang argumen CLI agar flag
# mode tidak pernah bisa ditimpa oleh isi .env.deploy)
# ------------------------------------------------------------------------------
ENV_DEPLOY_FILE="${ENV_DEPLOY_FILE:-$ROOT_DIR/.env.deploy}"
if [ ! -f "$ENV_DEPLOY_FILE" ]; then
  echo "❌ File konfigurasi deploy tidak ditemukan: $ENV_DEPLOY_FILE" >&2
  echo "   Salin '.env.deploy.example' menjadi '.env.deploy' lalu isi nilainya." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_DEPLOY_FILE"

# Pastikan variabel konfigurasi (terutama SSH_PASS) tidak di-export ke environment global proses anak
export -n VPS_IP SSH_USER REMOTE_PATH APP_PORT APP_DOMAIN PM2_APP_NAME SSH_KEY_PATH UPLOADS_DIR SSH_PASS 2>/dev/null || true

# Evaluasi ulang argumen CLI ("$@") setelah `source` agar DRY_RUN / flag mode tidak bisa ditimpa .env.deploy
parse_cli_args "$@"

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

validate_safe_abs_path_3levels "REMOTE_PATH" "$REMOTE_PATH"
REMOTE_PATH="${REMOTE_PATH%/}"

if ! printf '%s' "$APP_PORT" | grep -Eq '^[0-9]+$' || [ "$APP_PORT" -lt 1 ] || [ "$APP_PORT" -gt 65535 ]; then
  echo "❌ APP_PORT tidak valid: '$APP_PORT' (harus angka 1-65535)." >&2
  exit 1
fi

if [ -n "${UPLOADS_DIR:-}" ]; then
  validate_safe_abs_path_3levels "UPLOADS_DIR" "$UPLOADS_DIR"
  UPLOADS_DIR="${UPLOADS_DIR%/}"

  if [ "$UPLOADS_DIR" = "$REMOTE_PATH" ]; then
    echo "❌ UPLOADS_DIR ('$UPLOADS_DIR') tidak boleh sama dengan REMOTE_PATH ('$REMOTE_PATH')." >&2
    exit 1
  fi
  case "$UPLOADS_DIR/" in
    "$REMOTE_PATH/"*)
      echo "❌ UPLOADS_DIR ('$UPLOADS_DIR') harus berada di luar REMOTE_PATH ('$REMOTE_PATH')." >&2
      exit 1
      ;;
  esac
  case "$REMOTE_PATH/" in
    "$UPLOADS_DIR/"*)
      echo "❌ UPLOADS_DIR ('$UPLOADS_DIR') tidak boleh merupakan direktori induk dari REMOTE_PATH ('$REMOTE_PATH')." >&2
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
  if printf '%s' "$SSH_KEY_PATH" | grep -q '["'\''[:cntrl:]]'; then
    echo "❌ SSH_KEY_PATH mengandung karakter kutip atau kontrol yang tidak didukung." >&2
    exit 1
  fi
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
  echo "   Segera pastikan SSH key aktif, hapus SSH_PASS dari .env.deploy, dan rotasi password server." >&2
else
  SSH_OPTS+=(-o BatchMode=yes)
  RSYNC_SSH_CMD="$RSYNC_SSH_CMD -o BatchMode=yes"
fi

if [ "$VALIDATE_CONFIG_ONLY" = "1" ]; then
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

REMOTE_HELPER_FUNCS="$(declare -f env_var_len_in_file validate_env_dir prepare_uploads_symlink)"

# 1. Pre-flight check di VPS sebelum menyentuh file apa pun
echo ""
echo "🛡️  [1/4] Memeriksa environment (.env.production.local > .env.local > .env.production > .env) di VPS..."
REMOTE_PATH_ESCAPED="$(printf '%q' "$REMOTE_PATH")"
{
  printf 'set -euo pipefail\n%s\n' "$REMOTE_HELPER_FUNCS"
  cat <<'EOF'
if [ ! -d "$REMOTE_PATH" ]; then
  echo "❌ Pre-flight gagal: Direktori REMOTE_PATH '$REMOTE_PATH' tidak ditemukan di server." >&2
  exit 1
fi

validate_env_dir "$REMOTE_PATH"
EOF
} | run_ssh "REMOTE_PATH=${REMOTE_PATH_ESCAPED} bash -s"

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

{
  printf 'set -euo pipefail\n%s\n' "$REMOTE_HELPER_FUNCS"
  cat <<'EOF'
cd "$REMOTE_PATH"

# Pastikan kembali file environment utuh sebelum build/restart
validate_env_dir "$REMOTE_PATH" quiet

# Opsional: penyimpanan upload persisten di luar REMOTE_PATH via symlink
if [ -n "${UPLOADS_DIR:-}" ]; then
  prepare_uploads_symlink "$REMOTE_PATH" "$UPLOADS_DIR"
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
} | run_ssh "REMOTE_PATH=${REMOTE_PATH_ESCAPED} APP_PORT=${APP_PORT_ESCAPED} PM2_APP_NAME=${PM2_NAME_ESCAPED} UPLOADS_DIR=${UPLOADS_DIR_ESCAPED} bash -s"

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
