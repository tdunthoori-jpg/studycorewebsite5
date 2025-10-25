import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getTutorLevelInfo,
  getProgressToNextLevel,
  formatCurrency,
  formatHours,
  getLevelBadgeStyles
} from "@/lib/tutor-levels";
import { Clock, Award, TrendingUp, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

interface TutorLevelCardProps {
  tutorLevel: number;
  hourlyRate: number;
  completedClasses: number;
  totalHoursTaught: number;
  variant?: "dashboard" | "profile";
}

export function TutorLevelCard({
  tutorLevel,
  hourlyRate,
  completedClasses,
  totalHoursTaught,
  variant = "dashboard"
}: TutorLevelCardProps) {
  const { currentLevel, nextLevel, progress, classesNeeded } = getProgressToNextLevel(completedClasses);
  const isMaxLevel = tutorLevel === 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-2">
        <CardHeader className={`bg-gradient-to-r ${currentLevel.color} text-white pb-6 sm:pb-8`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">{currentLevel.icon}</span>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  Level {tutorLevel}: {currentLevel.name}
                </CardTitle>
                <CardDescription className="text-white/90 mt-1 text-sm">
                  {currentLevel.description}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2 self-start sm:self-auto">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              {formatCurrency(hourlyRate)}/hr
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Completed Classes</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{completedClasses}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{formatHours(totalHoursTaught)}</p>
              </div>
            </div>
          </div>

          {/* Progress to Next Level */}
          {!isMaxLevel && nextLevel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Progress to {nextLevel.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {classesNeeded} {classesNeeded === 1 ? 'class' : 'classes'} to go
                </span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedClasses} classes</span>
                <span>{nextLevel.minClasses} classes needed</span>
              </div>
              {nextLevel && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{nextLevel.icon}</span>
                    <div>
                      <p className="text-sm font-medium">Next: {nextLevel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(nextLevel.defaultHourlyRate)}/hr
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{formatCurrency(nextLevel.defaultHourlyRate - hourlyRate)}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Max Level Celebration */}
          {isMaxLevel && (
            <div className="text-center p-6 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-800">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-semibold text-lg">Maximum Level Reached!</p>
              <p className="text-sm text-muted-foreground mt-1">
                You've achieved the highest tutor level. Keep up the excellent work!
              </p>
            </div>
          )}

          {variant === "profile" && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Your level and pay rate are visible only to you and administrators
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
