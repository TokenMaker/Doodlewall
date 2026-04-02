import { motion } from "framer-motion";

const DOODLE_SIZE = 350;
const POPULAR_THRESHOLD = 5;

export default function DoodleItem({ doodle, index, onClick }) {
  const netScore = (doodle.votes_up ?? 0) - (doodle.votes_down ?? 0);
  const isPopular = netScore >= POPULAR_THRESHOLD;

  return (
    <motion.div
      className="doodle-item"
      style={{
        position: 'absolute',
        left: doodle.position_x,
        top: doodle.position_y,
        width: DOODLE_SIZE,
        height: DOODLE_SIZE,
        zIndex: index + 1,
        transform: `rotate(${doodle.rotation}deg)`
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: "spring", 
        damping: 15, 
        stiffness: 200,
        delay: index * 0.02 
      }}
      onClick={onClick}
      data-testid="doodle-item"
      whileHover={{ 
        scale: 1.05,
        zIndex: 1000,
        transition: { duration: 0.2 }
      }}
    >
      <img
        src={doodle.image_data}
        alt={`Doodle ${index + 1}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: 'transparent'
        }}
        draggable={false}
      />

      {/* Popular badge */}
      {isPopular && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 300 }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#FFF',
            border: '2px solid #000',
            boxShadow: '3px 3px 0px #000',
            padding: '3px 7px',
            pointerEvents: 'none',
          }}
          title={`Popular! +${netScore}`}
        >
          <img src="/star-gold.svg" alt="popular" style={{ width: 16, height: 16 }} />
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '12px',
            color: '#000',
            lineHeight: 1
          }}>
            +{netScore}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
