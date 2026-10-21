const { pool } = require("../config/database");

async function getPriceRecommendation(req, res) {
    try {
        const projectId = Number(req.params.projectId);
        if (!Number.isInteger(projectId)) {
            return res.status(400).json({ success: false, message: "Valid project ID is required" });
        }
        const [[market]] = await pool.query(`
            SELECT average_price, demand, supply, trading_volume, recorded_at
            FROM market_data ORDER BY recorded_at DESC LIMIT 1
        `);
        if (!market) return res.status(404).json({ success: false, message: "No market data available" });

        const [[project]] = await pool.query(`
            SELECT cp.project_id, cp.project_name, cp.estimated_co2_reduction,
                   COALESCE(cc.quantity, 0) AS credit_quantity
            FROM carbon_projects cp
            LEFT JOIN project_verifications pv
              ON pv.project_id = cp.project_id AND pv.verification_stage='START_APPROVAL' AND pv.status='APPROVED'
            LEFT JOIN carbon_credits cc ON cc.verification_id = pv.verification_id
            WHERE cp.project_id = ?
            ORDER BY pv.verification_id DESC LIMIT 1
        `, [projectId]);
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        const base = Number(market.average_price);
        const demand = Number(market.demand);
        const supply = Number(market.supply);
        const pressure = (demand - supply) / Math.max(1, demand + supply);
        const quantity = Number(project.credit_quantity);
        const scarcityAdjustment = quantity > 0 && quantity < supply ? Math.min(0.08, (supply - quantity) / Math.max(1, supply) * 0.08) : 0;
        const recommended = Math.max(0.01, base * (1 + pressure * 0.18 + scarcityAdjustment));

        res.json({ success: true, data: {
            project_id: project.project_id,
            project_name: project.project_name,
            market_price: base,
            demand,
            supply,
            trading_volume: Number(market.trading_volume),
            demand_supply_pressure: Number(pressure.toFixed(4)),
            recommended_price: Number(recommended.toFixed(2)),
            rationale: pressure > 0.05 ? "Demand is stronger than supply, so the recommendation is above the current market average." : pressure < -0.05 ? "Supply is stronger than demand, so the recommendation is below the current market average." : "Demand and supply are relatively balanced, so the recommendation stays close to the market average."
        }});
    } catch (error) {
        console.error("Price recommendation error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to calculate price recommendation" });
    }
}

module.exports = { getPriceRecommendation };
