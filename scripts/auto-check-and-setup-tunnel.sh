./scripts/auto-check-and-setup-tunnel.sh#!/usr/bin/env bash
set -euo pipefail

## === Config ===
TUNNEL_NAME="postgres-tunnel"
AUTH_HOST="qtusdev-psql.qtusdev.website"
LOCAL_PG_HOST="127.0.0.1"
LOCAL_PG_PORT="5432"  # Đổi về 5432 (port PostgreSQL chuẩn)
CLOUDFLARE_BIN="/usr/local/bin/cloudflared"
CONFIG_FILE="/etc/cloudflared/${TUNNEL_NAME}.yaml"
CREDENTIALS_DIR="/root/.cloudflared"

## === Colors ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

## === Helper functions ===
print_step() {
    echo -e "${GREEN}[*]${NC} $1"
}

print_error() {
    echo -e "${RED}[!] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!] WARNING:${NC} $1"
}

## === 1. Kiểm tra và cài cloudflared ===
print_step "Checking cloudflared installation..."
if ! command -v cloudflared >/dev/null 2>&1; then
    print_warning "cloudflared not found. Installing..."
    
    # Detect OS
    if [[ -f /etc/debian_version ]]; then
        # Debian/Ubuntu
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
        sudo dpkg -i /tmp/cloudflared.deb || sudo apt-get install -f -y
        rm -f /tmp/cloudflared.deb
    elif [[ -f /etc/redhat-release ]]; then
        # RHEL/CentOS
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.rpm -o /tmp/cloudflared.rpm
        sudo rpm -i /tmp/cloudflared.rpm
        rm -f /tmp/cloudflared.rpm
    else
        print_error "Unsupported OS. Please install cloudflared manually."
        exit 1
    fi
    
    print_step "cloudflared installed successfully."
else
    VERSION=$(cloudflared --version | head -n1)
    print_step "cloudflared already installed: $VERSION"
fi

## === 2. Kiểm tra login ===
print_step "Checking Cloudflare login..."
if [[ ! -f "$CREDENTIALS_DIR/cert.pem" ]]; then
    print_warning "Not logged in to Cloudflare. Please run: cloudflared tunnel login"
    print_step "Opening browser for login..."
    cloudflared tunnel login
    if [[ ! -f "$CREDENTIALS_DIR/cert.pem" ]]; then
        print_error "Login failed. Please try again manually."
        exit 1
    fi
else
    print_step "Already logged in to Cloudflare."
fi

## === 3. Kiểm tra tunnel đã tồn tại chưa ===
print_step "Checking tunnel: $TUNNEL_NAME"
TUNNEL_ID=""
if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
    print_step "Tunnel '$TUNNEL_NAME' already exists."
    TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
    print_step "Tunnel ID: $TUNNEL_ID"
else
    print_warning "Tunnel '$TUNNEL_NAME' not found. Creating..."
    TUNNEL_OUTPUT=$(cloudflared tunnel create "$TUNNEL_NAME" 2>&1)
    TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -oP '(?<=Tunnel credentials written to ).*?(?=/.*\.json)' | sed 's|.*/||' || echo "$TUNNEL_OUTPUT" | grep -oP '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -n1)
    
    if [[ -z "$TUNNEL_ID" ]]; then
        # Try to find JSON file
        JSON_FILE=$(find "$CREDENTIALS_DIR" -name "*${TUNNEL_NAME}*.json" -o -name "*tunnel*.json" | head -n1)
        if [[ -n "$JSON_FILE" ]]; then
            TUNNEL_ID=$(basename "$JSON_FILE" .json)
        else
            print_error "Could not determine tunnel ID. Please check manually."
            exit 1
        fi
    fi
    
    print_step "Tunnel created with ID: $TUNNEL_ID"
fi

## === 4. Kiểm tra và tạo config file ===
print_step "Checking config file: $CONFIG_FILE"
if [[ ! -f "$CONFIG_FILE" ]]; then
    print_warning "Config file not found. Creating..."
    sudo mkdir -p /etc/cloudflared
    
    # Tìm credentials file
    CREDENTIALS_FILE="$CREDENTIALS_DIR/${TUNNEL_ID}.json"
    if [[ ! -f "$CREDENTIALS_FILE" ]]; then
        # Tìm file JSON mới nhất
        CREDENTIALS_FILE=$(find "$CREDENTIALS_DIR" -name "*.json" -type f | sort -r | head -n1)
        if [[ -z "$CREDENTIALS_FILE" ]]; then
            print_error "Could not find credentials file. Please login again."
            exit 1
        fi
        TUNNEL_ID=$(basename "$CREDENTIALS_FILE" .json)
        print_step "Using credentials file: $CREDENTIALS_FILE (Tunnel ID: $TUNNEL_ID)"
    fi
    
    cat <<EOF | sudo tee "$CONFIG_FILE" >/dev/null
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}

