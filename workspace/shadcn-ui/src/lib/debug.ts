/**
 * App-wide debug and configuration flags
 * These can be adjusted to enable or disable various development features
 */

export const DEBUG = {
  /**
   * FEATURES THAT CAN BE ENABLED/DISABLED
   */
  // Automatic test data creation (when true, creates test data for new users)
  ENABLE_TEST_DATA: false,
  
  // Database connection debugging (when true, logs detailed database connection info)
  VERBOSE_DB_LOGGING: false,
  
  // Log auth state changes (when true, logs detailed auth state changes)
  LOG_AUTH_EVENTS: true,
  
  // Use the test database instead of production (if configured)
  USE_TEST_DATABASE: false,
  
  /**
   * HELPER FUNCTIONS
   */
  
  // Enable a debug feature
  enable: (feature: keyof typeof DEBUG) => {
    if (typeof DEBUG[feature] === 'boolean') {
      (DEBUG as any)[feature] = true;
      console.log(`Debug: Enabled ${String(feature)}`);
      localStorage.setItem(`debug_${String(feature)}`, 'true');
    }
  },
  
  // Disable a debug feature
  disable: (feature: keyof typeof DEBUG) => {
    if (typeof DEBUG[feature] === 'boolean') {
      (DEBUG as any)[feature] = false;
      console.log(`Debug: Disabled ${String(feature)}`);
      localStorage.setItem(`debug_${String(feature)}`, 'false');
    }
  },
  
  // Load debug settings from localStorage
  loadSettings: () => {
    Object.keys(DEBUG).forEach(key => {
      if (typeof (DEBUG as any)[key] === 'boolean') {
        const stored = localStorage.getItem(`debug_${key}`);
        if (stored === 'true') {
          (DEBUG as any)[key] = true;
        } else if (stored === 'false') {
          (DEBUG as any)[key] = false;
        }
      }
    });
    console.log('Debug: Loaded settings from localStorage');
  },
  
  // Reset all debug settings to defaults
  resetSettings: () => {
    Object.keys(DEBUG).forEach(key => {
      if (typeof (DEBUG as any)[key] === 'boolean') {
        localStorage.removeItem(`debug_${key}`);
      }
    });
    console.log('Debug: Reset all settings to defaults');
  }
};

// Load settings from localStorage when this file is imported
if (typeof window !== 'undefined') {
  DEBUG.loadSettings();
}