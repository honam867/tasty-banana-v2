# Tasty Banana v2 - Client Application

Modern Next.js 15 frontend application with TypeScript, Tailwind CSS v4, shadcn/ui, and Framer Motion.

## Tech Stack

- **Next.js 15.0.x** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Framer Motion 12.x** - Animation library
- **Axios** - HTTP client with interceptors
- **Turbopack** - Fast bundler (dev mode)

## Project Structure

```
client/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles + Tailwind
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── hooks/           # Custom React hooks
│   │   ├── useApi.ts    # Manual API calls
│   │   ├── useFetch.ts  # Auto-fetch data
│   │   ├── useAuth.ts   # Authentication
│   │   └── index.ts     # Barrel export
│   ├── lib/             # Utilities and core logic
│   │   ├── api.ts       # Axios instance (port 8090)
│   │   ├── utils.ts     # Helper functions (cn, etc.)
│   │   ├── constants.ts # API endpoints & constants
│   │   └── index.ts     # Barrel export
│   ├── types/           # TypeScript type definitions
│   │   └── api.d.ts     # API response types
│   └── config/          # App configuration
├── public/              # Static assets
├── .env.local           # Environment variables
├── components.json      # shadcn/ui config
├── next.config.ts       # Next.js config
├── tailwind.config.ts   # Tailwind config
└── tsconfig.json        # TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running on `http://localhost:8090`

### Installation

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Core Features

### 1. API Client (Axios)

Configured Axios instance with automatic token injection and error handling.

**Location:** `src/lib/api.ts`

**Features:**
- Base URL: `http://localhost:8090`
- Automatic Bearer token injection from localStorage
- Global error handling (401 auto-logout)
- Request/response logging (dev mode)
- 30-second timeout

**Usage:**
```typescript
import { apiClient } from '@/lib';

// GET request
const data = await apiClient.get('/api/users');

// POST request
const result = await apiClient.post('/api/users', { name: 'John' });

// PUT/PATCH/DELETE
await apiClient.put('/api/users/1', { name: 'Jane' });
await apiClient.delete('/api/users/1');
```

### 2. Custom Hooks

#### useApi - Manual API Calls

For form submissions, button actions, and manual triggers.

```typescript
import { useApi } from '@/hooks';

function MyComponent() {
  const { data, loading, error, execute } = useApi();

  const handleSubmit = async () => {
    const result = await execute('/api/endpoint', {
      method: 'POST',
      data: { name: 'value' }
    });
    
    if (result) {
      console.log('Success:', result);
    }
  };

  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Loading...' : 'Submit'}
    </button>
  );
}
```

#### useFetch - Auto Data Fetching

SWR-like pattern for automatic data fetching on mount.

```typescript
import { useFetch } from '@/hooks';

function UserList() {
  const { data, loading, error, refetch } = useFetch('/api/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.map(user => <div key={user.id}>{user.name}</div>)}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}

// With options
const { data } = useFetch('/api/users', {
  enabled: isReady,
  params: { page: 1, limit: 10 }
});
```

#### useAuth - Authentication

Manages user authentication state and operations.

```typescript
import { useAuth } from '@/hooks';

function LoginPage() {
  const { user, loading, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    const success = await login('email@example.com', 'password');
    if (success) {
      // Redirect to dashboard
    }
  };

  if (loading) return <div>Loading...</div>;

  return isAuthenticated ? (
    <div>
      Welcome {user?.username}
      <button onClick={logout}>Logout</button>
    </div>
  ) : (
    <button onClick={handleLogin}>Login</button>
  );
}
```

### 3. Constants Management

All API endpoints and configuration in one place.

**Location:** `src/lib/constants.ts`

```typescript
import { API_ENDPOINTS, STORAGE_KEYS, HTTP_STATUS } from '@/lib';

// Use predefined endpoints
const response = await apiClient.get(API_ENDPOINTS.AUTH.LOGIN);

// Access storage keys
localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

// Check status codes
if (response.status === HTTP_STATUS.UNAUTHORIZED) {
  // Handle unauthorized
}
```

### 4. TypeScript Types

Define your API response types for full type safety.

**Location:** `src/types/api.d.ts`

```typescript
// Example usage
interface User {
  id: string;
  email: string;
  username: string;
}

const { data } = useFetch<User[]>('/api/users');
// data is typed as User[] | null
```

### 5. shadcn/ui Components

Add pre-built, customizable components.

```bash
# Add a component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add button card dialog
```

**Usage:**
```typescript
import { Button } from '@/components/ui/button';

function MyComponent() {
  return (
    <Button variant="default" size="lg">
      Click me
    </Button>
  );
}
```

### 6. Framer Motion Animations

Smooth, performant animations.

```typescript
import { motion } from 'framer-motion';

function AnimatedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      Content here
    </motion.div>
  );
}
```

## Environment Variables

Create `.env.local` file in the client root:

```env
# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8090
NEXT_PUBLIC_API_TIMEOUT=30000

# App
NEXT_PUBLIC_APP_NAME=Tasty Banana
```

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Best Practices

### 1. Import Aliases

Use `@/` alias for cleaner imports:

```typescript
// Good
import { useApi } from '@/hooks';
import { apiClient } from '@/lib';

// Avoid
import { useApi } from '../../../hooks/useApi';
```

### 2. Error Handling

All API errors are handled globally, but you can add local handling:

```typescript
const { execute, error } = useApi();

const handleAction = async () => {
  const result = await execute('/api/endpoint', { method: 'POST' });
  
  if (!result) {
    // Handle error (error state is already set)
    console.error('Failed:', error);
  }
};
```

### 3. Loading States

Always handle loading states for better UX:

```typescript
const { loading, execute } = useApi();

return (
  <button disabled={loading}>
    {loading ? 'Processing...' : 'Submit'}
  </button>
);
```

### 4. Type Safety

Always type your API responses:

```typescript
interface UserResponse {
  id: string;
  name: string;
  email: string;
}

const { data } = useFetch<UserResponse>('/api/user/me');
// data is typed as UserResponse | null
```

## Common Patterns

### Protected Routes

```typescript
'use client';

import { useAuth } from '@/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) return <div>Loading...</div>;

  return <div>Protected Content</div>;
}
```

### Form Submission with Validation

```typescript
import { useApi } from '@/hooks';
import { useState } from 'react';

function RegistrationForm() {
  const { loading, error, execute } = useApi();
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await execute('/api/auth/register', {
      method: 'POST',
      data: formData
    });

    if (result) {
      // Success - redirect or show message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />
      {error && <div className="text-red-500">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Register'}
      </button>
    </form>
  );
}
```

### Data Fetching with Pagination

```typescript
import { useFetch } from '@/hooks';
import { useState } from 'react';

function PaginatedList() {
  const [page, setPage] = useState(1);
  
  const { data, loading } = useFetch(`/api/items?page=${page}&limit=10`);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        data?.items.map(item => <div key={item.id}>{item.name}</div>)
      )}
      
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <span>Page {page}</span>
      <button onClick={() => setPage(p => p + 1)}>
        Next
      </button>
    </div>
  );
}
```

## Next Steps

1. **Add Pages**: Create pages in `src/app/` directory
2. **Add Components**: Build reusable components in `src/components/`
3. **Add shadcn/ui**: Install UI components as needed
4. **Update Types**: Add your API response types to `src/types/api.d.ts`
5. **Add Endpoints**: Update `src/lib/constants.ts` with your API endpoints

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Backend Connection Issues

- Ensure backend server is running on port 8090
- Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
- Check browser console for CORS errors

### Type Errors

```bash
# Regenerate types
npm run dev
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Framer Motion](https://motion.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
