 TimeIntern - Intern Time Tracking System

<div align="center">
  <img src="public/app-logo.png" alt="TimeIntern Logo" width="200"/>
  
  A modern, secure time tracking system for managing intern workflows at Ariva Academy
  
  [![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-2.50.0-green.svg)](https://supabase.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-06B6D4.svg)](https://tailwindcss.com/)
  [![Vite](https://img.shields.io/badge/Vite-5.1.0-646CFF.svg)](https://vitejs.dev/)
</div>

---

 📖 Description

TimeIntern is a comprehensive web application designed to streamline time tracking and management for interns at Ariva Academy. The system provides separate dashboards for interns and administrators, featuring QR code-based check-in/check-out, automated salary calculations, and comprehensive reporting tools.

The application eliminates manual time tracking errors, provides real-time monitoring capabilities, and ensures accurate payroll processing through automated calculations and audit trails.

---

  Key Features

  For Interns
- QR Code Time Tracking: Secure check-in/check-out using dynamic QR codes
- Real-time Dashboard: Live progress tracking with visual indicators
- Hour Progress Monitoring: Track completion against required hours
- Automated Salary Calculation: Real-time earnings display based on work hours
- Mobile-Friendly Interface: Responsive design for all devices
- Secure Authentication: Email verification and persistent login options

  For Administrators
- Comprehensive User Management: View all intern profiles and statuses
- Real-time Activity Monitoring: Live tracking of intern check-ins/check-outs
- Advanced Reporting: Daily, monthly, and custom date range reports
- Data Export Capabilities: CSV export for payroll and analysis
- Direct Password Management: Secure password reset functionality
- Bulk Data Operations: Cleanup tools and batch operations
- Salary History Tracking: Automated monthly salary calculations

  Security & Compliance
- Role-based Access Control: Separate admin and intern permissions
- Audit Trail Logging: Complete tracking of all system activities
- Data Validation: Input sanitization and business rule enforcement
- Session Management: Secure authentication with auto-logout
- Privacy Protection: GDPR-compliant data handling

---

  Built With

 Frontend Technologies
- React 18.3.1 - Modern UI framework with hooks and context
- TypeScript 5.3.3 - Type-safe development environment
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Vite 5.1.0 - Fast build tool and development server
- React Router DOM - Client-side routing and navigation

 UI Components & Libraries
- Radix UI - Accessible, unstyled UI primitives
- Lucide React - Beautiful, customizable icons
- React Hook Form - Performant forms with easy validation
- Sonner & React Hot Toast - Elegant notification system
- Recharts - Responsive chart library for data visualization

 Backend & Database
- Supabase 2.50.0 - Backend-as-a-Service platform
- PostgreSQL - Robust relational database
- Row Level Security (RLS) - Database-level security policies
- Real-time Subscriptions - Live data updates across clients

 Development Tools
- ESLint - Code linting and quality assurance
- PostCSS & Autoprefixer - CSS processing and vendor prefixes
- TypeScript Compiler - Static type checking
- Git - Version control and collaboration

---

  Architecture

 Database Schema
```sql
-- Core Tables
├── auth.users (Supabase Auth)
├── intern_profiles (User profiles and settings)
├── time_logs (Check-in/check-out records)
├── monthly_salary_history (Automated payroll calculations)
└── qr_codes (Dynamic QR code management)

-- Key Features
├── RPC Functions (Business logic and calculations)
├── Real-time Subscriptions (Live updates)
└── Row Level Security (Data protection)
```

 Application Structure
```
src/
├── components/                                                                                     Reusable UI components
│   ├── ui/               Base UI components (Radix + Tailwind)
│   ├── DailyLogs.tsx     Daily activity reporting
│   ├── QRScanner.tsx     QR code scanning functionality
│   ├── TimeTracker.tsx   Main time tracking interface
│   └── UserStatusLog.tsx  Admin user management
├── pages/                Main application pages
│   ├── Index.tsx         Authentication and landing
│   ├── InternDashboard.tsx  Intern main dashboard
│   └── AdminDashboard.tsx   Admin control panel
├── hooks/                Custom React hooks
├── lib/                  Utility functions and helpers
├── integrations/         External service integrations
└── types/                TypeScript type definitions
```

---

  Core Functionalities

 Time Tracking System
- QR Code Generation: Dynamic, time-limited QR codes for secure access
- Validation Logic: Business rules preventing duplicate entries and invalid times
- Automatic Calculations: Real-time hour tracking with overtime detection
- Mobile Optimization: Camera integration for seamless mobile scanning

 Reporting & Analytics
- Daily Reports: Individual and aggregate activity summaries
- Monthly Summaries: Comprehensive monthly performance tracking
- Custom Date Ranges: Flexible reporting periods for analysis
- Export Capabilities: CSV downloads for external processing

 User Management
- Profile Management: Comprehensive intern profile system
- Permission Controls: Role-based access with admin privileges
- Password Management: Secure direct password reset functionality
- Activity Monitoring: Real-time status tracking and notifications

 Data Management
- Automated Cleanup: Bulk operations for data maintenance
- Salary Calculations: Automated monthly payroll processing
- Audit Trails: Complete activity logging for compliance
- Data Validation: Input sanitization and business rule enforcement

---

  User Experience

 Responsive Design
- Mobile-First Approach: Optimized for smartphones and tablets
- Progressive Web App: Fast loading and offline-capable features
- Cross-Browser Compatibility: Works on all modern browsers
- Accessibility: WCAG-compliant interface design

 Real-time Updates
- Live Dashboard: Instant updates without page refreshes
- Push Notifications: Real-time alerts for important events
- Collaborative Features: Multi-user support with conflict resolution
- Performance Optimization: Efficient data loading and caching

---

  Setup & Installation

```bash
 Clone the repository
git clone <repository-url>
cd timeinternv6

 Install dependencies
npm install

 Set up environment variables
cp .env.example .env.local
 Configure Supabase credentials and service keys

 Start development server
npm run dev

 Build for production
npm run build
```

 Environment Configuration
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key
```

---

  Technical Highlights

 Performance Optimizations
- Code Splitting: Lazy loading for optimal bundle sizes
- Image Optimization: Compressed assets and responsive images
- Database Indexing: Optimized queries for fast data retrieval
- Caching Strategies: Intelligent data caching for better UX

 Security Measures
- Input Validation: Comprehensive sanitization and validation
- SQL Injection Prevention: Parameterized queries and prepared statements
- XSS Protection: Content Security Policy and input escaping
- Authentication Security: Secure session management and token handling

 Scalability Features
- Modular Architecture: Component-based design for easy maintenance
- Database Optimization: Efficient schema design and query optimization
- API Rate Limiting: Built-in protection against abuse
- Error Handling: Comprehensive error logging and recovery

---

  Future Enhancements

- Mobile Application: Native iOS and Android apps
- Advanced Analytics: Machine learning insights and predictions
- Integration APIs: Third-party payroll and HR system connections
- Multi-tenant Support: Support for multiple organizations
- Advanced Reporting: Custom report builder and scheduling

---

  Contributing

This project was developed as part of the internship program at Ariva Academy. The codebase demonstrates modern web development practices, clean architecture principles, and enterprise-level security considerations.

---

  License

This project is proprietary software developed for Ariva Academy's internal use.

---

  Developers

Jared Dionela

Wynard Arevalo

Alec Sarzoso
*Full Stack Developer*

This project showcases expertise in:
- Modern React development with TypeScript
- Backend-as-a-Service integration (Supabase)
- Responsive UI/UX design with Tailwind CSS
- Real-time application architecture
- Security-first development practices
- Enterprise-level project structure and organization

---

<div align="center">
  <p><strong>Built with ❤️ for Ariva Academy</strong></p>
</div>
