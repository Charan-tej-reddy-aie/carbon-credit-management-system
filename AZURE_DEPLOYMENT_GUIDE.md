# CarbonX — Azure Production Deployment Guide
**Target Architecture**: Azure App Service + Azure Static Web Apps + Azure Database for MySQL Flexible Server  
**Estimated Setup Time**: ~15–20 minutes  
**Target Resource Group**: `rg-carbonx-prod`

---

## Architecture Overview

```
                                      [ Users / Web Browser ]
                                                 │
                                                 ▼
                       ┌──────────────────────────────────────────────────┐
                       │            Azure Static Web Apps                 │
                       │           (Frontend - React 19 + Vite)           │
                       │     https://<your-app>.azurestaticapps.net       │
                       └─────────────────────────┬────────────────────────┘
                                                 │ HTTPS / JSON API (JWT)
                                                 ▼
                       ┌──────────────────────────────────────────────────┐
                       │           Azure App Service (Linux)              │
                       │            (Backend - Node.js 20/22)             │
                       │      https://<your-api>.azurewebsites.net        │
                       └─────────────────────────┬────────────────────────┘
                                                 │ TLS / Port 3306
                                                 ▼
                       ┌──────────────────────────────────────────────────┐
                       │    Azure Database for MySQL Flexible Server      │
                       │               Database: carbon_v2                │
                       │   <server>.mysql.database.azure.com:3306 (SSL)   │
                       └──────────────────────────────────────────────────┘
```

---

## Phase 1: Provision Azure Database for MySQL Flexible Server

