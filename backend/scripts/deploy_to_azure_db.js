const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function deployAzureDatabase() {
    console.log("=================================================");
    console.log("   CARBONX - AZURE DATABASE MIGRATION SCRIPT     ");
    console.log("=================================================");

    const host = process.env.AZURE_DB_HOST || process.env.DB_HOST;
    const port = Number(process.env.AZURE_DB_PORT || process.env.DB_PORT) || 3306;
    const user = process.env.AZURE_DB_USER || process.env.DB_USER;
    const password = process.env.AZURE_DB_PASSWORD || process.env.DB_PASSWORD;
    const database = process.env.AZURE_DB_NAME || process.env.DB_NAME || "carbon_v2";
    const ssl = process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: false };

    console.log(`Connecting to MySQL Server: ${host}:${port} as ${user}...`);
    console.log(`Target Database: ${database}`);
    console.log(`SSL: ${ssl ? "ENABLED (TLS)" : "DISABLED"}`);

    if (!host || !user || !password) {
        console.error("ERROR: Missing database connection details. Set DB_HOST, DB_USER, DB_PASSWORD in .env or AZURE_DB_* environment variables.");
        process.exit(1);
    }

    const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        ssl,
        multipleStatements: true
    });

    try {
        console.log(`\nStep 1: Ensuring database '${database}' exists...`);
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await conn.query(`USE \`${database}\`;`);
        console.log(`✓ Using database '${database}'`);

        const dbDir = path.resolve(__dirname, "../../database");

        console.log("\nStep 2: Applying 01_normalized_schema.sql...");
        let schemaSql = fs.readFileSync(path.join(dbDir, "01_normalized_schema.sql"), "utf8");
        // Remove DROP/CREATE DATABASE to avoid disconnecting session
        schemaSql = schemaSql
            .replace(/DROP DATABASE IF EXISTS carbon_v2;/gi, "")
            .replace(/CREATE DATABASE carbon_v2;/gi, "")
            .replace(/USE carbon_v2;/gi, `USE \`${database}\`;`);
        await conn.query(schemaSql);
        console.log("✓ 01_normalized_schema.sql applied successfully");

        console.log("\nStep 3: Applying 02_normalized_procedures_triggers.sql...");
        const procSql = fs.readFileSync(path.join(dbDir, "02_normalized_procedures_triggers.sql"), "utf8")
            .replace(/USE carbon_v2;/gi, `USE \`${database}\`;`);
        
        // Remove DELIMITER keywords and split by $$
        const cleanProcSql = procSql.replace(/^DELIMITER\s+\$\$/gmi, "").replace(/^DELIMITER\s+;/gmi, "");
        const procBlocks = cleanProcSql.split("$$")
            .map(b => b.trim())
            .filter(b => b.length > 10);

        for (const block of procBlocks) {
            try {
                await conn.query(block);
            } catch (pErr) {
                if (!pErr.message.includes("already exists")) {
                    console.warn(`Procedure/Trigger notice: ${pErr.message.split("\n")[0]}`);
                }
            }
        }
        console.log("✓ 02_normalized_procedures_triggers.sql applied successfully");

        console.log("\nStep 4: Applying 03_normalized_views.sql...");
        const viewsSql = fs.readFileSync(path.join(dbDir, "03_normalized_views.sql"), "utf8")
            .replace(/--.*$/gm, "")
            .replace(/USE carbon_v2;/gi, `USE \`${database}\`;`);
        
        const viewStatements = viewsSql
            .split(";")
            .map(s => s.trim())
            .filter(s => s.length > 5 && !s.toUpperCase().startsWith("USE"));

        for (const stmt of viewStatements) {
            await conn.query(stmt);
        }
        console.log("✓ 03_normalized_views.sql applied successfully");

        console.log("\nStep 5: Applying 04_sample_seed_data.sql...");
        let seedSql = fs.readFileSync(path.join(dbDir, "04_sample_seed_data.sql"), "utf8")
            .replace(/USE carbon_v2;/gi, `USE \`${database}\`;`);
        await conn.query(seedSql);
        console.log("✓ 04_sample_seed_data.sql applied successfully");

        console.log("\nStep 6: Verifying table counts in Azure database...");
        const [tables] = await conn.query("SHOW TABLES;");
        console.log(`✓ Total tables & views present: ${tables.length}`);

        const [users] = await conn.query("SELECT COUNT(*) AS total_users FROM users;");
        const [projects] = await conn.query("SELECT COUNT(*) AS total_projects FROM carbon_projects;");
        console.log(`✓ Verification: ${users[0].total_users} users, ${projects[0].total_projects} projects ready.`);

        console.log("\n=================================================");
        console.log("   AZURE DATABASE DEPLOYMENT COMPLETED!          ");
        console.log("=================================================");
    } catch (err) {
        console.error("\nMigration failed with error:", err);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

if (require.main === module) {
    deployAzureDatabase();
}

module.exports = { deployAzureDatabase };
