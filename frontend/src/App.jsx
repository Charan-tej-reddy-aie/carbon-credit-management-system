import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/CreateProject";
import Verifications from "./pages/Verifications";
import VerifyProject from "./pages/VerifyProject";
import BuyerDashboard from "./pages/BuyerDashboard";
import Marketplace from "./pages/Marketplace";
import Transactions from "./pages/Transactions";
import AppLayout from "./components/AppLayout";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/login" element={<Login />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Dashboard />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/projects/create"
                    element={
                        <ProtectedRoute allowedRoles={["SELLER"]}>
                            <AppLayout>
                                <CreateProject />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/verifications"
                    element={
                        <ProtectedRoute allowedRoles={["VERIFIER", "ADMIN"]}>
                            <AppLayout>
                                <Verifications />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/verifications/:projectId"
                    element={
                        <ProtectedRoute allowedRoles={["VERIFIER", "ADMIN"]}>
                            <AppLayout>
                                <VerifyProject />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/buyer-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["BUYER"]}>
                            <AppLayout>
                                <BuyerDashboard />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/marketplace"
                    element={
                        <ProtectedRoute allowedRoles={["BUYER"]}>
                            <AppLayout>
                                <Marketplace />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/transactions"
                    element={
                    <ProtectedRoute allowedRoles={["BUYER", "SELLER"]}>
                        <AppLayout>
                            <Transactions />
                        </AppLayout>
                    </ProtectedRoute>
                    }
                />

                <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                />

                <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;