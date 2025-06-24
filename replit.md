# Property Manager Platform - Complete Solution

## Overview

A comprehensive property management and financial intelligence platform that provides web and mobile applications for both property managers and tenants. The platform features a React/TypeScript frontend, Node.js/Express backend with PostgreSQL database, and includes both web and mobile (React Native) applications.

## System Architecture

### Frontend Architecture
- **Web Application**: React with TypeScript using Vite as the build tool
- **Mobile Applications**: 
  - Tenant app (React Native with Expo)
  - Landlord/Property Manager app (React Native with Expo)
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state, React Context for authentication
- **Routing**: Wouter for lightweight routing

### Backend Architecture
- **Server**: Node.js with Express framework
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Token-based authentication with bcrypt for password hashing
- **File Upload**: Multer for handling file uploads
- **Email Service**: SendGrid/NodeMailer for email notifications
- **Payment Processing**: Stripe integration for rent payments

### Database Design
- **Core Tables**: organizations, users, properties, units, tenants, expenses, mortgages
- **Supporting Tables**: sessions, maintenance_requests, rent_payments, vendors, tasks
- **Migration System**: Drizzle Kit for database migrations

## Key Components

### Property Management
- Multi-property portfolio management
- Unit tracking with occupancy status
- Property-specific financial metrics
- Maintenance coordination

### Financial Management
- Expense tracking with categorization
- Mortgage management and tracking
- Revenue/rent collection monitoring
- Financial reporting and analytics

### Tenant Management
- Complete tenant profiles and lease tracking
- Maintenance request system
- Rent payment processing via Stripe
- Communication tools

### Mobile Applications
- **Tenant Mobile App**: Rent payments, maintenance requests, profile management
- **Landlord Mobile App**: Property oversight, tenant management, maintenance coordination

### AI Integration
- Document analysis capabilities
- Chat interface for property management queries
- Automated insights and recommendations

## Data Flow

### Authentication Flow
1. User credentials validated against database
2. JWT token generated and stored in sessions table
3. Token used for subsequent API requests
4. Mobile apps store tokens securely using AsyncStorage

### Payment Processing Flow
1. Tenant initiates payment through web or mobile interface
2. Stripe payment intent created on backend
3. Payment processed through Stripe
4. Payment status updated in database
5. Confirmation sent via email

### Maintenance Request Flow
1. Tenant submits request through portal or mobile app
2. Request stored in database with priority and category
3. Property manager receives notification
4. Vendor assignment and status tracking
5. Completion confirmation and cost tracking

## External Dependencies

### Payment Processing
- **Stripe**: Credit card processing, payment intents, webhooks
- **Configuration**: Requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY

### Email Services
- **SendGrid**: Transactional emails for notifications
- **NodeMailer**: Alternative email service with SMTP configuration
- **Configuration**: SMTP_USER, SMTP_PASS for email functionality

### Database
- **Neon PostgreSQL**: Primary database with connection pooling
- **Configuration**: DATABASE_URL required for database connection

### AI Services
- **OpenAI**: Document analysis and chat functionality
- **Configuration**: OPENAI_API_KEY for AI features

### File Storage
- Local file system for document storage
- Support for images and PDFs up to 10MB

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Development**: `npm run dev` on port 5000

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_PUBLISHABLE_KEY`: Stripe public key
- `OPENAI_API_KEY`: OpenAI API key (optional for AI features)
- `SMTP_USER` and `SMTP_PASS`: Email service credentials

### Mobile App Deployment
- **Development**: Expo development server
- **iOS**: Build and deploy through Expo/App Store
- **Android**: Build and deploy through Expo/Google Play Store

## Recent Changes

- June 24, 2025: Complete multi-tenant organization-based data isolation implementation
  - Added authentication middleware to all API routes requiring user login
  - Implemented organization-based data filtering across all endpoints (properties, units, tenants, expenses, rent payments, tasks, mortgages, maintenance requests)
  - Users now only see data belonging to their own organization
  - Each API request validates organization ID and filters data accordingly
  - Created test organizations (demo-org-1, demo-org-2) with separate datasets for testing
  - Verified complete data isolation - users from different organizations cannot access each other's data
  - Fixed frontend authentication system to properly send Bearer tokens with all API requests
  - Updated database schema to include organization_id in all relevant tables
  - Fixed rent payments, mortgages, and maintenance requests query errors
  - Ensured property creation and all CRUD operations work with proper organization scoping
  - Standardized expense forms with comprehensive conditional fields
  - Enhanced authentication and session management for proper user context
  - Removed demo credentials from login page for security
  - Fixed dashboard KPI calculations to show accurate data based on organization scope
  - Corrected revenue calculations and occupancy rates to reflect actual tenant and unit data
  - Resolved data isolation issues - users now see only their organization's authentic data
  - Dashboard displays real revenue ($11,800) from actual paid rent payments with proper tenant-unit relationships
  - Fixed mortgage data integration - dashboard now shows $900K total mortgage balance with $5,890 monthly payments
  - Cleaned up authentication system to prevent creation of incorrect organization IDs
  - Disabled registration system for demo to ensure consistent data isolation
  - Implemented complete forgot password system with email verification and secure token validation
  - Added professional email templates with 1-hour token expiration and single-use protection
  - Created password reset pages with form validation and "Forgot password?" link on login page
  - Fixed password reset email URLs to use correct Replit domain instead of localhost
  - Fixed unit creation authentication - Properties page now properly sends auth tokens when creating units
  - Units now correctly link to user's organization and appear in dashboard

## Changelog

- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.