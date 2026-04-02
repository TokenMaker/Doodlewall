import { useState } from "react";
import { motion } from "framer-motion";
import { X, Trash2, LogOut, Loader2, CheckSquare, Square } from "lucide-react";
import axios from "axios";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function AdminPanel({ admin, doodles, onLogout, onDoodlesDeleted, onClose }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'selected' or 'all'

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === doodles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(doodles.map(d => d.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    setDeleteType('selected');
    
    try {
      await axios.delete(`${API}/doodles`, {
        data: { doodle_ids: Array.from(selectedIds) },
        withCredentials: true
      });
      onDoodlesDeleted(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to delete doodles:", err);
      alert("Failed to delete doodles. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteType(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL doodles? This cannot be undone.")) {
      return;
    }
    
    setIsDeleting(true);
    setDeleteType('all');
    
    try {
      await axios.delete(`${API}/admin/doodles/all`, {
        withCredentials: true
      });
      onDoodlesDeleted('all');
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to delete all doodles:", err);
      alert("Failed to delete doodles. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteType(null);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error("Logout error:", err);
    }
    onLogout();
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid="admin-panel-overlay"
    >
      <motion.div
        className="neo-card"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          padding: '24px', 
          width: '90%', 
          maxWidth: '800px', 
          maxHeight: '80vh',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
        data-testid="admin-panel-modal"
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          paddingRight: '40px'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-heading)', 
            margin: 0
          }}>
            Admin Panel
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
              {admin.email}
            </span>
            <button
              className="neo-button"
              onClick={handleLogout}
              data-testid="logout-button"
              style={{ 
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <button
          className="neo-button close-btn"
          onClick={onClose}
          data-testid="close-admin-panel-button"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Actions Bar */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button
            className="neo-button"
            onClick={selectAll}
            data-testid="select-all-button"
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {selectedIds.size === doodles.length && doodles.length > 0 ? (
              <CheckSquare size={18} />
            ) : (
              <Square size={18} />
            )}
            {selectedIds.size === doodles.length && doodles.length > 0 ? 'Deselect All' : 'Select All'}
          </button>

          <button
            className="neo-button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || isDeleting}
            data-testid="delete-selected-button"
            style={{ 
              padding: '10px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              opacity: selectedIds.size === 0 || isDeleting ? 0.5 : 1
            }}
          >
            {isDeleting && deleteType === 'selected' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            Delete Selected ({selectedIds.size})
          </button>

          <button
            className="neo-button"
            onClick={handleDeleteAll}
            disabled={doodles.length === 0 || isDeleting}
            data-testid="delete-all-button"
            style={{ 
              padding: '10px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: '#FEE2E2',
              opacity: doodles.length === 0 || isDeleting ? 0.5 : 1
            }}
          >
            {isDeleting && deleteType === 'all' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            Delete All ({doodles.length})
          </button>
        </div>

        {/* Doodle Grid */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          border: '2px solid #000',
          padding: '16px',
          background: '#FAFAFA'
        }}>
          {doodles.length === 0 ? (
            <p style={{ 
              textAlign: 'center', 
              fontFamily: 'var(--font-body)',
              color: '#666',
              padding: '40px'
            }}>
              No doodles on the wall yet
            </p>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px'
            }}>
              {doodles.map((doodle) => (
                <div
                  key={doodle.id}
                  onClick={() => toggleSelect(doodle.id)}
                  data-testid={`admin-doodle-${doodle.id}`}
                  style={{
                    cursor: 'pointer',
                    border: selectedIds.has(doodle.id) ? '3px solid #3B82F6' : '2px solid #000',
                    background: selectedIds.has(doodle.id) ? '#DBEAFE' : '#FFF',
                    padding: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <img
                    src={doodle.image_data}
                    alt="Doodle"
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
