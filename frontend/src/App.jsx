import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import CreateProject from "./pages/CreateProject";
import EditProject from "./pages/EditProject";
import Verifications from "./pages/Verifications";
import VerifyProject from "./pages/VerifyProject";
import Marketplace from "./pages/Marketplace";
import Transactions from "./pages/Transactions";
import Register from "./pages/Register";
import CompanyDashboard from "./pages/CompanyDashboard";
import VerifierDashboard from "./pages/VerifierDashboard";
import SellCredits from "./pages/SellCredits";
import PriceRequest from "./pages/PriceRequest";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import AdminDashboard from "./pages/AdminDashboard";
import CompanyCredits from "./pages/CompanyCredits";
import RetireCredits from "./pages/RetireCredits";
import VerifierPricing from "./pages/VerifierPricing";
import MarketAnalytics from "./pages/MarketAnalytics";
import BlockchainExplorer from "./pages/BlockchainExplorer";
import AdminReports from "./pages/AdminReports";
import WalletSettings from "./pages/WalletSettings";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <CompanyDashboard />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <AppLayout>
                                <AdminDashboard />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/credits"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout><CompanyCredits /></AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/credits/retire"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout><RetireCredits /></AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/verifier/pricing"
                    element={
                        <ProtectedRoute allowedRoles={["VERIFIER"]}>
                            <AppLayout><VerifierPricing /></AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/blockchain"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY", "VERIFIER", "ADMIN"]}>
                            <AppLayout><BlockchainExplorer /></AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/reports"
                    element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <AppLayout><AdminReports /></AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/market-analytics"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY", "VERIFIER", "ADMIN"]}>
                            <AppLayout><MarketAnalytics /></AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/marketplace/sell"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <SellCredits />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/projects/create"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <CreateProject />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/marketplace/price-request"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <PriceRequest />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/projects/edit/:projectId"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <EditProject />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/projects"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <Projects />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/projects/:projectId"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <ProjectDetails />
                            </AppLayout>
                </ProtectedRoute>
                    }
                />

                <Route
                    path="/verifier-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["VERIFIER"]}>
                            <AppLayout>
                                <VerifierDashboard />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/verifications"
                    element={
                        <ProtectedRoute allowedRoles={["VERIFIER"]}>
                            <AppLayout>
                                <Verifications />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/verifications/:projectId"
                    element={
                        <ProtectedRoute allowedRoles={["VERIFIER"]}>
                            <AppLayout>
                                <VerifyProject />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/wallet"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <WalletSettings />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/marketplace"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <Marketplace />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/transactions"
                    element={
                        <ProtectedRoute allowedRoles={["COMPANY"]}>
                            <AppLayout>
                                <Transactions />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;