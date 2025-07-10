import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import TripPlanner from './TripPlanner'
import styles from './Sidebar.module.css'

const Sidebar = () => {

  const sidebarVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  }

  return (
    <motion.aside 
      className={`${styles.sidebar} glass-card`}
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.headerContent}>
          <MapPin size={24} className={styles.headerIcon} />
          <div>
            <h2>Your Route</h2>
            <p>Locations and stops along your journey</p>
          </div>
        </div>
      </div>
      <div className={styles.sidebarContent}>
        <TripPlanner />
      </div>
    </motion.aside>
  )
}

export default Sidebar