### Step 1.1: Create MySQL Server in Azure Portal
1. Open the [Azure Portal](https://portal.azure.com/).
2. In the top search bar, type **Azure Database for MySQL flexible servers** and click on it.
3. Click **+ Create**.
4. In the **Basics** tab:
   - **Subscription**: Select your active Azure subscription (e.g., Azure for Students or Pay-As-You-Go).
   - **Resource Group**: Click **Create new** -> enter `rg-carbonx-prod`.
   - **Server name**: Enter a unique name, e.g., `carbonx-mysql-prod` (or append your initials if taken).
   - **Region**: Choose a region close to you (e.g., `Central India`, `East US`, or `West Europe`).
   - **MySQL version**: Select `8.0`.
   - **Workload type**: Select **Development or hobby projects** (Burstable `Standard_B1ms` tier — lowest cost / free-tier eligible).
   - **Storage**: `32 GiB` (Auto-grow: Disabled to minimize cost).
   - **High Availability**: Disabled.
   - **Authentication method**: Select **MySQL authentication only**.
   - **Admin username**: `carbonadmin` (or your preferred admin name).
   - **Admin password**: Choose a strong password (e.g., `CarbonX@Azure2026!`) and note it down.

### Step 1.2: Configure Networking & Firewall
1. Click **Next: Networking >**.
2. **Connectivity method**: Select **Public access (allowed IP addresses)**.
3. Check the box **"Allow public access from any Azure service within Azure to this server"** (This allows Azure App Service to reach MySQL).
4. Click **+ Add current client IP address** (This allows your local computer to connect and seed the database).
5. Click **Review + create** -> click **Create** (Deployment takes ~3–5 minutes).

### Step 1.3: Enable Stored Procedures in Server Parameters
*Important for MySQL 8.0 Stored Procedures & Functions:*
1. Once the resource is created, go to the MySQL server resource page.
2. In the left navigation menu under **Settings**, click **Server parameters**.
3. Search for `log_bin_trust_function_creators`.
4. Change its value from `OFF` to **`ON`**.
5. Click **Save** at the top.

### Step 1.4: One-Command Automated Database Seeding
You can now seed all 21 tables, 11 stored procedures, 5 triggers, 16 views, and demo records directly to Azure from your computer:

Open your terminal in `project/backend`:
```powershell
# Set your Azure MySQL credentials in PowerShell:
$env:AZURE_DB_HOST="carbonx-mysql-prod.mysql.database.azure.com"   # Replace with your Azure server name
$env:AZURE_DB_USER="carbonadmin"
$env:AZURE_DB_PASSWORD="CarbonX@Azure2026!"                       # Your Azure MySQL password
$env:AZURE_DB_NAME="carbon_v2"
$env:DB_SSL="true"

# Run automated deployment & verification script:
npm run deploy:db
```

The script will:
- Connect to Azure via TLS/SSL
- Create `carbon_v2` database
- Apply [01_normalized_schema.sql](file:///c:/Users/yamma/Desktop/Sem-5/DBMS/DBMS%20Project/DBMS%20Project/project/database/01_normalized_schema.sql)
- Apply [02_normalized_procedures_triggers.sql](file:///c:/Users/yamma/Desktop/Sem-5/DBMS/DBMS%20Project/DBMS%20Project/project/database/02_normalized_procedures_triggers.sql)
- Apply [03_normalized_views.sql](file:///c:/Users/yamma/Desktop/Sem-5/DBMS/DBMS%20Project/DBMS%20Project/project/database/03_normalized_views.sql)
- Apply [04_sample_seed_data.sql](file:///c:/Users/yamma/Desktop/Sem-5/DBMS/DBMS%20Project/DBMS%20Project/project/database/04_sample_seed_data.sql)
- Verify that all tables, users, and projects are present.

---

## Phase 2: Deploy Backend API on Azure App Service

### Step 2.1: Create Web App in Azure Portal
1. In the Azure Portal search bar, type **App Services** and click on it.
2. Click **+ Create** -> **Web App**.
3. In the **Basics** tab:
   - **Subscription**: Your active subscription.
   - **Resource Group**: Select `rg-carbonx-prod`.
   - **Name**: Enter a unique name, e.g., `carbonx-api-prod` (Your API URL will be `https://carbonx-api-prod.azurewebsites.net`).
   - **Publish**: `Code`.
   - **Runtime stack**: `Node 20 LTS`.
   - **Operating System**: `Linux`.
   - **Region**: Same region as your MySQL database.
   - **Linux Plan**: Click **Create new** -> `plan-carbonx-api`.
   - **Pricing Plan**: `Basic B1` (or `Free F1` if available).
4. Click **Review + create** -> **Create**.

### Step 2.2: Configure Environment Variables (Application Settings)
1. Once deployed, open your App Service resource (`carbonx-api-prod`).
2. In the left navigation menu under **Settings**, click **Environment variables** (or **Configuration**).
3. Under the **App settings** tab, add the following key-value pairs by clicking **+ Add**:

| Name | Value | Description |
|---|---|---|
| `DB_HOST` | `carbonx-mysql-prod.mysql.database.azure.com` | Your Azure MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `carbonadmin` | Azure MySQL username |
| `DB_PASSWORD` | `CarbonX@Azure2026!` | Azure MySQL password |
| `DB_NAME` | `carbon_v2` | Target database |
| `DB_SSL` | `true` | Enables secure SSL transport |
| `JWT_SECRET` | `carbonx_super_secret_jwt_key_2026_prod` | 32+ character random secret |
| `NODE_ENV` | `production` | Production mode |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` | Tells Azure Oryx to run `npm install` |

4. Click **Apply** (or **Save**) and confirm the restart.

### Step 2.3: Deploy Backend Code to App Service
You can deploy your code using either **GitHub Actions** or **VS Code Azure App Service Extension** / **ZIP Deploy**:

#### Option A: Deploy via GitHub (Recommended)
1. In the App Service left menu under **Deployment**, click **Deployment Center**.
2. **Source**: Select **GitHub**.
3. Sign in to GitHub and authorize Azure.
4. Select:
   - **Organization**: `Charan-tej-reddy-aie`
   - **Repository**: `carbon-credit-management-system`
   - **Branch**: `main`
5. Azure will generate a GitHub Actions workflow that automatically builds and deploys your backend.

#### Option B: Deploy via VS Code (Instant)
1. In VS Code, install the official **Azure App Service** extension.
2. Sign in to your Azure account.
3. Right-click the `project/backend` folder -> select **Deploy to Web App...**.
4. Choose `carbonx-api-prod`.

### Step 2.4: Verify Backend Health
Once deployed, open your browser and navigate to:
```
https://carbonx-api-prod.azurewebsites.net/api/health
```
You should see:
```json
{"success": true, "message": "Backend API is healthy"}
```

---

## Phase 3: Deploy Frontend on Azure Static Web Apps

### Step 3.1: Create Static Web App in Azure Portal
1. In the Azure Portal search bar, type **Static Web Apps** and click on it.
2. Click **+ Create**.
3. In the **Basics** tab:
   - **Subscription**: Your active subscription.
   - **Resource Group**: Select `rg-carbonx-prod`.
   - **Name**: `carbonx-web-prod`.
   - **Plan type**: `Free` (Provides global CDN, SSL certificates, and custom domains).
   - **Region**: Choose nearest region.
   - **Source**: Select **GitHub**.
4. Click **Sign in with GitHub**:
   - **Organization**: `Charan-tej-reddy-aie`
   - **Repository**: `carbon-credit-management-system`
   - **Branch**: `main`
5. In **Build Details**:
   - **Build Presets**: Select `Custom`.
   - **App location**: `/frontend`
   - **Api location**: *(Leave blank)*
   - **Output location**: `dist`
6. Click **Review + create** -> **Create**.

### Step 3.2: Configure Frontend Environment Variable
1. Open the created Static Web App resource (`carbonx-web-prod`).
2. In the left menu under **Settings**, click **Environment variables**.
3. Click **+ Add**:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://carbonx-api-prod.azurewebsites.net/api` *(Your App Service backend URL with `/api`)*
4. Click **Save**.

### Step 3.3: Verify Deployment
1. Go to **Overview** on your Static Web App resource.
2. Click the **URL** link (e.g., `https://proud-water-012345.azurestaticapps.net`).
3. Your CarbonX portal will load with full SSL security!

---

## Phase 4: Production Verification & Demonstration

Test the end-to-end production workflow:

1. **Login**:
   - URL: `https://<your-static-web-app>.azurestaticapps.net/login`
   - Email: `admin@carbon.com`
   - Password: `Admin@123`
2. **Reports & Exports**:
   - Navigate to `/admin/reports`.
   - Verify summary KPI cards render real totals.
   - Click each of the 5 **CSV Export** buttons to confirm live data streaming.
3. **Marketplace & Trading**:
   - Log in as buyer `priya@ecoforest.com` / `Company@123`.
   - Purchase 50 credits from GreenPower's listing.
   - Confirm balance update and transaction hash generation.
4. **Blockchain Explorer**:
   - Open `/blockchain`.
   - Verify the **"On-Chain Ledger Simulation"** badge and audit log.

---

## Troubleshooting & Maintenance

| Symptom | Cause | Solution |
|---|---|---|
| `ETIMEDOUT` / Can't connect to MySQL | Firewall blocking connection | In MySQL server -> **Networking**, ensure **"Allow public access from any Azure service"** is checked. If deploying locally, add your current IP address. |
| Stored procedure error `45000` on Azure MySQL | Binary logging restriction | In MySQL server -> **Server parameters**, ensure `log_bin_trust_function_creators = ON`. |
| Page refresh gives 404 on Static Web App | SPA routing missing | [staticwebapp.config.json](file:///c:/Users/yamma/Desktop/Sem-5/DBMS/DBMS%20Project/DBMS%20Project/project/frontend/staticwebapp.config.json) is already included in `public/` and `dist/` to redirect all navigation to `/index.html`. |
| CORS error in browser console | Origin mismatch | `backend/src/server.js` uses `app.use(cors())` which permits cross-origin requests. Verify backend is running on `https://`. |
