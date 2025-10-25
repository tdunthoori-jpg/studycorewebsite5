# Tutor Level System

A comprehensive leveling and pay progression system for tutors in StudyCore.

## Overview

The Tutor Level System automatically tracks tutor progression based on completed classes and provides a transparent pay structure. Tutors advance through 5 levels, with their hourly rate increasing as they gain experience.

## Features

- **5-Level Progression System**: From Newcomer (Level 1) to Master (Level 5)
- **Automatic Level Calculation**: Based on number of completed classes
- **Pay Rate Management**: Default rates per level with admin override capability
- **Progress Tracking**: Visual progress bars showing advancement to next level
- **Statistics Dashboard**: Track completed classes and total hours taught
- **Admin Controls**: Full management of tutor levels and pay rates
- **Privacy**: Only visible to tutors and administrators, hidden from students

## Level Structure

| Level | Name | Classes Required | Default Hourly Rate | Icon |
|-------|------|-----------------|---------------------|------|
| 1 | Newcomer | 0-9 | $18.00/hr | 🌱 |
| 2 | Rising Star | 10-24 | $19.50/hr | ⭐ |
| 3 | Experienced | 25-49 | $21.00/hr | 💎 |
| 4 | Expert | 50-99 | $23.00/hr | 👑 |
| 5 | Master | 100+ | $25.00/hr | 🏆 |

## Database Schema

### New Columns in `profiles` Table

```sql
tutor_level INTEGER DEFAULT 1          -- Current tutor level (1-5)
hourly_rate DECIMAL(10,2) DEFAULT 18.00  -- Current hourly pay rate
completed_classes INTEGER DEFAULT 0     -- Total completed classes
total_hours_taught DECIMAL(10,2) DEFAULT 0  -- Total teaching hours
```

### Database Functions

- `calculate_tutor_level(classes_completed)` - Automatically calculates level
- `get_default_hourly_rate(level)` - Returns default rate for a level
- Trigger: `update_tutor_level_on_class_completion()` - Auto-updates level when classes complete

## Installation

### 1. Run Database Migration

Execute the SQL migration to add the tutor level system to your database:

```bash
# Connect to your Supabase project and run:
psql $DATABASE_URL -f tutor-level-system.sql
```

Or use the Supabase dashboard SQL editor to execute the contents of `tutor-level-system.sql`.

### 2. Files Created

**Utilities:**
- `workspace/shadcn-ui/src/lib/tutor-levels.ts` - Core utility functions and constants

**Components:**
- `workspace/shadcn-ui/src/components/tutor/TutorLevelCard.tsx` - Main display component
- `workspace/shadcn-ui/src/components/admin/TutorManagement.tsx` - Admin management interface

**Updated Pages:**
- `workspace/shadcn-ui/src/pages/Dashboard.tsx` - Added tutor level widget
- `workspace/shadcn-ui/src/pages/profile/ProfilePage.tsx` - Added "Level & Stats" tab
- `workspace/shadcn-ui/src/pages/admin/AdminDashboard.tsx` - Added "Tutor Management" tab

## Usage

### For Tutors

**Dashboard View:**
- Tutors see their current level, pay rate, and progress prominently on the dashboard
- Stats show completed classes and total hours taught
- Progress bar indicates advancement to next level
- Next level preview shows what they'll unlock

**Profile Page:**
- "Level & Stats" tab displays comprehensive level information
- Full breakdown of progression and achievements
- Privacy notice confirms information is only visible to them and admins

### For Administrators

**Admin Dashboard → Tutor Management Tab:**
1. View all tutors with their current levels and stats
2. Click "Edit" on any tutor to modify:
   - Tutor level (1-5)
   - Hourly pay rate
3. System suggests default rate for selected level
4. Changes save instantly and are reflected immediately

**Use Cases:**
- Manually promote high-performing tutors
- Adjust pay rates for individual circumstances
- Override automatic level calculations when needed
- Track tutor progression across the platform

## Customization

### Adjusting Level Requirements

Edit `workspace/shadcn-ui/src/lib/tutor-levels.ts`:

```typescript
export const TUTOR_LEVELS: TutorLevel[] = [
  {
    level: 1,
    name: "Newcomer",
    minClasses: 0,      // Change minimum classes
    maxClasses: 9,      // Change maximum classes
    defaultHourlyRate: 18.00,  // Change pay rate
    // ... other properties
  },
  // ... more levels
];
```

Also update the SQL function in `tutor-level-system.sql`:

```sql
CREATE OR REPLACE FUNCTION calculate_tutor_level(classes_completed INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF classes_completed >= 100 THEN RETURN 5;
  ELSIF classes_completed >= 50 THEN RETURN 4;
  -- Update thresholds here
  ...
END;
```

### Changing Level Names and Icons

In `tutor-levels.ts`, modify the `name`, `icon`, and `description` fields:

```typescript
{
  level: 1,
  name: "Junior Tutor",     // Custom name
  icon: "🎓",              // Custom emoji
  description: "Starting your teaching journey",
  // ...
}
```

### Adding More Levels

1. Add new level to `TUTOR_LEVELS` array in `tutor-levels.ts`
2. Update database constraint: `CHECK (tutor_level >= 1 AND tutor_level <= 6)`
3. Update `calculate_tutor_level()` function in SQL
4. Update `get_default_hourly_rate()` function in SQL

## Automatic Updates

The system includes automatic triggers:

- **On Class Completion**: When `completed_classes` increases, tutor level recalculates automatically
- **Level Changes**: Triggers happen in real-time, no manual intervention needed
- **Admin Overrides**: Admins can manually set levels regardless of class count

## Privacy & Security

- **Tutor Visibility**: Tutors see only their own level and stats
- **Admin Visibility**: Admins see all tutors' levels and can edit them
- **Student Privacy**: Students NEVER see tutor levels or pay rates
- **Database Security**: Use Supabase RLS policies to enforce access control

## Recommended RLS Policies

Add to Supabase for security:

```sql
-- Tutors can read their own level data
CREATE POLICY "Tutors can view own level data"
ON profiles FOR SELECT
TO authenticated
USING (
  role = 'tutor'
  AND id = auth.uid()
);

-- Admins can view and update all tutor data
CREATE POLICY "Admins can manage tutor levels"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

## Future Enhancements

Potential additions to the system:

1. **Achievement Badges**: Special badges for milestones
2. **Performance Bonuses**: Extra pay for high ratings
3. **Quarterly Reviews**: Scheduled level assessments
4. **Tutor Leaderboard**: Top performers showcase (opt-in)
5. **Custom Bonuses**: Admin-assigned one-time bonuses
6. **Level History**: Track when tutors reached each level
7. **Automated Notifications**: Alert tutors when they level up
8. **Student Satisfaction**: Factor ratings into progression

## Troubleshooting

**Level not updating:**
- Ensure trigger is installed: `SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_update_tutor_level';`
- Check `completed_classes` is incrementing
- Verify tutor role is set correctly

**Pay rate not displaying:**
- Check database has `hourly_rate` column
- Verify default value of 18.00 is set
- Ensure profile exists in database

**Admin can't edit:**
- Confirm user has `role = 'admin'`
- Check Supabase RLS policies
- Verify admin tab is accessible

## Support

For issues or questions:
1. Check this documentation
2. Review SQL migration file for database setup
3. Examine component code for frontend logic
4. Test in development environment first

## Version History

- **v1.0.0** (2025-10-25): Initial release
  - 5-level system with automatic progression
  - Pay rates from $18-$25/hr
  - Admin management interface
  - Dashboard and profile integration
