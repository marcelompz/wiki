# Plan 2: Schema Splitting - Implementation Summary

## Overview
Split the current `backend/prisma/schema.prisma` (4471 lines, 161 models, 56 enums) into multiple domain-specific files for better maintainability and modularity.

## Requirements

### 1. Directory Structure
- `base.prisma`: generator and datasource
- `platform/`: tenant, auth/RBAC, audit, billing, provisioning
- `commerce/`: catalog, orders, payments
- `pos/`: POS, restaurant, KDS, OmniGastro
- `inventory/`: warehouses, stock, purchases, suppliers
- `crm/`: contacts, loyalty, birthdays, retention, marketing
- `hr/`: employees, positions, attendance, payroll, tips
- `fiscal/`: Facturasend, Tango, FX
- `modules/`: giveaways, bio links, NFC, quotations
- `intel/` + `omnichannel/`: analytics, market intel, channels, bots, conversations

### 2. Migration Script
Create a script that:
- Moves schema.prisma to the new directory structure
- Preserves all Prisma-specific annotations (`@map`, `@@map`, `@@unique`, `@@index`)
- Handles indentation and code formatting
- Does not modify model definitions, relationships, or enum values
- Validates equivalence between original and new schema

### 3. Validation Steps
- `prisma validate` on the new schema
- `prisma format` on the new schema
- `migrate diff` between original and new (must be empty)
- Regenerate Prisma client
- Compile TypeScript

### 4. Update References
Update configuration files:
- Dockerfile
- entrypoint.sh
- nest-cli.json
- deploy-production.sh
- package.json
- CI configuration

### 5. Standalone Schema Handling
- Remove duplicate models from standalone schemas (Option A)
- Add drift checks in CI for shared models
- Ensure standalone schemas remain functional

## Current Issues Found During Phase 0A

### Schema/Database Drift Issues
1. **Missing Table**: `omnigastro_settings` table exists in schema but not in database
2. **Missing Unique Constraint**: `table_guests` table lacks `@unique([tenantId, tableId, seatNumber])` constraint
3. **Different Structure**: `table_guests` has different structure in database vs schema

### Unresolved Tasks
1. **Prisma CLI Not Available**: Cannot run `prisma validate`/`prisma format`/`migrate diff` locally
2. **Database Access**: Limited access to `provecchio.local` for comprehensive testing
3. **Plan 3**: Relationship diagram creation requires Prisma CLI for parsing

## Immediate Actions Required

### Phase 0B - Complete Baseline
1. **Fix Schema/Database Drift**:
   - Create migration for `omnigastro_settings` table
   - Add unique constraint to `table_guests` table
   - Verify other schema/database discrepancies

2. **Harden Deployment**:
   - Remove `|| true` from `entrypoint.sh`
   - Replace `db push --accept-data-loss` in provisioning scripts
   - Enlarge `.dockerignore` to reduce build context size

3. **Create Baseline Migration**:
   - Generate baseline migration using `migrate diff --from-empty --to-url`
   - Test both paths: existing DB + `migrate resolve --applied`, empty DB + `migrate deploy`

### Plan 3 - Create Relationship Diagram
1. **Install Prisma CLI**: `npm install prisma@^5.0.0` in backend directory
2. **Run Validation**: `prisma validate` + `prisma format`
3. **Parse Schema**: Read core and standalone schemas
4. **Generate Diagram**: Create domain-level relationship diagram
5. **Export Documentation**: Save diagram as markdown/PlantUML file

### Plan 2 - Split Schema
1. **Create Migration Script**: Implement script to split schema into domain files
2. **Run Validation**: Ensure schema equivalence
3. **Update References**: Update all configuration files
4. **Test**: Verify functionality after schema split

## Files Created

### Directory Structure
- `backend/prisma/`
  - `platform/` (to be populated)
  - `commerce/` (to be populated)
  - `pos/` (to be populated)
  - `inventory/` (to be populated)
  - `crm/` (to be populated)
  - `hr/` (to be populated)
  - `fiscal/` (to be populated)
  - `modules/` (to be populated)
  - `intel/` (to be populated)
  - `omnichannel/` (to be populated)
  - `base.prisma` (to be created)

## Status

### Completed
- [x] Created directory structure
- [x] Plan 1 - Schema review completed
- [x] Phase 0A - Diagnostics completed
- [x] Phase 0B - Baseline preparation completed (documentation)

### In Progress
- [ ] Plan 3 - Relationship diagram creation (requires Prisma CLI)
- [ ] Plan 2 - Schema splitting (requires validation tools)

### Blocked On
- Prisma CLI installation and validation
- Production database access for comprehensive testing
- Existing build artifacts and dependencies

## Next Steps

1. **Install Prisma CLI** in the backend directory
2. **Run schema validation** on current schema
3. **Create migration script** for schema splitting
4. **Execute schema split** with validation
5. **Update all references** to new schema locations
6. **Run comprehensive tests** to verify functionality
7. **Update documentation** and create relationship diagrams

## Risk Mitigation

### Technical Risks
1. **Schema drift errors**: Implement comprehensive validation before and after split
2. **Client regeneration failures**: Test client generation after split
3. **Build context issues**: Update `.dockerignore` to exclude unnecessary files

### Timeline Risks
1. **Tool dependency delays**: Prepare alternative validation methods if Prisma CLI is unavailable
2. **Testing limitations**: Document testing limitations and create manual validation procedures
3. **Dependency conflicts**: Ensure all related tools and dependencies are compatible

## Conclusion

The schema splitting project requires systematic execution of Plan 3 (relationship diagram), Phase 0B (baseline), and Plan 2 (schema split). Key challenges include tool availability and database access. The current implementation has addressed documentation and planning, but actual schema manipulation requires additional tooling and environment setup.

All gates for Phase 0B have been documented and understood, and the next phase requires available tooling to proceed with schema splitting and relationship diagram creation.
