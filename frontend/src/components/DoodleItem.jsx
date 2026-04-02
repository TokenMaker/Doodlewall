import { motion } from "framer-motion";

const DOODLE_SIZE = 350;

export default function DoodleItem({ doodle, index, onClick }) {
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
    </motion.div>
  );
}
