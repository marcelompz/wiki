# Migration Guide for Existing Tenants

## Overview

This guide describes the changes introduced in version **1.39.6** and how existing tenants should migrate to ensure compatibility with the new payment routing configuration.

## Changes in v1.39.6

### 1. Payment Routing Configuration
- **New Module**: `omnigastro-config` module with 5 API endpoints for configuration management
- **Backend Endpoints**:
  - `POST /api/v1/omnigastro-payment-routing-config` - Configure payment routing (custom endpoint or Odoo)
  - `GET /api/v1/omnigastro-payment-routing-config` - Retrieve current payment routing configuration
  - `PUT /api/v1/omnigastro-payment-routing-config` - Update payment routing configuration
  - `DELETE /api/v1/omnigastro-payment-routing-config` - Remove payment routing configuration
  - `GET /api/v1/omnigastro-payment-routing-config/tenants/{tenantId}` - Get tenant-specific routing configuration

### 2. Tenant-Specific Configuration
- Each tenant can now define its own payment routing strategy
- Configurable between custom endpoint and Odoo-based routing
- Settings include:
  - Custom payment gateway endpoints
  - Currency and tax configurations
  - Fallback routing rules
  - Rate limiting and fraud prevention

### 3. Migration Steps

#### Step 1: Backup Current Configuration
- Export current payment routing settings from Odoo
- Document tenant-specific routing rules

#### Step 2: Deploy v1.39.6
- Run `./scripts/init.sh` to deploy the new module
- Verify all 5 payment routing endpoints are accessible

#### Step 3: Update Tenant Configurations
- For each tenant, configure the payment routing endpoint in the admin panel
- Choose between custom endpoint or Odoo integration
- Test routing behavior with sample transactions

#### Step 4: Validate Endpoints
- Test all 5 payment routing endpoints with various scenarios
- Verify Odoo integration works correctly
- Check that fallback mechanisms trigger appropriately

### 4. Important Notes

- **Backward Compatibility**: Existing tenants can continue using the old routing until they update their configuration
- **Data Consistency**: The migration preserves all existing tenant data; no data loss occurs
- **Rollback**: If issues arise, revert to v1.39.5 using `git checkout v1.39.5`
- **Support**: Contact support if tenants encounter configuration conflicts

## Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/omnigastro-payment-routing-config` | POST | Configure payment routing |
| `/api/v1/omnigastro-payment-routing-config` | GET | Retrieve current configuration |
| `/api/v1/omnigastro-payment-routing-config` | PUT | Update configuration |
| `/api/v1/omnigastro-payment-routing-config` | DELETE | Remove configuration |
| `/api/v1/omnigastro-payment-routing-config/tenants/{tenantId}` | GET | Get tenant-specific config |

## Troubleshooting

- **Endpoint 404**: Ensure the tenant ID is correct and the configuration module is loaded
- **Permission Errors**: Super Admin privileges required for configuration changes
- **Odoo Sync Issues**: Verify Odoo version compatibility (requires Odoo 14+)