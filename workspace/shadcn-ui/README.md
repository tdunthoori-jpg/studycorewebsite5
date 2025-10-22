# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration
- `src/pages/Index.tsx` - Home page logic

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

- The `@/` path alias points to the `src/` directory
- In your typescript code, don't re-export types that you're already importing

# Database Setup

This application requires a Supabase backend to be properly configured. 

## Setting Up Your Database

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL setup scripts in the SQL editor:
   - `safe-auth-setup.sql` for the complete setup
   - `db-functions-setup.sql` for required database functions
3. Set your environment variables in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

For detailed database setup instructions, see `DATABASE_SETUP.md`

# Database Utilities

## Test Data Generator

This project includes a test data generator that automatically creates sample data for new users. This is helpful for:

- Development and testing
- Ensuring new users see populated UI elements
- Demonstrating the application's features

To use the test data generator:

```typescript
import { createTestDataIfNeeded } from '@/lib/test-data';

// Inside component effect:
await createTestDataIfNeeded(userId, 'student'); // or 'tutor'
```

See `TEST_DATA_DOCS.md` for detailed documentation on the test data utility.

## Error Handling

The project includes robust error handling utilities in `src/lib/error-handler.ts`:

- Type-safe error handling
- Proper user feedback via toast notifications
- UUID validation functions
- Database operation error formatters

## Database Connection Checker

A database connection checker utility is available in `src/lib/db-checker.ts`:

- Validates Supabase connection
- Checks authentication status
- Tests database table access
- Logs detailed debugging information

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Add Dependencies**

```shell
pnpm add some_new_dependency
```

**Start Preview**

```shell
pnpm run dev
```

**To build**

```shell
pnpm run build
```
