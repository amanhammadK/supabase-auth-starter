# Supabase Auth Starter

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0"/>
  <img src="https://img.shields.io/badge/node.js-20+-green.svg" alt="Node.js 20+"/>
  <img src="https://img.shields.io/badge/supabase-1.0+-green.svg" alt="Supabase 1.0+"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License"/>
</p>

An authentication starter built with Next.js and Supabase. Complete auth flow with sign-in, sign-up, Google OAuth, magic links, and session-aware profile view — plus MCP server integration.

## What's Included

- Email/password sign-in and sign-up with validation
- Google OAuth and magic-link sign-in
- Session-aware profile view with sign-out
- Graceful setup screen when Supabase isn't configured
- Next.js auth page with form handling
- Node.js MCP server with Zod validation
- GitHub Actions CI workflow
- Multi-stage Dockerfile with health checks
- ESLint + Prettier code quality setup
- Jest test suite for ES Modules

## Features

- **Supabase Auth**: Built-in authentication with Supabase backend
- **Sign Up / Sign In**: Toggle between create-account and login
- **Magic Links**: Passwordless email sign-in
- **OAuth**: One-click Google sign-in
- **Session Management**: JWT-based session handling with live listener
- **MCP Integration**: Model Context Protocol server
- **Zod Validation**: Type-safe schemas for auth data
- **ES Module Support**: Modern JavaScript
- **Testing**: Jest configured for ES modules
- **Code Quality**: ESLint + Prettier standards
- **Dockerized**: Multi-stage build with HEALTHCHECK
- **CI/CD Ready**: GitHub Actions workflow

## Quick Start

### Prerequisites

- Node.js 20 or higher
- Supabase project and credentials
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/amanhammadK/supabase-auth-starter.git
cd supabase-auth-starter

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your Supabase credentials
```

### Running

```bash
# Start the web frontend
npm run dev

# Open http://localhost:3000
```

The MCP server runs separately:

```bash
npm start
```

### Testing

```bash
# Run tests
npm test
```

### Linting

```bash
# Lint source code
npm run lint
```

## Project Structure

```
supabase-auth-starter/
├── pages/
│   └── index.tsx                # Auth flow (sign in / sign up / profile)
├── src/
│   ├── index.js                # MCP server entry point
│   ├── mcpServer.js            # MCP server implementation
│   └── schemas.js              # Zod validation schemas
├── tests/
│   └── template.test.js        # Test suite
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── .prettierrc                # Prettier configuration
├── Dockerfile                 # Multi-stage Docker build
├── eslint.config.js           # ESLint configuration
├── jest.config.js             # Jest configuration
├── package.json               # Project dependencies
└── README.md                  # This file
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | No |

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Enable email/password authentication in Auth settings
3. Copy your project URL and anon key to `.env.local`

## Deployment

### Docker

```bash
# Build the image
docker build -t supabase-auth-starter .

# Run the container
docker run -p 3000:3000 --env-file .env supabase-auth-starter
```

### Vercel + Supabase (Recommended)

```bash
npm install -g vercel
vercel --prod
```

Configure environment variables in Vercel dashboard.

## Development Guide

### Customizing the Login Page

Edit `app/login/page.js`:

```javascript
export default function LoginPage() {
    const handleLogin = async (email, password) => {
        const { user, error } = await supabase.auth.signInWithPassword({
            email, password
        });
    };
    // Add error handling, loading states, redirects
}
```

### Adding Protected Routes

```javascript
import { supabase } from '../lib/supabase';

export async function getServerSideProps({ req }) {
    const { user } = await supabase.auth.api.getUserByCookie(req);
    if (!user) return { redirect: { destination: '/login' } };
    return { props: { user } };
}
```

### Code Style

- ESLint with recommended config
- Prettier for consistent formatting
- ES module syntax
- Run `npm run lint` before committing

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with Next.js, Supabase, and ❤️
</p>