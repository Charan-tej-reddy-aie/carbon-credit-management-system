# CarbonX — Azure VM 1-Click Deployment Guide

This guide describes the **Azure Virtual Machine + Docker Compose** deployment workflow, exactly like your **Cloud Computing course project**.

---

## 1. Architecture Overview

Everything runs inside an **Ubuntu 22.04 LTS Azure Virtual Machine** via **Docker Compose**:

```
                              [ Users / Web Browser ]
                                         │
                                         ▼ Port 80 (HTTP)
               ┌─────────────────────────────────────────────────────────┐
               │         Azure Virtual Machine (Standard_B2s)            │
               │                    Public IP                            │
               │                                                         │
               │   ┌─────────────────────────────────────────────────┐   │
               │   │      Frontend Container (React 19 + Nginx)      │   │
               │   │                    Port 80                      │   │
               │   └──────────────────────┬──────────────────────────┘   │
               │                          │ Reverse Proxy /api/*         │
               │                          ▼                              │
               │   ┌─────────────────────────────────────────────────┐   │
               │   │      Backend Container (Node.js 20 Express)     │   │
               │   │                    Port 5000                    │   │
               │   └──────────────────────┬──────────────────────────┘   │
               │                          │ TLS / Port 3306              │
               │                          ▼                              │
               │   ┌─────────────────────────────────────────────────┐   │
               │   │       Database Container (MySQL 8.0)            │   │
               │   │         Database: carbon_v2 (Port 3306)         │   │
               │   └─────────────────────────────────────────────────┘   │
               └─────────────────────────────────────────────────────────┘
```

### Why this method is best:
- **Single Public IP**: Open `http://<YOUR_VM_PUBLIC_IP>` in your browser and everything works immediately.
- **Zero CORS Issues**: Frontend & Backend share the same origin through Nginx reverse proxy.
- **Zero Database Costs**: MySQL runs locally in Docker on the VM, using your student credits only for the VM.
- **Identical to Local Environment**: Guaranteed 100% parity with your development machine.

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Open Azure Cloud Shell
1. Log in to [https://portal.azure.com](https://portal.azure.com) with your student or personal account.
2. Click the **Cloud Shell** icon (`>_`) in the top menu bar, or navigate to [https://shell.azure.com](https://shell.azure.com).
3. Select **Bash**.

---

### Step 2: Provision the Azure Virtual Machine
Copy and paste this single script into Azure Cloud Shell:

```bash
# 1. Create Resource Group
az group create --name rg-carbonx-prod --location centralindia --output table

# 2. Provision Ubuntu 22.04 VM (Standard_B2s: 2 vCPUs, 4GB RAM)
az vm create \
  --resource-group rg-carbonx-prod \
  --name vm-carbonx-prod \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --output table

# 3. Open Firewall Ports 80 (Web), 443 (HTTPS), and 5000 (API)
az vm open-port --resource-group rg-carbonx-prod --name vm-carbonx-prod --port 80 --priority 1001 --output table
az vm open-port --resource-group rg-carbonx-prod --name vm-carbonx-prod --port 443 --priority 1002 --output table
az vm open-port --resource-group rg-carbonx-prod --name vm-carbonx-prod --port 5000 --priority 1003 --output table

# 4. Show your Public IP
az vm show -d -g rg-carbonx-prod -n vm-carbonx-prod --query publicIps -o tsv
```

Azure will output your VM's **Public IP Address** (e.g., `20.219.145.88`).

---

### Step 3: Connect to your VM and Run Automated Deployment

In Cloud Shell, SSH into your new VM:
```bash
# Replace with your actual Public IP
ssh azureuser@<YOUR_VM_PUBLIC_IP>
```

Inside the VM, clone your repository and launch the automated setup script:
```bash
# 1. Clone repository
git clone https://github.com/Charan-tej-reddy-aie/carbon-credit-management-system.git
cd carbon-credit-management-system

# 2. Run 1-Click Automated Deployment
bash deploy_azure_vm.sh
```

The script will automatically:
- Install Docker Engine & Docker Compose plugin
- Configure UFW firewall
- Build and spin up the MySQL 8.0, Node.js Backend, and React Nginx containers
- Execute all SQL schemas, procedures, triggers, views, and seed data into MySQL
- Output your live website URL!

---

### Step 4: Verify Deployment

Open your browser and navigate to:
```
http://<YOUR_VM_PUBLIC_IP>
```

#### Demo Login Credentials:
- **Admin**: `admin@carbon.com` / `Admin@123`
- **Buyer / Company**: `priya@ecoforest.com` / `Company@123`
- **Seller**: `vikram@cleansky.org` / `Seller@123`
- **Verifier**: `amit@carbontrust.org` / `Verifier@123`

#### Health Check:
```
http://<YOUR_VM_PUBLIC_IP>/api/health
```
Returns: `{"success": true, "message": "Backend API is healthy"}`

---

## 3. How to Update Code After Changes

Whenever you push new code to GitHub, simply SSH into the VM and run:
```bash
cd carbon-credit-management-system
bash update_azure_vm.sh
```
This updates Frontend and Backend in ~10 seconds without resetting your MySQL database.
