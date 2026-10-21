const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testDatabaseConnection } = require("./config/database");
const projectRoutes = require("./routes/projectRoutes");
const authRoutes = require("./routes/authRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const creditRoutes = require("./routes/creditRoutes");
const pricingRoutes = require("./routes/pricingRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const blockchainRoutes = require("./routes/blockchainRoutes");
const reportRoutes = require("./routes/reportRoutes");
const walletRoutes = require("./routes/walletRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Intelligent Carbon Credit Management System API is running"
    });
});

app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "Backend API is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/pricing-recommendation", recommendationRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/wallet", walletRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
    await testDatabaseConnection();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
