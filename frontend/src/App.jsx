import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ZoomIn, ZoomOut, RotateCcw, Settings } from "lucide-react";
import DrawingModal from "./components/DrawingModal";
import DoodleItem from "./components/DoodleItem";
import EnlargedDoodle from "./components/EnlargedDoodle";
import HelpTooltip from "./components/HelpTooltip";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./components/AdminPanel";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '');
const API = `${BACKEND_URL}/api`;

function App() {
  const [doodles, setDoodles] = useState([]);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [selectedDoodle, setSelectedDoodle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin state
  const [admin, setAdmin] = useState(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        setAdmin(response.data);
      } catch (err) {
        // Not authenticated
        setAdmin(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch all doodles
  const fetchDoodles = useCallback(async (retryCount = 0) => {
    try {
      const response = await axios.get(`${API}/doodles`);
      setDoodles(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error(`Failed to fetch doodles (attempt ${retryCount + 1}):`, error);
      if (retryCount < 10) {
        // Retry every 3 seconds while Render backend wakes up
        setTimeout(() => fetchDoodles(retryCount + 1), 3000);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDoodles();
  }, [fetchDoodles]);

  // Handle new doodle submission
  const handleDoodleSubmit = async (imageData, colorUsed) => {
    try {
      const response = await axios.post(`${API}/doodles`, {
        image_data: imageData,
        color_used: colorUsed
      });
      setDoodles(prev => [...prev, response.data]);
      setIsDrawingOpen(false);
    } catch (error) {
      console.error("Failed to save doodle:", error);
      const message = error.response?.data?.detail || "Failed to save doodle. Please try again.";
      throw new Error(message);
    }
  };

  // Handle admin login
  const handleAdminLogin = (adminData) => {
    setAdmin(adminData);
    setShowAdminLogin(false);
    setShowAdminPanel(true);
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setAdmin(null);
    setShowAdminPanel(false);
  };

  // Handle doodles deleted
  const handleDoodlesDeleted = (deletedIds) => {
    if (deletedIds === 'all') {
      setDoodles([]);
    } else {
      setDoodles(prev => prev.filter(d => !deletedIds.includes(d.id)));
    }
  };

  // Calculate wall dimensions based on doodles
  const getWallDimensions = () => {
    if (doodles.length === 0) {
      return { width: 2000, height: 2000 };
    }
    const maxX = Math.max(...doodles.map(d => d.position_x)) + 400;
    const maxY = Math.max(...doodles.map(d => d.position_y)) + 400;
    return {
      width: Math.max(2000, maxX),
      height: Math.max(2000, maxY)
    };
  };

  const wallDimensions = getWallDimensions();

  return (
    <div className="App">
      {/* Title */}
      <div className="wall-title neo-card" data-testid="wall-title">
        <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Doodle Wall</h1>
      </div>

      {/* Doodle Count */}
      <div className="doodle-count neo-card" data-testid="doodle-count">
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
          {doodles.length} {doodles.length === 1 ? 'doodle' : 'doodles'}
        </span>
      </div>

      {/* Admin Button */}
      <button
        className="neo-button admin-button"
        onClick={() => admin ? setShowAdminPanel(true) : setShowAdminLogin(true)}
        data-testid="admin-button"
        aria-label="Admin"
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 1000,
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          background: admin ? '#DBEAFE' : '#FFFFFF'
        }}
      >
        <Settings size={24} />
      </button>

      {/* Help Tooltip */}
      <HelpTooltip />

      {/* Pan/Zoom Wall */}
      <TransformWrapper
        initialScale={0.5}
        minScale={0.2}
        maxScale={2}
        centerOnInit={true}
        limitToBounds={false}
        panning={{ disabled: isDrawingOpen || selectedDoodle !== null || showAdminLogin || showAdminPanel }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div className="zoom-controls" data-testid="zoom-controls">
              <button
                className="neo-button zoom-btn"
                onClick={() => zoomIn()}
                data-testid="zoom-in-button"
                aria-label="Zoom in"
              >
                <ZoomIn size={24} />
              </button>
              <button
                className="neo-button zoom-btn"
                onClick={() => zoomOut()}
                data-testid="zoom-out-button"
                aria-label="Zoom out"
              >
                <ZoomOut size={24} />
              </button>
              <button
                className="neo-button zoom-btn"
                onClick={() => resetTransform()}
                data-testid="reset-view-button"
                aria-label="Reset view"
              >
                <RotateCcw size={24} />
              </button>
            </div>

            <TransformComponent>
              <div
                className="wall-pattern"
                style={{
                  width: wallDimensions.width,
                  height: wallDimensions.height,
                  position: 'relative'
                }}
                data-testid="doodle-wall"
              >
                {/* Empty State */}
                {!isLoading && doodles.length === 0 && (
                  <div className="empty-state" data-testid="empty-state">
                    <h2 style={{ fontFamily: 'var(--font-heading)' }}>The wall is empty!</h2>
                    <p>Be the first to add a doodle</p>
                  </div>
                )}

                {/* Doodles */}
                <AnimatePresence>
                  {doodles.map((doodle, index) => (
                    <DoodleItem
                      key={doodle.id}
                      doodle={doodle}
                      index={index}
                      onClick={() => setSelectedDoodle(doodle)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Add Doodle FAB */}
      <button
        className="neo-button add-doodle-fab"
        onClick={() => setIsDrawingOpen(true)}
        data-testid="add-doodle-button"
      >
        <Plus size={24} style={{ marginRight: 8 }} />
        Add Your Doodle
      </button>

      {/* Drawing Modal */}
      <AnimatePresence>
        {isDrawingOpen && (
          <DrawingModal
            onClose={() => setIsDrawingOpen(false)}
            onSubmit={handleDoodleSubmit}
          />
        )}
      </AnimatePresence>

      {/* Enlarged Doodle Modal */}
      <AnimatePresence>
        {selectedDoodle && (
          <EnlargedDoodle
            doodle={selectedDoodle}
            onClose={() => setSelectedDoodle(null)}
          />
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <AdminLogin
            onLogin={handleAdminLogin}
            onClose={() => setShowAdminLogin(false)}
          />
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && admin && (
          <AdminPanel
            admin={admin}
            doodles={doodles}
            onLogout={handleAdminLogout}
            onDoodlesDeleted={handleDoodlesDeleted}
            onClose={() => setShowAdminPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
