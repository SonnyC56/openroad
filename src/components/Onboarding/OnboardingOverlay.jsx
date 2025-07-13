import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Sparkles, 
  Navigation, 
  Bot,
  X,
  ChevronRight,
  ChevronLeft,
  Star,
  Route,
  Search,
  Zap
} from 'lucide-react'
import styles from './OnboardingOverlay.module.css'

const OnboardingOverlay = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('openroad-onboarding-completed')
    if (!hasSeenOnboarding) {
      setShowOnboarding(true)
    }
  }, [])

  const steps = [
    {
      title: "Welcome to OpenRoad! 🚗",
      description: "Your AI-powered road trip planner that makes discovering amazing destinations effortless.",
      icon: <Sparkles size={32} />,
      highlight: null,
      features: [
        "🤖 Intelligent AI travel agent",
        "🗺️ Interactive route planning", 
        "✨ Automatic waypoint suggestions",
        "📍 Click-to-add locations"
      ]
    },
    {
      title: "Plan Your Perfect Trip",
      description: "Start by adding your starting point and destination in the trip planner on the left.",
      icon: <MapPin size={32} />,
      highlight: "sidebar",
      features: [
        "🎯 Drag & drop to reorder stops",
        "📅 Add dates and times",
        "📝 Rich notes for each location",
        "💾 Save and load trips"
      ]
    },
    {
      title: "Your AI Travel Assistant",
      description: "Chat with your AI assistant to discover restaurants, attractions, and hidden gems along your route.",
      icon: <Bot size={32} />,
      highlight: "ai-overlay",
      features: [
        "🧠 Proactive trip suggestions", 
        "🎯 Automatic waypoint addition",
        "🗺️ Smart route visualization",
        "💡 Contextual recommendations"
      ]
    },
    {
      title: "Interactive Map Features",
      description: "Explore your route visually and discover points of interest along the way.",
      icon: <Navigation size={32} />,
      highlight: "map",
      features: [
        "🖱️ Click route segments for suggestions",
        "⭐ Discover nearby attractions",
        "🛰️ Multiple map layers",
        "🎯 Real-time location finding"
      ]
    },
    {
      title: "Ready to Explore!",
      description: "You're all set! Start planning your next adventure with OpenRoad's intelligent assistance.",
      icon: <Star size={32} />,
      highlight: null,
      features: [
        "🚀 Try: 'Plan a trip from NY to LA'",
        "🍽️ Ask: 'Find great restaurants in Denver'", 
        "🏞️ Search: 'Show scenic stops along my route'",
        "🎪 Discover: 'What activities are good for families?'"
      ]
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeOnboarding = () => {
    localStorage.setItem('openroad-onboarding-completed', 'true')
    setShowOnboarding(false)
    if (onComplete) onComplete()
  }

  const skipOnboarding = () => {
    completeOnboarding()
  }

  if (!showOnboarding) return null

  const currentStepData = steps[currentStep]

  return (
    <AnimatePresence>
      <motion.div
        className={styles.onboardingOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Highlight overlay */}
        {currentStepData.highlight && (
          <motion.div
            className={`${styles.highlight} ${styles[currentStepData.highlight]}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          />
        )}

        {/* Main onboarding card */}
        <motion.div
          className={styles.onboardingCard}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
          key={currentStep}
        >
          <button 
            className={styles.skipButton}
            onClick={skipOnboarding}
          >
            <X size={20} />
          </button>

          <div className={styles.cardHeader}>
            <div className={styles.stepIcon}>
              {currentStepData.icon}
            </div>
            <div className={styles.stepInfo}>
              <h2 className={styles.stepTitle}>{currentStepData.title}</h2>
              <p className={styles.stepDescription}>{currentStepData.description}</p>
            </div>
          </div>

          <div className={styles.cardContent}>
            <div className={styles.featuresList}>
              {currentStepData.features.map((feature, index) => (
                <motion.div
                  key={index}
                  className={styles.featureItem}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                >
                  {feature}
                </motion.div>
              ))}
            </div>
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.stepIndicator}>
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`${styles.stepDot} ${index === currentStep ? styles.active : ''}`}
                />
              ))}
            </div>

            <div className={styles.navigation}>
              <button
                className={`${styles.navButton} ${styles.prevButton}`}
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <button
                className={`${styles.navButton} ${styles.nextButton}`}
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Zap size={18} />
                    Get Started!
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default OnboardingOverlay