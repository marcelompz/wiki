# DEPLOYMENT PLAN: Redirect provecchio.local to New Schema Branch

## 🎯 Executive Summary

This deployment plan outlines the process to redirect provecchio.local from the current `main` branch deployment to the new `feat/schema-prisma-analysis-v3` schema analysis branch.

## 📋 Deployment Overview

### Objective
- Stop current localhost deployment
- Redirect provecchio.local to `/opt/orderflow-branch-schema-prisma`
- Deploy new schema structure with completed analysis and documentation
- Ensure zero downtime and data integrity

### Current State
- **Feature Branch**: `feat/schema-prisma-analysis-v3` (✅ SCHEMA ANALYSIS COMPLETE)
- **Production Branch**: `main` (currently deployed to localhost/provecchio.local)
- **Target**: Migrate deployment to new schema branch

## 🔄 Deployment Phases

### Phase 1: Pre-Deployment Preparation (15-30 minutes)

#### Tasks:
1. **Environment Backup**
   ```bash
   # Create backups of current environment
   cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
   cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
   ```

2. **Target Directory Validation**
   ```bash
   # Verify new branch has all required files
   ls -la /opt/orderflow-branch-schema-prisma/backend/prisma/
   test -f /opt/orderflow-branch-schema-prisma/backend/package.json
   test -f /opt/orderflow-branch-schema-prisma/backend/prisma/schema.prisma
   ```

3. **Dependency Verification**
   ```bash
   # Check if Prisma CLI is available in target branch
   cd /opt/orderflow-branch-schema-prisma/backend
   npm list prisma
   ```

### Phase 2: Stop Current Services (5-10 minutes)

#### Tasks:
1. **Graceful Shutdown**
   ```bash
   # Stop current deployment
   docker compose down
   
   # Verify all services are stopped
   docker ps --filter name=orderflow_ --format "table {{.Names}}\t{{.Status}}"
   ```

2. **Health Check Verification**
   ```bash
   # Ensure no services are accidentally left running
   if docker ps --filter name=orderflow_ --format "{{.Names}}" | grep -q .; then
       echo "ERROR: Some OrderFlow services are still running!"
       docker compose down --timeout 60
   fi
   ```

### Phase 3: Configuration Updates (10-15 minutes)

#### Tasks:
1. **Update Docker Compose**
   ```bash
   # Replace docker-compose with new branch version
   cp /opt/orderflow-branch-schema-prisma/docker-compose.yml .
   
   # Remove backup files after verification
   rm -f docker-compose.yml.backup.*
   ```

2. **Environment Configuration**
   ```bash
   # Create new environment file for new deployment
   cp /opt/orderflow-branch-schema-prisma/.env .env.new
   
   # Review and update if necessary
   nano .env.new
   ```

### Phase 4: New Deployment (20-30 minutes)

#### Tasks:
1. **Start New Deployment**
   ```bash
   # Start new deployment
   docker compose up -d
   
   # Wait for services to initialize
   sleep 30
   
   # Verify services are running
   docker ps --filter name=orderflow_ --format "table {{.Names}}\t{{.Status}}"
   ```

2. **Service Health Validation**
   ```bash
   # Check backend health
   for i in {1..30}; do
       if curl -f http://localhost:3010/api/v1/health; then
           echo "✅ Backend health check passed"
           break
       fi
       echo "⏳ Backend health check attempt $i/30"
       sleep 10
   done
   
   # Check frontend health
   for i in {1..30}; do
       if curl -f http://localhost:3000; then
           echo "✅ Frontend health check passed"
           break
       fi
       echo "⏳ Frontend health check attempt $i/30"
       sleep 10
   done
   ```

### Phase 5: Validation & Testing (15-20 minutes)

#### Tasks:
1. **Schema Validation**
   ```bash
   # Navigate to backend directory
   cd /opt/orderflow-branch-schema-prisma/backend
   
   # Validate Prisma schema
   npx prisma validate
   
   # Format schema if needed
   npx prisma format
   
   # Check for any validation errors
   echo "✅ Schema validation completed"
   ```

2. **Database Migration Test**
   ```bash
   # Test database migration (dry run)
   npx prisma migrate dev --create-only --skip-seed
   
   echo "✅ Database migration test completed"
   ```

3. **Integration Testing**
   ```bash
   # Run any integration tests if available
   if [ -f "package.json" ] && grep -q "test" package.json; then
       npm test -- --testPathPattern="integration"
   fi
   ```

## 🛡️ Risk Management

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Service Disruption | Medium | High | Comprehensive backup & rollback |
| Schema Migration Issues | Low | High | Dry-run testing, validation |
| Configuration Errors | Medium | Medium | Careful validation, testing |
| Database Connectivity | Low | High | Backup before changes |

