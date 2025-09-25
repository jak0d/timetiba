# AI Timetabler

AI-powered timetabling system for academic institutions that automates schedule creation and optimizes resource allocation.

## Features

- **Entity Management**: Manage venues, lecturers, courses, and student groups
- **AI-Powered Optimization**: Intelligent timetable generation with constraint satisfaction
- **Clash Detection**: Automatic detection and resolution of scheduling conflicts
- **Real-time Notifications**: Keep stakeholders informed of schedule changes
- **Multi-format Export**: Export timetables in PDF, Excel, CSV, and iCal formats
- **Role-based Access**: Secure access control for different user types

## Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL, Redis
- **AI Engine**: Python with OR-Tools
- **Authentication**: JWT with refresh tokens
- **Testing**: Jest, Supertest

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Redis (v6 or higher)
- Python (v3.9 or higher) for AI engine

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-timetabler
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

### Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Run linting:
```bash
npm run lint
```

## API Documentation

The API provides endpoints for managing all timetabling entities:

- **Venues**: `/api/venues`
- **Lecturers**: `/api/lecturers`
- **Courses**: `/api/courses`
- **Student Groups**: `/api/student-groups`
- **Schedules**: `/api/schedules`

## Project Structure

```
src/
├── controllers/     # API route handlers
├── middleware/      # Express middleware
├── models/         # TypeScript interfaces and types
├── repositories/   # Data access layer
├── services/       # Business logic layer
├── types/          # Type definitions
├── utils/          # Utility functions
└── test/           # Test setup and utilities
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details