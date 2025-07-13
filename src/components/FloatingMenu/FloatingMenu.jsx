import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Cloud, FileDown, Settings, Info, 
  MapPin, Navigation, Share2, Save, HelpCircle,
  ChevronRight, Palette, Globe, Clock, Download, ExternalLink
} from 'lucide-react';
import styles from './FloatingMenu.module.css';

const FloatingMenu = ({ 
  onWeatherClick, 
  onExportClick, 
  onSettingsClick,
  onHelpClick,
  hasWeatherKey,
  tripData
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest(`.${styles.floatingMenu}`)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const menuItems = [
    {
      id: 'weather',
      icon: Cloud,
      label: 'Weather & Traffic',
      color: '#3b82f6',
      badge: hasWeatherKey ? null : 'Setup',
      onClick: onWeatherClick,
      submenu: [
        { icon: Cloud, label: 'Current Weather', action: 'current' },
        { icon: Clock, label: '5-Day Forecast', action: 'forecast' },
        { icon: Navigation, label: 'Route Conditions', action: 'route' }
      ]
    },
    {
      id: 'export',
      icon: FileDown,
      label: 'Export Trip',
      color: '#10b981',
      onClick: onExportClick,
      submenu: [
        { icon: Download, label: 'Export as GPX', action: 'gpx' },
        { icon: Download, label: 'Export as KML', action: 'kml' },
        { icon: Download, label: 'Export as CSV', action: 'csv' },
        { icon: Globe, label: 'Open in Google Maps', action: 'google' }
      ]
    },
    {
      id: 'share',
      icon: Share2,
      label: 'Share Trip',
      color: '#8b5cf6',
      onClick: () => console.log('Share clicked'),
      submenu: [
        { icon: Share2, label: 'Copy Link', action: 'link' },
        { icon: Save, label: 'Save to Cloud', action: 'cloud' }
      ]
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      color: '#6b7280',
      onClick: onSettingsClick
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help & Tips',
      color: '#f59e0b',
      onClick: onHelpClick
    }
  ];

  const handleMenuClick = (item) => {
    if (item.submenu) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
    } else if (item.onClick) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const handleSubmenuClick = (parentId, action) => {
    const parent = menuItems.find(item => item.id === parentId);
    if (parent?.onClick) {
      parent.onClick(action);
    }
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  return (
    <div className={styles.floatingMenu}>
      <motion.button
        className={styles.fab}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.menuContainer}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  className={styles.menuItemWrapper}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <motion.button
                    className={styles.menuItem}
                    onClick={() => handleMenuClick(item)}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div 
                      className={styles.iconWrapper}
                      style={{ backgroundColor: `${item.color}20`, color: item.color }}
                    >
                      <Icon size={20} />
                    </div>
                    <span className={styles.label}>{item.label}</span>
                    {item.badge && (
                      <span className={styles.badge}>{item.badge}</span>
                    )}
                    {item.submenu && (
                      <ChevronRight 
                        size={16} 
                        className={styles.chevron}
                        style={{ 
                          transform: activeSubmenu === item.id ? 'rotate(90deg)' : 'none' 
                        }}
                      />
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {activeSubmenu === item.id && item.submenu && (
                      <motion.div
                        className={styles.submenu}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.submenu.map((subItem, subIndex) => {
                          const SubIcon = subItem.icon;
                          return (
                            <motion.button
                              key={subItem.action}
                              className={styles.submenuItem}
                              onClick={() => handleSubmenuClick(item.id, subItem.action)}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: subIndex * 0.05 }}
                              whileHover={{ x: 3 }}
                            >
                              <SubIcon size={16} />
                              <span>{subItem.label}</span>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingMenu;