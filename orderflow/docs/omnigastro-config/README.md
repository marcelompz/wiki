# OmniGastro Payment Routing Configuration - User Documentation

## Overview

The OmniGastro Payment Routing Configuration module allows OmniGastro system administrators to configure how payments are processed for restaurant tables and customer orders. This module provides flexibility to direct payments to either custom endpoints or Odoo integration based on specific tenant requirements.

## Key Features

### Payment Routing Options

1. **Custom Endpoint**
   - Route payments to any HTTP endpoint
   - Ideal for integrating with third-party payment processors
   - Full control over payment processing logic

2. **Odoo Integration**
   - Direct payments to Odoo POS system
   - Seamless integration with existing Odoo infrastructure
   - Standardized payment processing within Odoo ecosystem

### Configuration Access

**Main Configuration Page**: `/admin/omnigastro-payment-routing-config`

### User Roles and Permissions

| Role | Access Level | Permissions |
|------|-------------|-------------|
| Super Admin | Full Access | Configure all tenant payment routing |
| Tenant Admin | Tenant-specific | Configure payment routing for assigned tenants |

## Configuration Types

### 1. Custom Endpoint Configuration

**Purpose**: Route payments to custom payment processing systems

**Configuration Steps**:

1. Navigate to `/admin/omnigastro-payment-routing-config`
2. Select "Custom Endpoint" from the payment mode dropdown
3. Enter the custom endpoint URL
4. Configure any additional settings (API keys, authentication, etc.)
5. Save configuration

**Example Custom Endpoint Configuration**:

```json
{
  "paymentMode": "CUSTOM_ENDPOINT",
  "customEndpointUrl": "https://your-payment-processor.com/api/v1/payments",
  "authentication": {
    "type": "api_key",
    "apiKey": "your-api-key-here"
  },
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-token-here"
  }
}
```

### 2. Odoo Integration Configuration

**Purpose**: Route payments directly to Odoo POS system

**Configuration Steps**:

1. Navigate to `/admin/omnigastro-payment-routing-config`
2. Select "Odoo" from the payment mode dropdown
3. Enter the Odoo endpoint URL
4. Configure Odoo API integration settings
5. Save configuration

**Example Odoo Configuration**:

```json
{
  "paymentMode": "ODOO",
  "odooConfig": {
    "endpoint": "https://your-odoo-instance.com",
    "apiKey": "your-odoo-api-key",
    "timeout": 30000,
    "retryAttempts": 3
  }
}
```

## Technical Implementation

### API Endpoints

The module provides the following REST API endpoints:

#### Get Current Configuration
```http
GET /api/v1/omnigastro-config/payment-routing/tenant/{tenantId}
```

Response:
```json
{
  "success": true,
  "data": {
    "paymentMode": "CUSTOM_ENDPOINT",
    "customEndpointUrl": "https://your-custom-endpoint.com/api/v1/payments",
    "odooConfig": null
  }
}
```

#### Set Configuration
```http
POST /api/v1/omnigastro-config/payment-routing/tenant/{tenantId}
```

Request:
```json
{
  "paymentMode": "ODOO",
  "odooConfig": {
    "endpoint": "https://your-odoo-instance.com",
    "apiKey": "your-odoo-api-key"
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Configuration saved successfully"
}
```

### Configuration Validation

#### URL Validation
- All endpoint URLs must be valid HTTP/HTTPS URLs
- Format validation ensures proper URL structure
- Custom error messages for invalid URLs

#### Authentication Validation
- API keys must be provided for authentication
- OAuth tokens may be required for some integrations
- Connection testing available for external endpoints

### Error Handling

#### Common Error Messages

1. **Invalid URL**: "Please enter a valid URL for the payment endpoint"
2. **Missing API Key**: "API key is required for Odoo integration"
3   **Connection Error**: "Unable to connect to the payment endpoint. Please check the URL and try again"

#### Troubleshooting

1. **Endpoint Not Responding**: Verify the endpoint URL and ensure it's accessible
2. **Authentication Failed**: Check API key validity and permissions
3. **Validation Error**: Ensure all required fields are properly configured

## Integration with OmniGastro Systems

### POS Integration

The payment routing configuration integrates with:

- **OmniPOS System**: Direct integration with POS cash drawers
- **KDS (Kitchen Display System)**: Payment routing for kitchen orders
- **Mobile Applications**: Waiter and customer-facing apps
- **Online Ordering**: Web-based ordering systems

### Data Flow

1. **Order Creation**: New orders are created with payment routing information
2. **Payment Processing**: Payments are routed according to configured settings
3. **Transaction Logging**: All payment transactions are logged for audit trails
4. **Reporting**: Payment reports include routing information for analysis

## Administration Tasks

### Regular Maintenance

1. **Configuration Review**: Regularly review payment routing configurations
2. **Endpoint Testing**: Test custom endpoints to ensure connectivity
3. **API Key Management**: Update API keys when necessary
4. **Monitoring**: Monitor payment processing for issues

