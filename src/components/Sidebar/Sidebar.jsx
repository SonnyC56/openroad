import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { MapPin } from 'lucide-react'
import TripPlanner from './TripPlanner'
import styles from './Sidebar.module.css'

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const y = useMotionValue(0)
  const controls = useAnimation()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  const handleDragEnd = (event, info) => {
    if (!isMobile) return
    
    const threshold = 100
    const velocity = info.velocity.y
    
    if (info.offset.y > threshold || velocity > 500) {
      setIsExpanded(false)
      controls.start({ y: 0 })
    } else if (info.offset.y < -threshold || velocity < -500) {
      setIsExpanded(true)
      controls.start({ y: 0 })
    } else {
      controls.start({ y: 0 })
    }
  }

  return (
    <motion.aside 
      className={`${styles.sidebar} ${isMobile && isExpanded ? styles.expanded : ''} glass-card`}
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      drag={isMobile ? "y" : false}
      dragConstraints={{ top: -200, bottom: 200 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ y }}
    >
      <div 
        className={styles.sidebarHeader}
        onClick={() => isMobile && setIsExpanded(!isExpanded)}
      >
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