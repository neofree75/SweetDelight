# Overview

This is a modern Slovak pastry shop e-commerce website called "Marsela Bakery". The application is built as a full-stack TypeScript solution that integrates with ERPNext ERP system for product management, inventory, and order processing. The frontend provides a beautiful artisan bakery experience with product browsing, cart functionality, and order placement, while the backend handles ERPNext integration and session management.

## Recent Fixes (September 2025)

- **Fixed checkout "Pokračovať na platbu" error**: Resolved ERPNext company validation issue by ensuring correct company name "DEMO - Glam cake s. r. o." is used in all Sales Order creation calls
- **Fixed address query errors**: Updated ERPNext API calls to use "Dynamic Link.link_doctype" instead of deprecated "link_doctype" field
- **Improved error handling**: Enhanced frontend error parsing to display meaningful error messages from backend API responses
- **Fixed user authentication integration**: Checkout now properly uses authenticated user data when available instead of placeholder information
- **Enhanced security**: Implemented safe error logging that prevents exposure of authorization tokens in application logs
- **Added concurrency protection**: Implemented mutex-like system to prevent duplicate customer creation during concurrent requests

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React hooks for local state, TanStack Query for server state
- **UI Library**: Radix UI primitives with custom Tailwind CSS styling
- **Design System**: Custom pastry shop theme with warm colors (cream, soft pink, light brown) and typography using Playfair Display and Inter fonts
- **Component Structure**: Modular components with examples for development and testing

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Session Management**: Express-session with MemoryStore for cart and user sessions
- **Data Integration**: Custom ERPNext service class for API communication
- **Storage Layer**: In-memory storage for temporary cart/order data before ERPNext sync

## Data Storage Solutions
- **Primary Database**: ERPNext (external ERP system) for products, customers, and orders
- **Local Storage**: In-memory storage for session data and temporary order processing
- **Database ORM**: Drizzle ORM configured for PostgreSQL (for potential future local data needs)
- **Caching**: Product data caching with 5-minute TTL to reduce ERPNext API calls

## Authentication and Authorization
- **Session-based**: Express sessions with secure cookie configuration
- **ERPNext Authentication**: API key/secret authentication for ERP system access
- **No user accounts**: Customers place orders without registration (guest checkout)

## External Dependencies

### ERPNext Integration
- **Purpose**: Complete ERP backend for product catalog, inventory, customer management, and order processing
- **Authentication**: API key and secret-based authentication
- **Required Environment Variables**: 
  - `ERPNEXT_URL`: ERPNext instance URL
  - `ERPNEXT_API_KEY`: API access key
  - `ERPNEXT_API_SECRET`: API secret
  - `ERPNEXT_COMPANY`: Company name for orders
- **Data Sync**: Real-time product fetching, customer creation, and sales order submission

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessibility and behavior
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast build tool with HMR and TypeScript support
- **ESBuild**: Fast bundling for production builds
- **Replit Integration**: Development environment optimizations and error overlays


### Database (Configured but Optional)
- **Neon Database**: PostgreSQL service (configured via Drizzle but currently unused)
- **Connection**: Via `DATABASE_URL` environment variable
- **Purpose**: Ready for future local data storage needs if required