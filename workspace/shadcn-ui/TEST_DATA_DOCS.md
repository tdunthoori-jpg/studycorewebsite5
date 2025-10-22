# Test Data Utility Documentation

## Overview

This utility helps create test data in the database when a user has no existing data. It's particularly useful for:

1. New users who sign up and find an empty dashboard
2. Testing the application without manually creating data
3. Development and QA environments

## How It Works

The `createTestDataIfNeeded()` function checks if a user already has data in the database:

- For students: Checks if they have any class enrollments
- For tutors: Checks if they have created any classes

If no data is found, it creates a suitable set of test data:

### For Tutors:
- Creates 4 classes with descriptions
- Creates 2 schedules per class
- Creates 2-3 assignments per class
- Creates 2-3 resources per class

### For Students:
- Checks if any classes exist to enroll in
- If no classes exist, creates a test tutor with classes first
- Enrolls the student in up to 3 classes

## Usage

Import the function and call it in your component:

```typescript
import { createTestDataIfNeeded } from '@/lib/test-data';

// Inside a component effect or function:
const userId = 'user-uuid-here';
const userRole = 'student'; // or 'tutor'
const dataCreated = await createTestDataIfNeeded(userId, userRole);

if (dataCreated) {
  // Test data was created, you might want to refresh the component
}
```

## Implementation Details

The function is safe to call multiple times as it will only create data if none exists. It includes:

- Database connection checks
- UUID validation
- Proper error handling
- Success notifications via toast

## Database Tables Used

This utility interacts with the following tables:
- `profiles` - For creating test tutor profiles if needed
- `classes` - For creating class data
- `enrollments` - For enrolling students in classes
- `schedules` - For creating class schedules
- `assignments` - For creating assignments
- `resources` - For creating class resources

## Example Data Created

### Classes
- Mathematics 101
- Introduction to Computer Science
- Physics for Beginners
- English Literature

### Schedules
Random days of week (Sun-Thu) with times at 9am, 11am, 2pm, or 4pm

### Assignments
- Homework Assignment 1
- Midterm Project
- Final Exam
- Research Paper

### Resources
- Course Syllabus (PDF)
- Lecture Notes (PDF)
- Tutorial Video (video)
- Additional Reading (link)