### Security Considerations

1. **API Key Protection**: Never expose API keys in configuration
2. **Access Control**: Limit configuration access to authorized users
3. **Encryption**: Use HTTPS for all payment endpoints
4. **Backup**: Regularly backup configuration settings

## Example Use Cases

### Restaurant Chain with Multiple Locations

A restaurant chain can configure different payment processors for different locations:

- **Headquarters**: Custom endpoint for centralized payment processing
- **Downtown Branch**: Odoo integration for legacy system compatibility
- **Airport Location**: Third-party payment processor for high-volume transactions

### Specialty Restaurant

A specialty restaurant with delivery service can configure:

- **Pickup Orders**: Custom endpoint for quick processing
- **Delivery Orders**: Odoo integration for inventory management
- **Catering Services**: Custom endpoint for B2B transactions

## Technical Specifications

### API Specifications

#### Request/Response Format

**Request Headers**:
- `Content-Type`: application/json
- `Authorization`: Bearer token (if required)
- `X-API-Key`: API key (if required)

**Response Codes**:
- `200 OK`: Successful configuration
- `400 Bad Request`: Invalid configuration
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Database Schema

#### Configuration Storage

The module stores configuration in the database:

- **Tenant ID**: Unique identifier for the tenant
- **Payment Mode**: Either "CUSTOM_ENDPOINT" or "ODOO"
- **Configuration Data**: JSON structure containing endpoint details
- **Metadata**: Creation and modification timestamps
- **Status**: Active/inactive configuration status

### Performance Considerations

#### Response Times
- **Configuration Lookup**: < 10ms
- **Configuration Update**: < 50ms
    ### Error Handling

#### Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| 400 | Invalid configuration | Check URL format and required fields |
| 401 | Authentication failed | Verify API key and permissions |
| 403 | Access denied | Check user permissions |
| 404 | Configuration not found | Create new configuration |
| 500 | Server error | Contact system administrator |

### Monitoring and Alert0246_SPA: #omnigastro-configuration ```
# OmniGastro Payment Routing Configuration

## Overview

The OmniGastro Payment Routing Configuration module provides a flexible system for configuring payment routing options for Omnigastro tenants. This module allows tenants to configure payment routing to either custom endpoints or Odoo integration based on their specific business needs.

## Key Features

### Payment Routing Options

1. **Custom Endpoint**: Route payments to any HTTP endpoint
2. **Odoo Integration**: Route payments to Odoo POS system

### Configuration Access

**Main Configuration Page**: `/admin/omnigastro-payment-routing-config`

### User Roles and Permissions

| Role | Access Level | Permissions |
|------|-------------|-------------|
| Super Admin | Full Access | Configure all tenant payment routing |
| Tenant Admin | Tenant-specific | Configure payment routing for assigned tenants |

## Configuration Guide

### Getting Started

1. **Navigate to Configuration Page**: Go to `/admin/omnigastro-payment-routing-config`
2. **Select Payment Mode**: Choose between "Custom Endpoint" or "Odoo"
3. **Configure Settings**: Enter required configuration details
4. **Save Configuration**: Click "Save" to apply changes

### Custom Endpoint Configuration

#### Steps:
1. Select "Custom Endpoint" from the payment mode dropdown
2. Enter the custom endpoint URL in the "Custom Endpoint URL" field
3. Configure any additional authentication settings (if required)
4. Click "Save" to complete the configuration

#### Example:
```json
{
  "paymentMode": "CUSTOM_ENDPOINT",
  "customEndpointUrl": "https://your-custom-endpoint.com/api/v1/payments",
  "authentication": {
    "type": "api_key",
    "apiKey": "your-api-key-here"
  }
}
```

### Odoo Integration Configuration

#### Steps:
1. Select "Odoo" from the payment mode dropdown
2. Enter the Odoo endpoint URL in the "Odoo Endpoint" field
3. Configure Odoo API key settings
4. Click "Save" to complete the configuration

#### Example:
```json
{
  "paymentMode": "ODOO",
  "odooConfig": {
    "endpoint": "https://your-odoo-instance.com",
    "apiKey": "your-odeadmin-api-key"
  }
}
```

## API Reference

### Get Current Configuration

#### Endpoint
```
GET /api/v1/omnigastro-config/payment-routing/tenant/{tenantId}
```

#### Response
```json
{
  "success": true,
  "data": {
    "paymentMode": "CUSTOM_ENDPOINT",
    "customEndpointUrl": "https://your-custom-endpoint.com/api/v1/payments",
    "odooConfig": null
  }
}
```

### Set Configuration

#### Endpoint
```
POST /api/v1/omnigastro-config/payment-routing/tenant/{tenantId}
```

