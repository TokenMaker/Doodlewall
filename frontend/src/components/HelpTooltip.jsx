import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, X } from "lucide-react";

export default function HelpTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('doodlewall-help-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsOpen(false);
    localStorage.setItem('doodlewall-help-dismissed', 'true');
  };

  if (isDismissed) return null;

  return (
    <div 
      className="help-tooltip-container"
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '32px',
        zIndex: 1000
      }}
    >
      <button
        className="neo-button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="help-button"
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
        aria-label="Help"
      >
        <HelpCircle size={24} />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="neo-card"
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '0',
            padding: '16px',
            minWidth: '220px',
            background: '#FFFFFF'
          }}
          data-testid="help-popup"
        >
          <button
            onClick={handleDismiss}
            className="neo-button"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '28px',
              height: '28px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            data-testid="dismiss-help-button"
            aria-label="Dismiss help"
          >
            <X size={14} />
          </button>
          
          <h4 style={{ 
            margin: '0 0 12px 0', 
            fontFamily: 'var(--font-heading)',
            fontSize: '16px'
          }}>
            How to Navigate
          </h4>
          
          <ul style={{ 
            margin: 0, 
            padding: '0 0 0 20px',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <li>Drag to pan around</li>
            <li>Scroll to zoom in/out</li>
            <li>Click a doodle to enlarge</li>
          </ul>

          <p style={{
            margin: '12px 0 0 0',
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            Click X to hide this forever
          </p>
        </motion.div>
      )}
    </div>
  );
}
