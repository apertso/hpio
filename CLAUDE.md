# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Хочу Плачу** is a personal finance management application with:
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Platforms**: Web (React), Android (Tauri), Desktop (planned)

The application helps users track payments, manage recurring payments, and analyze spending through categories and statistics.

## Common Development Commands

### Backend (Node.js/Express)
```bash
cd backend

# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run database migrations
npm run db:migrate
```

### Frontend (React/Vite)
```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:ui        # UI mode

# Storybook (component documentation)
npm run storybook
npm run build-storybook

# Android/Tauri
npm run android:build:arm64
npm run android:build:universal
npm run android:build:debug
npm run android:install:debug  # Install debug APK on device
```

## Architecture

### Backend Structure (backend/src/)
```
├── config/          # Configuration (appConfig, logger, tracing)
├── controllers/     # Request handlers
├── middleware/      # Auth, error handling, etc.
├── models/          # Sequelize models
├── migrations/      # Database migrations
├── routes/          # Express routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
└── utils/           # Utilities (cron jobs, etc.)
```

**Key Models**: `User`, `Payment`, `Category`, `RecurringSeries`, `Suggestion`, `MerchantCategoryRule`, `TransactionNotification`, `Feedback`

**API Routes**: `/api/auth`, `/api/payments`, `/api/categories`, `/api/series`, `/api/stats`, `/api/archive`, `/api/suggestions`, `/api/merchant-rules`, `/api/notifications`

### Frontend Structure (frontend/src/)
```
├── api/             # API clients
├── components/      # Reusable components
├── pages/           # Route components
├── context/         # React contexts (Auth, Theme, Toast, etc.)
├── hooks/           # Custom hooks
├── utils/           # Utilities (logger, breadcrumbs, error handlers)
└── types/           # TypeScript types
```

**Key Contexts**: `AuthContext`, `ThemeContext`, `ToastContext`, `ResetContext`, `PageTitleContext`

**Key Components**: `ErrorBoundary`, `SuggestionModal`, `MobileNavigationDrawer`, `SyncStatusIndicator`

## Development Patterns & Guidelines

### Form Validation (from CODING_GUIDELINES.md)

All forms use **real-time validation** with Zod schemas:

```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
  clearErrors,
} = useForm({
  resolver: zodResolver(yourSchema),
  mode: "onChange",        // Validate on change
  delayError: 1000,        // Show errors after 1 second pause
});

// Clear error when user starts typing
<Input
  {...register("fieldName")}
  onChange={(e) => {
    clearErrors("fieldName");
    register("fieldName").onChange(e);
  }}
  error={errors.fieldName?.message}
/>
```

### Recurring Payments Generation

The system uses a **dual approach**:
1. **Real-time generation**: When a payment is completed/deleted, immediately generate the next one
2. **Daily cron job**: Safety net for "stuck" series (finds active series without upcoming/overdue payments)

The cron job prevents duplicates by checking if a payment for the calculated date already exists.

### Timezone Handling

- **User input dates** (e.g., `2025-08-15`) represent an entire day in the user's local timezone
- **API communication**: Dates sent as `YYYY-MM-DD` strings, backend interprets in user's timezone
- **DATETIME fields** (e.g., `completedAt`): Stored in UTC, converted from user's timezone for queries

### Suggestion Modal Behavior

The modal tracks processed suggestions to prevent re-appearance:
- `processedSuggestionIds`: Persistent set of dismissed/accepted suggestion IDs
- `suggestionModalDismissed`: Flag to keep modal closed if user manually closed it
- Automatically resets when all suggestions are processed

### Error Logging System (from CRASH_LOGGING_IMPLEMENTATION.md)

Comprehensive multi-layer logging:

**JavaScript/TypeScript**:
- Global error handlers for synchronous errors and promise rejections
- React Error Boundary for component rendering errors
- File logging with structured error format

**Breadcrumbs** (user action tracking):
- `trackNavigation()` - route changes
- `trackClick()` - button clicks
- `trackFormSubmit()` - form submissions
- `trackApiRequest()` / `trackApiError()` - API calls

**UI Freeze Detection**:
- Monitors main thread with heartbeat every 5s
- Detects UI freezing after 10s threshold
- Logs ANR (Application Not Responding) events

### Database Configuration

Backend uses environment variables (backend/.env):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hpio
DB_USER=your_username
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```

### Authentication

- JWT-based authentication
- Protected routes via middleware
- Token-based API access

### OpenTelemetry Integration

Backend includes OpenTelemetry for distributed tracing:
- Metrics export via OTLP gRPC
- Trace export via OTLP gRPC
- Winston instrumentation for logging

## Key Features

### Notification Import
- Parses bank push notifications (Raiffeisen, Sberbank, Ozon bank, Yandex bank, Tinkoff)
- Suggestion modal for semi-automatic payment creation
- Merchant normalization rules for categorization

### Multi-bank Support
- Separate transaction notifications per bank
- Merchant category rules for automatic categorization
- Transaction matching and grouping

### Mobile UI
- Responsive design with mobile navigation drawer
- Tauri-based Android application
- Push notification support

### Archive System
- Archive completed/overdue payments
- Restore from archive
- Archive filtering and search

## Important Files to Review

- **README.md**: Project overview and installation
- **CODING_GUIDELINES.md**: Development standards and patterns
- **LOGGING_DEVELOPER_GUIDE.md**: Logging system usage
- **CRASH_LOGGING_IMPLEMENTATION.md**: Crash reporting architecture
- **backend/src/server.ts**: Backend entry point
- **frontend/src/App.tsx**: Frontend application structure

## Environment Setup

1. PostgreSQL database required
2. Clone repository
3. Install backend dependencies: `cd backend && npm install`
4. Install frontend dependencies: `cd frontend && npm install`
5. Configure backend/.env with database credentials
6. Run migrations: `cd backend && npm run db:migrate`
7. Start backend: `cd backend && npm run dev`
8. Start frontend: `cd frontend && npm run dev`

## Testing

Frontend uses **Vitest** + **Testing Library**:
```bash
npm run test           # Watch mode with UI
npm run test:run       # Single run
npm run test:ui        # Web UI for test runner
```

Backend currently has no test setup (`npm test` will fail).

## Code Style

- **TypeScript** throughout both frontend and backend
- **ESLint** for frontend code quality
- **React Hook Form** + **Zod** for forms
- **Tailwind CSS** for styling
- **Winston** for backend logging

## Android Development

The frontend includes Tauri for Android builds:
- Debug builds: `npm run android:build:debug`
- Release builds: `npm run android:build:universal`
- Install debug APK: `npm run android:install:debug`

Logs can be downloaded from Android app: Settings → "Скачать логи" (Download logs)

## Monitoring & Observability

- **OpenTelemetry** for distributed tracing
- **Winston** for structured logging
- **File-based crash logs** on Android
- **SystemTaskLog** model for tracking cron job execution