#### Request Body
```json
{
  "paymentMode": "ODOO",
  "odooConfig": {
    "endpoint": "https://your-odoo-instance.com",
    "apiKey": "your-odoo-api-key"
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Configuration saved successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid configuration",
  "message": "Please enter a valid URL for the payment endpoint"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Please provide valid authentication credentials"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied",
  "message": "You do not have permission to configure payment routing"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Configuration not found",
  "message": "No payment routing configuration found for this tenant"
}
```

## Technical Specifications

### API Specifications

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer your-token-here
X-API-Key: your-api-key-here
```

#### Response Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid configuration |
| 401 | Authentication failed |
| 403 | Access denied |
| 404 | Configuration not found |
| 500 | Server error |

### Database Schema

The module stores configuration in the following database structure:

#### PaymentRoutingConfig Table
| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier |
| tenantId | String | Tenant identifier |
| paymentMode | String | Payment mode (CUSTOM_ENDPOINT or ODOO) |
| customEndpointUrl | String | Custom endpoint URL (nullable) |
| odooEndpoint | String | Odoo endpoint URL (nullable) |
| odooApiKey | String | Odoo API key (nullable) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| isActive | Boolean | Configuration active status |

### Configuration Examples

#### Custom Endpoint Example
```json
{
  "paymentMode": "CUSTOM_ENDPOINT",
  "customEndpointUrl": "https://your-payment-processor.com/api/v1/payments",
  "authentication": {
    "type": "api_key",
    "apiKey": "your-api-key-here"
  },
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-token-here"
  }
}
```

#### Odoo Integration Example
```json
{
  "paymentMode": "ODOO",
  "odooConfig": {
    "endpoint": "https://your-odoo-instance.com",
    "apiKey": "your-odoo-api-key"
  }
}
```

## Integration with OmniGastro Systems

### POS Integration

The payment routing configuration integrates with:

- **OmniPOS System**: Direct integration with POS cash drawers
- **KDS (Kitchen Display System)**: Payment routing for kitchen orders
- **Mobile Applications**: Waiter and customer-facing apps
- **Online Ordering**: Web-based ordering systems

### Data Flow

1. **Order Creation**: New orders are created with payment routing information
2. **Payment Processing**: Payments are routed according to configured settings
3. **Transaction Logging**: All payment transactions are logged for audit trails
4. **Reporting**: Payment reports include routing information for analysis

## Administration Tasks

### Regular Maintenance

1. **Configuration Review**: Regularly review payment routing configurations
2. **Endpoint Testing**: Test custom endpoints to ensure connectivity
3. **API Key Management**: Update API keys when necessary
4. **Monitoring**: Monitor payment processing for issues

### Security Considerations

1. **API Key Protection**: Never expose API keys in configuration
2. **Access Control**: Limit configuration access to authorized users
3. **Encryption**: Use HTTPS for all payment endpoints
4. **Backup**: Regularly backup configuration settings

## Common Troubleshooting

### Configuration Issues

#### Invalid URL
**Problem**: Payment endpoint URL is not valid
**Solution**: Verify the URL format and ensure it's accessible

#### Authentication Failed
**Problem**: API key or authentication is invalid
**Solution**: Check API key validity and permissions

#### Connection Error
**Problem**: Unable to connect to payment endpoint
**Solution**: Check network connectivity and endpoint availability

### Error Messages

- **Invalid URL**: "Please enter a valid URL for the payment endpoint"
- **Missing API Key**: "API key is required for Odoo integration"
- **Connection Error**: "Unable to connect to the payment endpoint. Please check the URL and try again"

## Version and Compatibility

### Version
v1.39.6

### Compatible Systems
- **OmniFlow**: Compatible with all versions
- **Odoo**: Requires Odoo 14+ for full functionality
- **Third-party Payment Processors**: Compatible with standard API endpoints

## Migration Guide

### From Previous Versions
If upgrading from a previous version:

1. **Backup Current Configuration**: Export existing payment routing settings
2. **New Configuration Setup**: Configure new payment routing settings
3. **Testing**: Test configuration in staging environment
4. **Deployment**: Deploy to production environment

## Support

### Contact Information
For support with payment routing configuration:

- **Email**: support@orderflow.io
- **Documentation**: https://docs.orderflow.io/omnigastro-config
- **Forum**: https://forum.orderflow.io

### Common Issues and Solutions

1. **Payment routing not working**: Verify endpoint URLs and authentication
2. **Configuration not saved**: Check permissions and try again
3. **API errors**: Check API key validity and network connectivity

## Conclusion

The OmniGastro Payment Routing Configuration module provides a flexible and secure way to configure payment routing options for Omnigastro tenants. This module enables businesses to:

- Route payments to custom endpoints for specialized payment processing
- Integrate with Odoo POS for legacy system compatibility
- Configure tenant-specific payment routing settings
- Maintain security and authentication for payment processing
- Generate reports and analytics for payment routing

The module is designed to be user-friendly, secure, and scalable, providing comprehensive payment routing capabilities for all OmniGastro users.

---

*For more information, visit the official documentation at https://docs.orderflow.io/omnigastro-config*
