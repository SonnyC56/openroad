import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  Heart, 
  Bot, 
  Compass,
  Route,
  Sparkles,
  Settings,
  Sun,
  Moon
} from 'lucide-react'
import styles from './Header.module.css'

const Header = () => {
  const [isDark, setIsDark] = useState(false)

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.header 
      className={styles.header}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.headerContent}>
        <motion.div 
          className={styles.logoSection}
          variants={itemVariants}
        >
          <div className={styles.logoIcon}>
            <MapPin size={28} />
          </div>
          <div className={styles.logoText}>
            <h1 className={styles.logo}>OpenRoad</h1>
            <span className={styles.tagline}>Free road trip planner</span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.centerInfo}
          variants={itemVariants}
        >
          <p className={styles.statusText}>AI-powered trip planning made simple</p>
        </motion.div>

        <motion.div 
          className={styles.actions}
          variants={itemVariants}
        >
          <motion.button
            className={`${styles.themeToggle} btn btn-ghost btn-icon`}
            onClick={() => setIsDark(!isDark)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          
          <motion.button
            className="btn btn-ghost btn-icon"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Settings size={18} />
          </motion.button>

          <motion.button
            className="btn btn-primary btn-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles size={16} />
            <span>New Trip</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.header>
  )
}

export default Header