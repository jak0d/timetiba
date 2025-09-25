# Frontend Application Structure

This is the React TypeScript frontend for the AI Timetabler application.

## Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Layout components (AppLayout)
│   └── common/          # Common components (LoadingSpinner, ErrorMessage, etc.)
├── pages/               # Page components for routing
├── routes/              # Routing configuration
├── theme/               # Material-UI theme configuration
├── types/               # TypeScript type definitions
└── test-utils.tsx       # Testing utilities
```

## Key Features

- **Material-UI Integration**: Complete Material-UI setup with custom theme
- **Responsive Layout**: Mobile-first responsive design with drawer navigation
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Routing**: React Router DOM integration for navigation
- **Component Testing**: Unit tests for all components
- **Reusable Components**: Common UI components for consistent design

## Components

### Layout Components
- `AppLayout`: Main application layout with navigation drawer and app bar

### Common Components
- `LoadingSpinner`: Loading indicator with customizable message
- `ErrorMessage`: Error display component with different severity levels
- `ConfirmDialog`: Confirmation dialog for user actions

### Pages
- `Dashboard`: Main dashboard with statistics overview
- `Venues`: Venue management page (placeholder)
- `Lecturers`: Lecturer management page (placeholder)
- `Courses`: Course management page (placeholder)
- `StudentGroups`: Student group management page (placeholder)
- `Timetables`: Timetable visualization page (placeholder)
- `Settings`: Settings configuration page (placeholder)

## Type Definitions

Complete TypeScript interfaces for all entities:
- Venue, Lecturer, Course, StudentGroup
- Schedule, ScheduledSession, Clash
- Equipment, Constraints, and related enums

## Testing

Unit tests are provided for all components using React Testing Library and Jest.

## Usage

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```