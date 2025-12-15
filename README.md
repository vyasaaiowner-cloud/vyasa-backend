# Vyasa AI - School Management Backend

Phase 0 school management system with mobile OTP authentication, attendance tracking, and holiday management.

## Tech Stack

- **Framework:** NestJS 11.0.1
- **Database:** PostgreSQL with Prisma ORM 6.19.1
- **Authentication:** JWT with mobile OTP (crypto-secure)
- **Deployment:** Supports Render, Railway, Fly.io

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vyasaai"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server
PORT=3000
NODE_ENV=development

# CORS Origins (comma-separated)
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

# For production:
# CORS_ORIGINS="https://app.vyasaai.com,https://pilot.vyasaai.com"
# NODE_ENV=production
```

## Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database with first admin user (optional)
npx prisma db seed
```

## Database Setup

### Run Migrations

```bash
# Development - create and apply migrations
npx prisma migrate dev

# Production - apply existing migrations only
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset --force
```

### Create First Admin User

**Option 1: Via API (Recommended)**

1. Start the server: `npm run start:dev`
2. Open Swagger: `http://localhost:3000/api`
3. Use `POST /auth/send-otp` with your mobile number
4. Check terminal logs for OTP (development mode)
5. Use `POST /auth/register` with OTP, role: `SUPER_ADMIN`

**Option 2: Direct Database Insert**

```sql
INSERT INTO "School" (id, name, code, "createdAt", "updatedAt")
VALUES ('platform', 'Vyasa Platform', 'VYASA_PLATFORM', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- First, generate an OTP via /auth/send-otp API
-- Then register via /auth/register API
```

## Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Watch mode
npm run start:debug
```

## API Documentation

**Swagger UI:** `http://localhost:3000/api`

### Base URLs

- **Development:** `http://localhost:3000`
- **Production:** Set via deployment platform

### Key Endpoints

#### Authentication
- `POST /auth/send-otp` - Send OTP to mobile number
- `POST /auth/register` - Register new user with OTP
- `POST /auth/login` - Login with mobile + OTP
- `GET /auth/me` - Get current user profile (requires auth)

#### Schools
- `POST /schools` - Create school (SUPER_ADMIN only)
- `GET /schools` - List all schools
- `POST /schools/:schoolId/classes` - Create class
- `POST /schools/:schoolId/classes/:classId/sections` - Create section

#### Students
- `POST /students` - Add student (SCHOOL_ADMIN)
- `GET /students` - List students
- `POST /students/bulk-upload` - CSV upload for batch import

#### Attendance
- `POST /attendance/mark` - Mark attendance (TEACHER, SCHOOL_ADMIN)
- `GET /attendance/section/:sectionId` - Get section attendance

#### Holidays
- `POST /holidays` - Create holiday (ADMIN)
- `GET /holidays` - List holidays (all authenticated users)

#### Teachers
- `POST /teachers` - Create teacher profile
- `GET /teachers` - List teachers

#### Announcements
- `POST /announcements` - Create announcement
- `GET /announcements` - List announcements (filtered by role)

## User Roles

- **SUPER_ADMIN:** Platform administrator (auto-assigned to "platform" school)
- **SCHOOL_ADMIN:** School administrator (manages school data)
- **TEACHER:** Teacher (marks attendance for assigned sections)
- **PARENT:** Parent (views child's attendance/announcements)

## Authentication Flow

1. **Send OTP:** `POST /auth/send-otp` with `countryCode` (+91) and `mobileNo`
2. **Get OTP:** Check terminal logs (dev) or SMS (production - not implemented yet)
3. **Register/Login:** `POST /auth/register` or `/auth/login` with OTP
4. **Access Token:** Receive JWT token in response
5. **Authenticated Requests:** Include header: `Authorization: Bearer <token>`

## Database Schema

### Core Models
- **User** - All users (phone-based auth)
- **School** - School entities
- **Class** - Class/Grade (e.g., "Class 10")
- **Section** - Section/Division (e.g., "A", "B")
- **Student** - Student records
- **Teacher** - Teacher profiles
- **TeacherAssignment** - Teacher-to-section mapping
- **Attendance** - Daily student attendance
- **SectionAttendanceRecord** - Prevents duplicate section attendance
- **Holiday** - School holidays/events
- **Announcement** - School/class announcements
- **Otp** - OTP verification records
- **ParentStudent** - Parent-child relationships

## Phase 0 Constraints

✅ **Mobile OTP only** (no email authentication)  
✅ **Roll numbers optional** (easier onboarding)  
✅ **Teacher assignment enforcement** (must be assigned to section)  
✅ **Database-level section attendance uniqueness**  
✅ **No OTP logs in production**  
✅ **Environment-driven CORS**

## Production Deployment

### Required Environment Variables

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-production-secret"
NODE_ENV=production
PORT=3000
CORS_ORIGINS="https://your-frontend-domain.com"
```

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `JWT_SECRET`
- [ ] Configure production `DATABASE_URL`
- [ ] Set `CORS_ORIGINS` to frontend domain
- [ ] Run `npx prisma migrate deploy`
- [ ] Run `npx prisma generate`
- [ ] Build: `npm run build`
- [ ] Start: `npm run start:prod`

### Platform-Specific

**Render:**
```bash
# Build Command
npm install && npx prisma generate && npm run build

# Start Command
npx prisma migrate deploy && npm run start:prod
```

**Railway/Fly.io:**
```bash
# Similar to Render, ensure migrations run before app starts
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Troubleshooting

### Prisma Client Errors
```bash
# Regenerate Prisma Client
npx prisma generate
```

### Migration Issues
```bash
# Check migration status
npx prisma migrate status

# Reset and reapply (WARNING: deletes data)
npx prisma migrate reset
```

### Port Already in Use
```bash
# Change PORT in .env or kill process
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -ti:3000 | xargs kill
```

## Support

For issues or questions:
- Check Swagger docs at `/api`
- Review error messages in terminal
- Ensure database is running and accessible

## License

MIT
