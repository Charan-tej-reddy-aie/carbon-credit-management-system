import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function AppLayout({ children }) {
    return (
        <div className="app-layout">
            <Navbar />

            <Sidebar />

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

export default AppLayout;