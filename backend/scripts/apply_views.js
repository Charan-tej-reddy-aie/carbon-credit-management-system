const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/database");

async function applyViews() {
    const filePath = path.join(__dirname, "../../database/03_normalized_views.sql");
    const rawSql = fs.readFileSync(filePath, "utf8");

    // Remove single line comments
    const cleanSql = rawSql.replace(/--.*$/gm, "");

    const statements = cleanSql
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 5 && !s.toUpperCase().startsWith("USE"));

    console.log(`Found ${statements.length} statements to execute.`);

    for (const stmt of statements) {
        try {
            await pool.query(stmt);
            const viewMatch = stmt.match(/CREATE\s+VIEW\s+([a-zA-Z0-9_]+)/i);
            if (viewMatch) {
                console.log(`[CREATED VIEW] ${viewMatch[1]}`);
            }
        } catch (err) {
            console.error(`Error on statement:\n${stmt.substring(0, 100)}...\n=> ${err.message}`);
        }
    }

    const [views] = await pool.query("SHOW FULL TABLES WHERE TABLE_TYPE LIKE 'VIEW'");
    console.log(`\nSUCCESS: ${views.length} views now active in carbon_v2:`);
    views.forEach(v => console.log(" - " + Object.values(v)[0]));
    process.exit(0);
}

applyViews().catch(err => {
    console.error(err);
    process.exit(1);
});
