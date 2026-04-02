import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import axios from "axios";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function AdminLogin({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      onLogin(response.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg || JSON.stringify(e)).join(" "));
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid="admin-login-overlay"
    >
      <motion.div
        className="neo-card"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '32px', width: '90%', maxWidth: '400px', position: 'relative' }}
        data-testid="admin-login-modal"
      >
        <button
          className="neo-button close-btn"
          onClick={onClose}
          data-testid="close-login-button"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 style={{ 
          fontFamily: 'var(--font-heading)', 
          margin: '0 0 24px 0',
          textAlign: 'center'
        }}>
          Admin Login
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="email"
              style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="admin-email-input"
              style={{
                width: '100%',
                padding: '12px',
                border: '3px solid #000',
                fontFamily: 'var(--font-body)',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label 
              htmlFor="password"
              style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="admin-password-input"
              style={{
                width: '100%',
                padding: '12px',
                border: '3px solid #000',
                fontFamily: 'var(--font-body)',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div 
              style={{
                background: '#FEE2E2',
                border: '2px solid #EF4444',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center',
                fontFamily: 'var(--font-body)',
                color: '#DC2626'
              }}
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="neo-button"
            disabled={isLoading}
            data-testid="login-submit-button"
            style={{
              width: '100%',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
