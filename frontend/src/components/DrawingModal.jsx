import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Trash2, Loader2 } from "lucide-react";

const COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Green", hex: "#22C55E" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" }
];

const CANVAS_SIZE = 350;
const BRUSH_SIZE = 12;

export default function DrawingModal({ onClose, onSubmit }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex); // Default to black
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Set transparent background
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = BRUSH_SIZE;
    ctx.strokeStyle = selectedColor;

    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    setHasDrawn(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!hasDrawn || isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL("image/png");
      await onSubmit(imageData, selectedColor);
    } catch (err) {
      // Error will be set by parent component if needed
      setError(err.message || "Failed to submit doodle");
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid="drawing-modal-overlay"
    >
      <motion.div
        className="drawing-modal neo-card"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        data-testid="drawing-modal"
      >
        {/* Close Button */}
        <button
          className="neo-button close-btn"
          onClick={onClose}
          data-testid="close-modal-button"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 style={{ fontFamily: 'var(--font-heading)' }}>Create Your Doodle</h2>

        {/* Canvas */}
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="canvas-container drawing-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            data-testid="drawing-canvas"
          />
        </div>

        {/* Color Palette */}
        <div className="color-palette" data-testid="color-palette">
          {COLORS.map((color) => (
            <button
              key={color.name}
              className={`color-button ${selectedColor === color.hex ? 'selected' : ''}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => setSelectedColor(color.hex)}
              data-testid={`color-picker-${color.name.toLowerCase()}`}
              aria-label={`Select ${color.name}`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="error-message"
            style={{
              background: '#FEE2E2',
              border: '2px solid #EF4444',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              color: '#DC2626'
            }}
            data-testid="error-message"
          >
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="modal-actions">
          <button
            className="neo-button"
            onClick={clearCanvas}
            disabled={isSubmitting}
            data-testid="clear-canvas-button"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Trash2 size={18} />
            Clear
          </button>
          <button
            className="neo-button"
            onClick={handleSubmit}
            disabled={!hasDrawn || isSubmitting}
            data-testid="submit-doodle-button"
            style={{
              opacity: hasDrawn && !isSubmitting ? 1 : 0.5,
              cursor: hasDrawn && !isSubmitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Checking...
              </>
            ) : (
              'Put on Wall'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
