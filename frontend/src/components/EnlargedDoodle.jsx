import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '');
const API = `${BACKEND_URL}/api`;

export default function EnlargedDoodle({ doodle, onClose, onVote }) {
  const storageKey = `voted_${doodle.id}`;
  const existingVote = localStorage.getItem(storageKey); // "up" | "down" | null

  const [votesUp, setVotesUp] = useState(doodle.votes_up ?? 0);
  const [votesDown, setVotesDown] = useState(doodle.votes_down ?? 0);
  const [userVote, setUserVote] = useState(existingVote);
  const [isVoting, setIsVoting] = useState(false);
  const [popUp, setPopUp] = useState(false);
  const [popDown, setPopDown] = useState(false);

  const netScore = votesUp - votesDown;

  const handleVote = async (direction) => {
    if (isVoting) return;

    // If clicking same vote again, do nothing
    if (userVote === direction) return;

    setIsVoting(true);
    try {
      const res = await axios.post(`${API}/doodles/${doodle.id}/vote`, { vote: direction });
      setVotesUp(res.data.votes_up);
      setVotesDown(res.data.votes_down);
      setUserVote(direction);
      localStorage.setItem(storageKey, direction);

      // Bounce animation
      if (direction === "up") {
        setPopUp(true);
        setTimeout(() => setPopUp(false), 400);
      } else {
        setPopDown(true);
        setTimeout(() => setPopDown(false), 400);
      }

      // Notify parent to keep wall in sync
      if (onVote) onVote(doodle.id, res.data.votes_up, res.data.votes_down);
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setIsVoting(false);
    }
  };

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
            marginBottom: '16px',
            fontFamily: 'var(--font-body)',
            color: '#333'
          }}
          data-testid="doodle-timestamp"
        >
          Created: {new Date(doodle.created_at).toLocaleString()}
        </p>

        {/* Voting Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
          data-testid="vote-row"
        >
          {/* Thumbs Up */}
          <motion.button
            onClick={() => handleVote("up")}
            disabled={isVoting || userVote === "up"}
            data-testid="vote-up-button"
            aria-label="Thumbs up"
            animate={popUp ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            style={{
              background: userVote === "up" ? "#DCFCE7" : "#FFFFFF",
              border: userVote === "up" ? "3px solid #16A34A" : "3px solid #000",
              boxShadow: userVote === "up" ? "4px 4px 0px #16A34A" : "4px 4px 0px #000",
              borderRadius: 0,
              cursor: userVote === "up" || isVoting ? "default" : "pointer",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease",
              opacity: userVote === "up" ? 1 : 0.85,
            }}
          >
            <img
              src="/thumbs-up.svg"
              alt="thumbs up"
              style={{
                width: 26,
                height: 26,
                filter: userVote === "up"
                  ? "invert(39%) sepia(85%) saturate(500%) hue-rotate(95deg) brightness(90%)"
                  : "none"
              }}
            />
            <motion.span
              key={votesUp}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "18px",
                color: userVote === "up" ? "#16A34A" : "#000",
                minWidth: "24px",
                textAlign: "center"
              }}
            >
              {votesUp}
            </motion.span>
          </motion.button>

          {/* Net Score */}
          <motion.span
            key={netScore}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: "20px",
              color: netScore > 0 ? "#16A34A" : netScore < 0 ? "#DC2626" : "#555",
              minWidth: "40px",
              textAlign: "center",
            }}
          >
            {netScore > 0 ? `+${netScore}` : netScore}
          </motion.span>

          {/* Thumbs Down */}
          <motion.button
            onClick={() => handleVote("down")}
            disabled={isVoting || userVote === "down"}
            data-testid="vote-down-button"
            aria-label="Thumbs down"
            animate={popDown ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            style={{
              background: userVote === "down" ? "#FEE2E2" : "#FFFFFF",
              border: userVote === "down" ? "3px solid #DC2626" : "3px solid #000",
              boxShadow: userVote === "down" ? "4px 4px 0px #DC2626" : "4px 4px 0px #000",
              borderRadius: 0,
              cursor: userVote === "down" || isVoting ? "default" : "pointer",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease",
              opacity: userVote === "down" ? 1 : 0.85,
            }}
          >
            <motion.span
              key={votesDown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "18px",
                color: userVote === "down" ? "#DC2626" : "#000",
                minWidth: "24px",
                textAlign: "center"
              }}
            >
              {votesDown}
            </motion.span>
            <img
              src="/thumbs-down.svg"
              alt="thumbs down"
              style={{
                width: 26,
                height: 26,
                filter: userVote === "down"
                  ? "invert(22%) sepia(90%) saturate(600%) hue-rotate(340deg) brightness(90%)"
                  : "none"
              }}
            />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
