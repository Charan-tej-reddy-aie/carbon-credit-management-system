const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/database");

async function generateSeedSql() {
    console.log("Exporting clean sample seed data for carbon_v2...");
    const targetFile = path.join(__dirname, "../../database/04_sample_seed_data.sql");

    const tables = [
        "roles",
        "project_types",
        "users",
        "companies",
        "carbon_projects",
        "project_documents",
        "project_verifications",
        "verification_notifications",
        "project_completion_reports",
        "carbon_credits",
        "company_credit_holdings",
        "blockchain_tokens",
        "token_transfers",
        "credit_usage_reports",
        "credit_price_approvals",
        "price_change_requests",
        "marketplace_listings",
        "transactions",
        "credit_retirements",
        "market_data",
        "price_predictions"
    ];

    let sql = `-- ============================================================
-- CARBONX - NORMALIZED SAMPLE SEED DATA (carbon_v2)
-- Clean, reproducible test data for demonstration & evaluation
-- ============================================================

USE carbon_v2;

SET FOREIGN_KEY_CHECKS = 0;

`;

    for (const table of tables) {
        sql += `DELETE FROM ${table};\n`;
        sql += `ALTER TABLE ${table} AUTO_INCREMENT = 1;\n`;
    }

    sql += `\nSET FOREIGN_KEY_CHECKS = 1;\n\n`;

    for (const table of tables) {
        const [rows] = await pool.query(`SELECT * FROM ${table}`);
        if (!rows.length) continue;

        const columns = Object.keys(rows[0]);
        sql += `-- ------------------------------------------------------------\n`;
        sql += `-- Table: ${table} (${rows.length} records)\n`;
        sql += `-- ------------------------------------------------------------\n`;
        sql += `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n`;

        const rowStrings = rows.map((row) => {
            const values = columns.map((col) => {
                const val = row[col];
                if (val === null || val === undefined) return "NULL";
                if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
                if (typeof val === "number" || typeof val === "bigint") return val;
                if (typeof val === "boolean") return val ? 1 : 0;
                const escaped = String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                return `'${escaped}'`;
            });
            return `(${values.join(", ")})`;
        });

        sql += rowStrings.join(",\n") + ";\n\n";
    }

    fs.writeFileSync(targetFile, sql, "utf8");
    console.log(`SUCCESS: Seed data generated at ${targetFile}`);
    process.exit(0);
}

generateSeedSql().catch(err => {
    console.error("Seed generation error:", err);
    process.exit(1);
});
