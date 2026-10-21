#!/bin/bash
# ==============================================================================
# 1-Click Azure VM Automated Setup Script for CarbonX Management System
# Target OS: Ubuntu 22.04 / 24.04 LTS
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Starting Automated Deployment on Azure VM"
echo "=========================================================="

# 1. Update system packages
echo "[1/6] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw net-tools

# 2. Install Docker & Docker Compose
echo "[2/6] Installing Docker Engine & Docker Compose plugin..."
if ! command -v docker &> /dev/null; then
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    echo "Docker installed successfully!"
else
    echo "Docker already installed."
fi

# 3. Configure Firewall
echo "[3/6] Configuring Azure VM firewall rules..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw --force enable

# 4. Check if docker-compose.yml exists in current directory
echo "[4/6] Checking project files..."
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found in current directory!"
    echo "Please run this script from inside the carbon-credit-management-system repository root."
    exit 1
fi

# 5. Build and launch all 3 containers
echo "[5/6] Building and starting microservices via Docker Compose..."
sudo docker compose down --remove-orphans || true
sudo docker compose up -d --build

# 6. Seed Complete Database (Schema, Stored Procedures, Views, Seed Data)
echo "[6/6] Waiting for MySQL to be ready and seeding complete database..."
until sudo docker exec carbonx_mysql mysqladmin ping -h localhost -uroot -pCarbonX@Root2026 --silent; do
    echo "Waiting for MySQL to accept connections..."
    sleep 3
done

echo "MySQL is ready! Importing normalized schema & stored routines..."
export MYSQL_PWD='CarbonX@Root2026'
sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h 127.0.0.1 -u root < database/01_normalized_schema.sql || \
sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h localhost -u root < database/01_normalized_schema.sql

sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h 127.0.0.1 -u root carbon_v2 < database/02_normalized_procedures_triggers.sql || \
sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h localhost -u root carbon_v2 < database/02_normalized_procedures_triggers.sql

sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h 127.0.0.1 -u root carbon_v2 < database/03_normalized_views.sql || \
sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h localhost -u root carbon_v2 < database/03_normalized_views.sql

sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h 127.0.0.1 -u root carbon_v2 < database/04_sample_seed_data.sql || \
sudo docker exec -e MYSQL_PWD="$MYSQL_PWD" -i carbonx_mysql mysql -h localhost -u root carbon_v2 < database/04_sample_seed_data.sql

echo "Restarting backend to connect with fresh database schema..."
sudo docker restart carbonx_backend
sleep 3

PUBLIC_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE & CARBONX IS LIVE!"
echo "=========================================================="
echo "Frontend Portal:  http://$PUBLIC_IP"
echo "Backend Health:   http://$PUBLIC_IP/api/health"
echo "MySQL Port:       $PUBLIC_IP:3306"
echo ""
echo "Demo Login Accounts:"
echo "  • Admin:    admin@carbon.com    / Admin@123"
echo "  • Buyer:    priya@ecoforest.com / Company@123"
echo "  • Seller:   vikram@cleansky.org / Seller@123"
echo "  • Verifier: amit@carbontrust.org / Verifier@123"
echo "=========================================================="
