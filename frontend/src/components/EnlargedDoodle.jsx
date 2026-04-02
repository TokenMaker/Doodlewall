import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function EnlargedDoodle({ doodle, onClose }) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid="enlarged-modal-overlay"
    >
      <motion.div
        className="enlarged-modal neo-card"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        data-testid="enlarged-modal"
        style={{ position: 'relative', padding: '24px' }}
      >
        {/* Close Button */}
        <button
          className="neo-button close-btn"
          onClick={onClose}
          data-testid="close-enlarged-button"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Enlarged Image */}
        <img
          src={doodle.image_data}
          alt="Enlarged doodle"
          style={{
            maxWidth: '80vw',
            maxHeight: '70vh',
            objectFit: 'contain',
            border: '3px solid #000000',
            boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
            background: '#FFFFFF',
            display: 'block',
            margin: '16px auto 0'
          }}
          data-testid="enlarged-image"
        />

        {/* Doodle Info */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '16px',
            fontFamily: 'var(--font-body)',
            color: '#333'
          }}
          data-testid="doodle-timestamp"
        >
          Created: {new Date(doodle.created_at).toLocaleString()}
        </p>
      </motion.div>
    </motion.div>
  );
}
