import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layers, FileCode, HelpCircle, Activity } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { DocumentDetail } from './pages/DocumentDetail';
import { ShapeDetail } from './pages/ShapeDetail';
import { Navbar } from './components/Navbar';

const App: React.FC = () => {
  const location = useLocation();

  // Helper to determine active sidebar item styling
  const isLinkActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Dynamically set Navbar title based on path
  const getPageTitle = () => {
    if (location.pathname === '/') return 'CAD & Symbol Extraction Workspace';
    if (location.pathname.startsWith('/documents/')) return 'Document Details Sandbox';
    if (location.pathname.startsWith('/shapes/')) return 'Symbol Analysis & Properties';
    return 'PDF2EditableSymbols';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Premium Dark Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand/Header Logo */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none text-white font-outfit">
                ShapeForge AI
              </h1>
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                v1.2.0-Alpha
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1">
            <Link
              to="/"
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isLinkActive('/')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Workspace</span>
            </Link>

            <div className="pt-4 pb-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Technical References
            </div>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all"
            >
              <FileCode className="w-4 h-4" />
              <span>Swagger API Docs</span>
            </a>
          </nav>
        </div>

        {/* Sidebar Footer Info Card */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              About Platform
            </div>
            Extract shapes from drawings, trace contours into SVGs, and edit engineering parameters.
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar title={getPageTitle()} />

        {/* Scrollable Main View Container */}
        <main className="flex-1 overflow-y-auto px-8 py-6 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
            <Route path="/shapes/:id" element={<ShapeDetail />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
