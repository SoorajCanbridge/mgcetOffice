# Next.js Authentication App

A professional Next.js application with Register, Login, and protected routing functionality.

## Features

- ✅ User Registration
- ✅ User Login
- ✅ Protected Routes
- ✅ Automatic redirect for unauthenticated users
- ✅ Token-based authentication
- ✅ Modern, responsive UI

## Getting Started

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory (you can copy from `.env.example`):

```bash
cp .env.example .env.local
```

Or create `.env.local` manually with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Next.js Auth App
```

**Note:** The `NEXT_PUBLIC_` prefix is required for Next.js to expose these variables to the browser.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend Configuration

The app is configured to connect to a backend server. The URL is set via the `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:5000`). Make sure your backend API has the following endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires Bearer token)

### Expected API Responses

**Register:**
```json
{
  "message": "User registered successfully",
  "user": { ... }
}
```

**Login:**
```json
{
  "token": "jwt_token_here",
  "user": { ... }
}
```

**Get Current User:**
```json
{
  "user": { ... }
}
```

## Project Structure

```
├── app/
│   ├── login/          # Login page
│   ├── register/       # Registration page
│   ├── page.js         # Protected home page
│   ├── layout.js       # Root layout with AuthProvider
│   └── globals.css     # Global styles
├── components/
│   └── ProtectedRoute.js  # Protected route wrapper
├── contexts/
│   └── AuthContext.js     # Authentication context
└── lib/
    └── auth.js            # Authentication utilities
```

## Usage

1. Navigate to `/register` to create a new account
2. Navigate to `/login` to sign in
3. After authentication, you'll be redirected to the protected home page
4. Unauthenticated users trying to access protected routes will be redirected to `/login`

