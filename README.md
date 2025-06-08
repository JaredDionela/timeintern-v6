# TimeIntern App

A modern time tracking application for interns and administrators built with React, Vite, TypeScript, and Supabase.

## Features

- **Authentication System**: Sign up and sign in functionality
- **Role-based Access**: Separate dashboards for interns and administrators
- **Time Tracking**: Track work hours and manage intern profiles
- **Modern UI**: Built with Tailwind CSS and Radix UI components
- **Database**: Powered by Supabase for real-time data management

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI
- **Routing**: React Router DOM
- **State Management**: React Query
- **Database**: Supabase
- **Authentication**: Supabase Auth
- **Form Handling**: React Hook Form with Zod validation

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Shadcn/ui components
│   └── *.tsx            # Custom components
├── hooks/               # Custom React hooks
├── integrations/        # Third-party integrations
│   └── supabase/        # Supabase client and types
├── lib/                 # Utility functions
├── pages/               # Application pages/routes
│   ├── Index.tsx        # Login/signup page
│   ├── AdminDashboard.tsx
│   ├── InternDashboard.tsx
│   └── NotFound.tsx
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
   ```bash
   cd timeinternv6
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks

## Database Setup

This application requires a Supabase database with the following tables:

- `intern_profiles` - Stores intern profile information
- User authentication is handled by Supabase Auth

Make sure to set up Row Level Security (RLS) policies in your Supabase dashboard for proper data access control.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is private and proprietary to Ariva Academy.
