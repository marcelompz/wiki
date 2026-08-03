# Contributing to OrderFlow

Thank you for your interest in contributing to OrderFlow. This document provides guidelines and steps to help you contribute effectively.

---

## 1. Code of Conduct

By participating in this project, you agree to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## 2. Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker & Docker Compose** (for infrastructure)
- **PostgreSQL** >= 15.x (or use Docker)
- **Git**

### Clone and Setup

```bash
git clone https://github.com/marcelompz/orderflow.git
cd orderflow
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Database Setup

```bash
cd backend
npx prisma generate
npx prisma db push
cd ..
```

### Run Development Environment

```bash
docker compose up -d postgres redis
cd backend && npm run start:dev
cd ../frontend && npm run dev
```

Backend runs on `http://localhost:3010`, frontend on `http://localhost:3011`.

---

## 3. Project Structure

```
orderflow/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── common/       # Shared guards, decorators, services
│   │   ├── tenants/      # Multi-tenant logic
│   │   ├── products/     # Product catalog
│   │   ├── orders/       # Order management
│   │   ├── bookings/     # Appointments & scheduling
│   │   ├── integrations/ # External integrations (Odoo, Tango, etc.)
│   │   └── ...
│   ├── prisma/           # Database schema & migrations
│   └── test/             # Unit & E2E tests
├── frontend/             # React + Refine admin + public storefronts
├── mobile/               # React Native + Expo
├── desktop/              # Tauri POS
├── docs/                 # Documentation
├── scripts/              # Deploy, backup, QA scripts
└── docker-compose*.yml   # Dev / prod environments
```

---

## 4. Coding Standards

### TypeScript

- Strict mode enabled (`strict: true`)
- Use explicit types; avoid `any`
- Prefer `readonly` for immutable data
- Use `interface` for object shapes, `type` for unions/intersections

### NestJS Conventions

- One module per domain (`bookings/`, `products/`, etc.)
- Each module: `controller`, `service`, `module`, `dto/`
- Services are responsible for business logic
- Controllers are thin (parse DTOs, call service, return response)
- Use dependency injection; never instantiate `PrismaClient` manually

### Multi-Tenant Rules

- **Never remove `tenantId`** from queries or schema
- Always filter by `tenantId` in services
- Use `this.prisma` (singleton) or `@TenantPrisma()` (dynamic)
- Never condition business logic with `if (mode === 'enterprise')`

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(bookings): add Google Calendar sync
fix(billing): correct webhook signature validation
docs(README): update architecture diagram
test(orders): cover confirm() edge cases
```

---

## 5. Testing

- Run unit tests: `cd backend && npm test`
- Run E2E: `npm run test:e2e`
- Run full validation: `./scripts/init.sh`
- New features must include tests
- Aim for meaningful coverage, not just numbers

---

## 6. Pull Request Process

1. Create a branch from `main`: `feat/my-feature` or `fix/my-fix`
2. Make changes following the coding standards
3. Ensure tests pass: `npm test` and `./scripts/init.sh`
4. Update documentation if needed (`docs/`, `README.md`, `CHANGELOG.md`)
5. Update `featurelist.json` with your feature ID and status
6. Open a PR with:
   - Clear description of the change
   - Linked issue (if applicable)
   - Screenshots for UI changes
   - Test plan

**PR Checklist:**
- [ ] `npm run build` passes
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] `featurelist.json` updated
- [ ] No secrets committed
- [ ] `tenantId` preserved in all queries

---

## 7. Reporting Bugs

- Use GitHub Issues
- Include: OrderFlow version, environment (staging/production), steps to reproduce, expected vs actual behavior
- Attach logs if relevant

---

## 8. Feature Requests

- Open a GitHub Issue with label `enhancement`
- Describe the problem, proposed solution, and alternatives considered
- For large features, discuss in an issue first before implementing

---

## 9. License

By contributing, you agree that your contributions will be licensed under the MIT License.
