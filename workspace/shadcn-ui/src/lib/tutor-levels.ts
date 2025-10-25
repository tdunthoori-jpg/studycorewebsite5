/**
 * Tutor Level System
 * Manages tutor progression, pay rates, and level calculations
 */

export interface TutorLevel {
  level: number;
  name: string;
  minClasses: number;
  maxClasses: number | null;
  defaultHourlyRate: number;
  color: string;
  icon: string;
  description: string;
}

export const TUTOR_LEVELS: TutorLevel[] = [
  {
    level: 1,
    name: "Newcomer",
    minClasses: 0,
    maxClasses: 9,
    defaultHourlyRate: 18.00,
    color: "from-slate-400 to-slate-600",
    icon: "🌱",
    description: "Just starting your tutoring journey"
  },
  {
    level: 2,
    name: "Rising Star",
    minClasses: 10,
    maxClasses: 24,
    defaultHourlyRate: 19.50,
    color: "from-blue-400 to-blue-600",
    icon: "⭐",
    description: "Building experience and confidence"
  },
  {
    level: 3,
    name: "Experienced",
    minClasses: 25,
    maxClasses: 49,
    defaultHourlyRate: 21.00,
    color: "from-purple-400 to-purple-600",
    icon: "💎",
    description: "Proven track record of success"
  },
  {
    level: 4,
    name: "Expert",
    minClasses: 50,
    maxClasses: 99,
    defaultHourlyRate: 23.00,
    color: "from-amber-400 to-amber-600",
    icon: "👑",
    description: "Highly skilled and sought-after"
  },
  {
    level: 5,
    name: "Master",
    minClasses: 100,
    maxClasses: null,
    defaultHourlyRate: 25.00,
    color: "from-gradient-start to-gradient-end",
    icon: "🏆",
    description: "Elite tutor with exceptional experience"
  }
];

/**
 * Get tutor level information based on level number
 */
export function getTutorLevelInfo(level: number): TutorLevel {
  const levelInfo = TUTOR_LEVELS.find(l => l.level === level);
  return levelInfo || TUTOR_LEVELS[0];
}

/**
 * Calculate tutor level based on completed classes
 */
export function calculateTutorLevel(completedClasses: number): number {
  for (let i = TUTOR_LEVELS.length - 1; i >= 0; i--) {
    const level = TUTOR_LEVELS[i];
    if (completedClasses >= level.minClasses) {
      return level.level;
    }
  }
  return 1;
}

/**
 * Get progress to next level (0-100)
 */
export function getProgressToNextLevel(completedClasses: number): {
  currentLevel: TutorLevel;
  nextLevel: TutorLevel | null;
  progress: number;
  classesNeeded: number;
} {
  const currentLevelNum = calculateTutorLevel(completedClasses);
  const currentLevel = getTutorLevelInfo(currentLevelNum);
  const nextLevel = currentLevelNum < 5 ? getTutorLevelInfo(currentLevelNum + 1) : null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progress: 100,
      classesNeeded: 0
    };
  }

  const classesInCurrentLevel = completedClasses - currentLevel.minClasses;
  const classesRequiredForNextLevel = nextLevel.minClasses - currentLevel.minClasses;
  const progress = Math.min(100, (classesInCurrentLevel / classesRequiredForNextLevel) * 100);
  const classesNeeded = nextLevel.minClasses - completedClasses;

  return {
    currentLevel,
    nextLevel,
    progress,
    classesNeeded
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format hours with decimal
 */
export function formatHours(hours: number): string {
  return hours.toFixed(1);
}

/**
 * Get level badge styles
 */
export function getLevelBadgeStyles(level: number): string {
  const levelInfo = getTutorLevelInfo(level);
  return `bg-gradient-to-r ${levelInfo.color}`;
}
