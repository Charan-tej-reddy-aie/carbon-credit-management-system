const { pool } = require("../config/database");

function linearRegression(points) {
    const n = points.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
    if (n === 1) return { slope: 0, intercept: Number(points[0].y), r2: 1 };
    const xBar = points.reduce((s, p) => s + p.x, 0) / n;
    const yBar = points.reduce((s, p) => s + p.y, 0) / n;
    let numerator = 0, denominator = 0;
    for (const p of points) {
        numerator += (p.x - xBar) * (p.y - yBar);
        denominator += (p.x - xBar) ** 2;
    }
    const slope = denominator ? numerator / denominator : 0;
    const intercept = yBar - slope * xBar;
    let ssTot = 0, ssRes = 0;
    for (const p of points) {
        const predicted = intercept + slope * p.x;
        ssTot += (p.y - yBar) ** 2;
        ssRes += (p.y - predicted) ** 2;
    }
    const r2 = ssTot ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;
    return { slope, intercept, r2 };
}

async function generatePrediction(req, res) {
    try {
        const horizonDays = Math.max(1, Math.min(365, Number(req.body.horizon_days || 30)));
        const [rows] = await pool.execute(`
            SELECT recorded_at, average_price, demand, supply, trading_volume
            FROM market_data
            ORDER BY recorded_at ASC
            LIMIT 120
        `);
        if (!rows.length) {
            return res.status(400).json({ success: false, message: "No market data is available for prediction" });
        }

        const points = rows.map((r, i) => ({ x: i, y: Number(r.average_price) }));
        const model = linearRegression(points);
        const current = Number(rows[rows.length - 1].average_price);
        const daysPerRecord = rows.length > 1
            ? Math.max(1, Math.round((new Date(rows[rows.length - 1].recorded_at) - new Date(rows[rows.length - 2].recorded_at)) / 86400000))
            : 30;
        const steps = horizonDays / daysPerRecord;
        const trendPrice = model.intercept + model.slope * ((rows.length - 1) + steps);
        const latest = rows[rows.length - 1];
        const demand = Number(latest.demand);
        const supply = Number(latest.supply);
        const pressure = (demand - supply) / Math.max(1, demand + supply);
        const predicted = Math.max(0, trendPrice * (1 + pressure * 0.12));
        const confidence = Math.max(45, Math.min(96, 55 + model.r2 * 35 + Math.min(rows.length, 20) * 0.3));

        const target = new Date();
        target.setDate(target.getDate() + horizonDays);
        const targetDate = target.toISOString().slice(0, 10);
        const [insert] = await pool.execute(`
            INSERT INTO price_predictions
                (target_date, current_price, predicted_price, model_name, model_version, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [targetDate, current, Number(predicted.toFixed(2)), "Market Trend Regression", "1.0", Number(confidence.toFixed(2))]);

        res.status(201).json({
            success: true,
            message: "Price prediction generated successfully",
            data: {
                prediction_id: insert.insertId,
                target_date: targetDate,
                current_price: current,
                predicted_price: Number(predicted.toFixed(2)),
                model_name: "Market Trend Regression",
                model_version: "1.0",
                confidence_score: Number(confidence.toFixed(2)),
                training_points: rows.length,
                r2_score: Number(model.r2.toFixed(4))
            }
        });
    } catch (error) {
        console.error("Generate prediction error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to generate prediction" });
    }
}

async function getMarketSummary(req, res) {
    try {
        const [[latest]] = await pool.query(`
            SELECT recorded_at, average_price, demand, supply, trading_volume,
                   (demand - supply) AS demand_supply_difference
            FROM market_data ORDER BY recorded_at DESC LIMIT 1
        `);
        const [[aggregate]] = await pool.query(`
            SELECT
                COALESCE(AVG(average_price), 0) AS average_price,
                COALESCE(SUM(trading_volume), 0) AS total_trading_volume,
                COALESCE(SUM(demand), 0) AS total_demand,
                COALESCE(SUM(supply), 0) AS total_supply,
                COUNT(*) AS data_points
            FROM market_data
        `);
        const [[prediction]] = await pool.query(`
            SELECT target_date, current_price, predicted_price, model_name, confidence_score
            FROM price_predictions ORDER BY prediction_id DESC LIMIT 1
        `);
        res.json({ success: true, data: { latest: latest || null, aggregate: aggregate || {}, latest_prediction: prediction || null } });
    } catch (error) {
        console.error("Market summary error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load market summary" });
    }
}

module.exports = { generatePrediction, getMarketSummary };