ingress:
  - hostname: ${AUTH_HOST}
    service: tcp://${LOCAL_PG_HOST}:${LOCAL_PG_PORT}
  - service: http_status:404
EOF
    print_step "Config file created."
else
    print_step "Config file already exists."
    # Kiểm tra nội dung
    if ! grep -q "tunnel:" "$CONFIG_FILE"; then
        print_warning "Config file seems invalid. Recreating..."
        rm -f "$CONFIG_FILE"
        # Recursive call phần tạo config (hoặc paste lại code)
        # Tạm thời bỏ qua, yêu cầu user check manually
    fi
fi

## === 5. Kiểm tra DNS record ===
print_step "Checking DNS record for $AUTH_HOST..."
if cloudflared tunnel route dns show "$TUNNEL_NAME" 2>/dev/null | grep -q "$AUTH_HOST"; then
    print_step "DNS record already exists."
else
    print_warning "DNS record not found. Creating..."
    if cloudflared tunnel route dns "$TUNNEL_NAME" "$AUTH_HOST" 2>&1; then
        print_step "DNS record created successfully."
    else
        print_error "Failed to create DNS record. Please check manually."
    fi
fi

## === 6. Kiểm tra PostgreSQL đang chạy ===
print_step "Checking PostgreSQL on $LOCAL_PG_HOST:$LOCAL_PG_PORT..."
if command -v pg_isready >/dev/null 2>&1; then
    if pg_isready -h "$LOCAL_PG_HOST" -p "$LOCAL_PG_PORT" >/dev/null 2>&1; then
        print_step "PostgreSQL is running."
    else
        print_warning "PostgreSQL is not responding. Please check if it's running."
        print_warning "You may need to: sudo systemctl start postgresql"
    fi
else
    print_warning "pg_isready not found. Skipping PostgreSQL check."
fi

## === 7. Kiểm tra và cài cloudflared service ===
print_step "Checking cloudflared service..."
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    print_step "cloudflared service is running."
elif systemctl list-unit-files | grep -q cloudflared; then
    print_warning "cloudflared service exists but not running. Starting..."
    sudo systemctl start cloudflared
    sleep 2
    if systemctl is-active --quiet cloudflared; then
        print_step "cloudflared service started successfully."
    else
        print_error "Failed to start cloudflared service."
        sudo systemctl status cloudflared --no-pager -l
        exit 1
    fi
else
    print_warning "cloudflared service not installed. Installing..."
    sudo cloudflared service install 2>&1 || {
        print_warning "Service install failed. Trying alternative method..."
        sudo mkdir -p /etc/systemd/system/cloudflared.service.d
        cat <<EOF | sudo tee /etc/systemd/system/cloudflared@.service >/dev/null
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=$CLOUDFLARE_BIN tunnel --config $CONFIG_FILE run $TUNNEL_NAME
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF
    }
    
    sudo systemctl daemon-reload
    sudo systemctl enable cloudflared
    sudo systemctl start cloudflared
    
    sleep 3
    if systemctl is-active --quiet cloudflared; then
        print_step "cloudflared service installed and started successfully."
    else
        print_error "Failed to start cloudflared service."
        sudo systemctl status cloudflared --no-pager -l
        exit 1
    fi
fi

## === 8. Kiểm tra service status ===
print_step "Final status check..."
sudo systemctl status cloudflared --no-pager -l | head -n 20

## === 9. Test DNS resolution ===
print_step "Testing DNS resolution for $AUTH_HOST..."
if nslookup "$AUTH_HOST" >/dev/null 2>&1 || dig "$AUTH_HOST" +short >/dev/null 2>&1; then
    print_step "DNS resolution OK."
else
    print_warning "DNS not resolving yet. This may take a few minutes to propagate."
fi

## === Summary ===
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Tunnel ID: $TUNNEL_ID"
echo "Hostname: $AUTH_HOST"
echo "PostgreSQL: $LOCAL_PG_HOST:$LOCAL_PG_PORT"
echo ""
echo "To connect from Windows, run:"
echo "  cloudflared access tcp --hostname $AUTH_HOST --url localhost:6543"
echo ""
echo "Then in another terminal:"
echo "  psql -h localhost -p 6543 -U qtusdev qtusdevmarket"
echo ""
echo "To check logs:"
echo "  sudo journalctl -u cloudflared -f"
echo ""
















