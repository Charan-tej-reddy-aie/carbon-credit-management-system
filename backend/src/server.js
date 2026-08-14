const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testDatabaseConnection } = require("./config/database");
const projectRoutes = require("./routes/projectRoutes");
const authRoutes = require("./routes/authRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/marketplace", marketplaceRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Intelligent Carbon Credit Management System API is running"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend API is healthy"
    });
});

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);


const PORT = process.env.PORT || 5000;

async function startServer() {
    await testDatabaseConnection();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}


startServer();