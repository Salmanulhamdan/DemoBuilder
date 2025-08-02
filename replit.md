# Overview

This is a full-stack web application built with React frontend and Express.js backend. The project is structured as a monorepo with shared TypeScript types and schema definitions. It includes a modern UI component library (shadcn/ui), form handling, state management with React Query, and database integration using Drizzle ORM with PostgreSQL. The application appears to be in early development stages with an onboarding flow and basic user management functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation resolvers
- **Animations**: Framer Motion for smooth UI transitions

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Pattern**: RESTful API with `/api` prefix for all endpoints
- **Development**: Hot reload with tsx and custom Vite middleware
- **Build Process**: esbuild for server bundling, separate from client build

## Data Storage
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Type Safety**: Shared schema definitions between client and server
- **Development Storage**: In-memory storage implementation for development/testing

## Project Structure
- **Monorepo Layout**: Separate `client/`, `server/`, and `shared/` directories
- **Shared Types**: Database schemas and validation logic in `shared/` folder
- **Path Aliases**: TypeScript path mapping for clean imports (`@/`, `@shared/`)

## Key Features
- User authentication system with email/OTP verification flow
- Responsive design with mobile-first approach
- Dark/light theme support built into the design system
- Toast notifications and form validation
- Onboarding flow with progress tracking
- Comprehensive UI component library

## Development Environment
- **Hot Reload**: Both client and server support hot reloading
- **Type Checking**: Strict TypeScript configuration across the stack
- **Linting**: Configured for consistent code style
- **Database**: Easy database schema pushes with `npm run db:push`

# External Dependencies

## Database & Storage
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools

## UI & Styling
- **@radix-ui/***: Accessible, unstyled UI primitives for complex components
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Utility for creating variant-based component APIs
- **clsx**: Utility for conditional CSS class names
- **lucide-react**: Icon library for UI elements

## Forms & Validation
- **react-hook-form**: Performant forms with easy validation
- **@hookform/resolvers**: Validation resolvers for React Hook Form
- **zod**: TypeScript-first schema validation library
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation

## State Management & Data Fetching
- **@tanstack/react-query**: Powerful data synchronization for React
- **wouter**: Minimalist routing library for React

## Development Tools
- **vite**: Fast build tool and development server
- **@vitejs/plugin-react**: React support for Vite
- **tsx**: TypeScript execution engine for Node.js
- **esbuild**: Fast JavaScript/TypeScript bundler

## Animation & Interaction
- **framer-motion**: Production-ready motion library for React
- **embla-carousel-react**: Carousel component library

## Utilities
- **date-fns**: Modern JavaScript date utility library
- **nanoid**: URL-safe unique string ID generator
- **cmdk**: Command palette component for React