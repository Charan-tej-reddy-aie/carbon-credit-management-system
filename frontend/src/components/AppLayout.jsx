import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function AppLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="app-layout">
            <Navbar onMenuClick={() => setSidebarOpen((open) => !open)} />
            <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
            {sidebarOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    aria-label="Close navigation menu"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <main className="main-content">{children}</main>
        </div>
    );
}

export default AppLayout;