### Mitigation Strategies

#### Technical Mitigation
1. **Backup Strategy**
   - Full backup of current environment
   - Database backup before any changes
   - Configuration backup before modifications

2. **Testing Strategy**
   - Dry-run migration testing
   - Health check validation
   - Integration testing

3. **Monitoring Strategy**
   - Real-time service health monitoring
   - Database connection monitoring
   - Resource utilization monitoring

#### Operational Mitigation
1. **Team Coordination**
   - Clear communication plan
   - Designated rollback authority
   - Stakeholder notification plan

2. **Timeline Management**
   - Off-peak deployment window
   - Gradual rollout approach
   - Rollback timeline defined

## 🔄 Rollback Procedures

### Immediate Rollback (if deployment fails)

#### Step 1: Detection
```bash
# Monitor deployment progress
watch -n 30 'docker ps --filter name=orderflow_ --format "{{.Names}}"

# If services fail to start or health checks fail:
if ! curl -f http://localhost:3010/api/v1/health; then
    echo "❌ Deployment detected as failed - initiating rollback"
    execute_rollback
fi
```

#### Step 2: Execute Rollback
```bash
function execute_rollback {
    echo "🔄 Starting deployment rollback..."
    
    # Stop current deployment
    docker compose down
    
    # Restore original configuration
    cp docker-compose.yml.backup.* docker-compose.yml
    cp .env.backup.* .env
    
    # Start original deployment
    docker compose up -d
    
    # Verify rollback success
    if curl -f http://localhost:3010/api/v1/health; then
        echo "✅ Rollback successful - services restored"
    else
        echo "❌ Rollback failed - manual intervention required"
        contact_emergency_team
    fi
}
```

#### Step 3: Post-Rollback Actions
```bash
# Document rollback reason
logger "Deployment rollback initiated: $ROLLBACK_REASON"

# Update deployment tracker
./scripts/update-deployment-status.sh --rollback

# Notify stakeholders
./scripts/notify-team.sh --deployment-rollback --reason="$ROLLBACK_REASON"
```

## 📊 Timeline & Milestones

### Deployment Timeline
- **T+00:00** - Phase 1 Complete
- **T+15:30** - Phase 2 Complete
- **T+25:00** - Phase 3 Complete
- **T+45:00** - Phase 4 Complete
- **T+60:00** - Phase 5 Complete

### Key Milestones
1. ✅ Schema analysis completed (`feat/schema-prisma-analysis-v3`)
2. ⏳ Environment preparation
3. ⏳ Service shutdown
4. ⏳ Configuration update
5. ⏳ New deployment
6. ⏳ Validation and testing

## 📋 Pre-Deployment Checklist

### Required Preparations
- [ ] Backup current environment
- [ ] Verify target directory structure
- [ ] Validate Prisma CLI installation
- [ ] Prepare rollback scripts
- [ ] Notify stakeholders
- [ ] Schedule deployment window

### Environment Validation
- [ ] DATABASE_URL configured correctly
- [ ] JWT_SECRET and other secrets set
- [ ] Network connectivity verified
- [ ] Resource availability confirmed

### Team Coordination
- [ ] Deployment team on standby
- [ ] Support team notified
- [ ] Emergency contact list updated
- [ ] Communication channels open

## 🚨 Critical Considerations

### Dependencies
- **OrderFlow Backend**: Port 3010
- **OrderFlow Frontend**: Port 3000
- **OrderFlow Database**: Port 5432
- **External Services**: ODOO, Redis, etc.

### Data Impact
- **Risk Level**: Medium
- **Data Sensitive**: Yes
- **Backup Required**: Yes
- **Recovery Time**: < 30 minutes

### User Impact
- **Service Disruption**: 30-60 minutes
- **User Notification**: Required
- **Rollback Window**: 15-30 minutes
- **Support Escalation**: Tier 1/2/3 prepared

## 📝 Next Steps

### Immediate Actions
1. **Review this plan** with technical team
2. **Get final authorization** for deployment execution
3. **Schedule deployment window** (recommended: maintenance window)
4. **Notify stakeholders** of deployment timeline
5. **Prepare rollback procedures**
6. **Execute deployment** according to this plan

### Post-Deployment
1. **Validate all services**
2. **Run integration tests**
3. **Monitor system performance**
4. **Update documentation**
5. **Conduct team debrief**

---

**⚠️ SAFETY NOTICE**: This deployment affects production services. Exercise extreme caution and ensure all preparations are complete before proceeding.

**Authorization Required**: Please confirm you want to proceed with this deployment plan and accept the associated risks.
