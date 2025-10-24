# User Guide

This comprehensive guide covers how to use the QuickBase Codepage Development Platform for creating, testing, and deploying codepages.

## 👥 User Roles

The platform supports different user roles with varying levels of access:

- **Admin**: Full system access, user management, system configuration
- **Manager**: Schema management, project oversight, analytics access
- **Developer**: Codepage development, testing, deployment
- **User**: Read-only access, basic codepage execution

## 🚀 Getting Started

### First Login

1. **Access the Platform**
   - Navigate to http://localhost:3000 (or your configured URL)
   - You'll see the login screen

2. **Create Account** (First time setup)
   - Click "Register" if no admin account exists
   - Fill in your details:
     - Full Name
     - Email Address
     - Password (minimum 8 characters)
     - Role (Admin for first user)

3. **Login**
   - Enter your email and password
   - Click "Sign In"
   - You'll be redirected to the dashboard

### Dashboard Overview

The dashboard provides:
- **Recent Projects**: Your latest codepage projects
- **Quick Actions**: Create new project, access templates
- **System Status**: Health indicators and notifications
- **Analytics**: Usage statistics and performance metrics

## 📝 Creating Codepages

### Starting a New Project

1. **Create Project**
   - Click "New Project" on the dashboard
   - Choose from available templates:
     - **Pricing Calculator**: Vehicle pricing with options
     - **Inventory Manager**: Stock management system
     - **Customer Form**: Data collection forms
     - **Custom**: Start from scratch

2. **Project Configuration**
   - **Name**: Descriptive project name
   - **Description**: Brief explanation of functionality
   - **Template**: Selected template (if any)
   - **Collaborators**: Add team members (optional)

3. **Project Creation**
   - Click "Create Project"
   - You'll be taken to the code editor

### Using the Code Editor

#### Editor Features

- **Syntax Highlighting**: JavaScript syntax coloring
- **Auto-completion**: QuickBase API methods and properties
- **Error Detection**: Real-time syntax error highlighting
- **Code Folding**: Collapse/expand code sections
- **Find/Replace**: Search and replace functionality
- **Multiple Tabs**: Work on multiple files

#### QuickBase API Integration

The platform provides a global `QB` object with QuickBase functionality:

```javascript
// Get a single record
const record = await QB.getRecord('customers', recordId);

// Query multiple records
const records = await QB.queryRecords('vehicles', {
  where: "{status.EX.'Available'}",
  select: [3, 6, 7, 8], // Field IDs
  sortBy: [{fieldId: 3, order: 'ASC'}]
});

// Create a new record
const newRecord = await QB.createRecord('quotes', {
  6: { value: 'John Doe' },        // Customer Name
  7: { value: 'john@example.com' }, // Email
  8: { value: 25000 }              // Quote Amount
});

// Update existing record
await QB.updateRecord('quotes', recordId, {
  8: { value: 26500 }  // Updated quote amount
});
```

#### Template Examples

**Pricing Calculator Template**
```javascript
async function calculateVehiclePrice(vehicleId, selectedOptions = []) {
  try {
    // Get base vehicle information
    const vehicle = await QB.getRecord('vehicles', vehicleId, [3, 6, 7, 8]);
    const basePrice = vehicle[8].value; // Base price field
    
    // Get available options for this vehicle
    const options = await QB.queryRecords('vehicle_options', {
      where: `{vehicle_id.EX.${vehicleId}}`,
      select: [3, 6, 7] // Option name, price, category
    });
    
    // Calculate total with selected options
    let totalPrice = basePrice;
    let selectedOptionsDetails = [];
    
    for (const optionId of selectedOptions) {
      const option = options.find(opt => opt[3].value === optionId);
      if (option) {
        totalPrice += option[6].value; // Option price
        selectedOptionsDetails.push({
          name: option[3].value,
          price: option[6].value,
          category: option[7].value
        });
      }
    }
    
    // Apply any applicable discounts
    const discount = await calculateDiscount(vehicle, totalPrice);
    const finalPrice = totalPrice - discount;
    
    // Save quote to QuickBase
    const quote = await QB.createRecord('quotes', {
      6: { value: vehicle[3].value },    // Vehicle name
      7: { value: basePrice },          // Base price
      8: { value: totalPrice },         // Total before discount
      9: { value: discount },           // Discount amount
      10: { value: finalPrice },        // Final price
      11: { value: JSON.stringify(selectedOptionsDetails) } // Options details
    });
    
    return {
      success: true,
      data: {
        vehicleId,
        basePrice,
        selectedOptions: selectedOptionsDetails,
        totalPrice,
        discount,
        finalPrice,
        quoteId: quote.id
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function for discount calculation
async function calculateDiscount(vehicle, totalPrice) {
  // Get active promotions
  const promotions = await QB.queryRecords('promotions', {
    where: "{active.EX.true}",
    select: [3, 6, 7, 8] // Name, type, value, conditions
  });
  
  let totalDiscount = 0;
  
  for (const promo of promotions) {
    const discountType = promo[6].value; // 'percentage' or 'fixed'
    const discountValue = promo[7].value;
    const conditions = JSON.parse(promo[8].value || '{}');
    
    // Check if promotion applies to this vehicle
    if (checkPromotionConditions(vehicle, conditions)) {
      if (discountType === 'percentage') {
        totalDiscount += (totalPrice * discountValue / 100);
      } else if (discountType === 'fixed') {
        totalDiscount += discountValue;
      }
    }
  }
  
  return Math.min(totalDiscount, totalPrice * 0.3); // Max 30% discount
}

function checkPromotionConditions(vehicle, conditions) {
  // Implement your business logic for promotion conditions
  // Example: check vehicle make, model, year, etc.
  return true; // Simplified for example
}

// Export the main function
return calculateVehiclePrice;
```

### Saving and Version Control

#### Auto-Save
- Code is automatically saved every 30 seconds
- Manual save: `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac)
- Save indicator shows current save status

#### Version History
- Each save creates a new version
- Access version history from the sidebar
- Compare versions to see changes
- Revert to previous versions if needed

#### Collaboration
- Real-time collaboration with team members
- See who's currently editing
- Conflict resolution for simultaneous edits
- Comment system for code review

## 🧪 Testing Codepages

### Test Environment

The platform provides a secure sandbox for testing:
- **Isolated Execution**: No impact on production data
- **Mock Data**: Use test data sets
- **Performance Monitoring**: Track execution time and memory usage
- **Error Capture**: Detailed error reporting with stack traces

### Running Tests

1. **Prepare Test Data**
   - Click "Test Data" tab
   - Configure input parameters
   - Set up mock QuickBase records

2. **Execute Test**
   - Click "Run Test" button
   - Monitor execution progress
   - Review results and performance metrics

3. **Analyze Results**
   - Check output data
   - Review API calls made
   - Examine performance metrics
   - Fix any errors found

#### Test Configuration

```javascript
// Example test configuration
const testConfig = {
  // Input parameters for your codepage
  input: {
    vehicleId: "test_vehicle_123",
    customerId: "test_customer_456",
    selectedOptions: ["option_1", "option_2"]
  },
  
  // Mock data for QuickBase records
  mockData: {
    vehicles: [
      {
        id: "test_vehicle_123",
        fields: {
          3: { value: "2024 Honda Accord" },
          6: { value: "Honda" },
          7: { value: "Accord" },
          8: { value: 28000 }
        }
      }
    ],
    vehicle_options: [
      {
        id: "option_1",
        fields: {
          3: { value: "Sunroof" },
          6: { value: 1200 },
          7: { value: "Exterior" }
        }
      }
    ]
  },
  
  // Expected output for validation
  expected: {
    success: true,
    finalPrice: 29200
  }
};
```

### Test Results

Test results include:
- **Execution Status**: Success/failure
- **Output Data**: Returned values
- **Performance Metrics**: 
  - Execution time
  - Memory usage
  - API call count
- **Error Details**: Stack traces and error messages
- **API Call Log**: All QuickBase API interactions

## 🚀 Deploying Codepages

### Deployment Process

1. **Pre-deployment Checks**
   - All tests must pass
   - Code review completed (if required)
   - Performance metrics acceptable

2. **Choose Environment**
   - **Development**: For testing and iteration
   - **Staging**: For user acceptance testing
   - **Production**: For live use

3. **Deploy**
   - Click "Deploy" button
   - Select target environment
   - Add deployment notes
   - Confirm deployment

4. **Monitor Deployment**
   - Track deployment progress
   - Verify successful deployment
   - Test in target environment

### Rollback Procedures

If issues occur after deployment:

1. **Immediate Rollback**
   - Click "Rollback" in deployment history
   - Select previous stable version
   - Confirm rollback action

2. **Verify Rollback**
   - Test functionality in target environment
   - Check that issues are resolved
   - Monitor system stability

## 📊 Schema Management

### Accessing Schema Manager

**Requirements**: Manager or Admin role

1. **Navigate to Schema**
   - Click "Schema" in the main navigation
   - You'll see the current application structure

2. **View Tables and Fields**
   - Browse existing tables
   - View field definitions and relationships
   - Check data types and constraints

### Managing Tables

#### Creating Tables

1. **Add New Table**
   - Click "Add Table" button
   - Configure table properties:
     - **Name**: Table name
     - **Description**: Purpose and usage
     - **Permissions**: Access control settings

2. **Define Fields**
   - Add fields with appropriate types:
     - Text, Number, Date, Currency
     - Choice lists, Checkboxes
     - File attachments, URLs
   - Set field properties:
     - Required/Optional
     - Unique constraints
     - Default values
     - Validation rules

#### Managing Relationships

1. **Create Relationships**
   - Select parent and child tables
   - Define relationship type (one-to-many, many-to-many)
   - Configure lookup fields automatically

2. **Relationship Types**
   - **One-to-Many**: Customer → Orders
   - **Many-to-Many**: Products ↔ Categories (via junction table)
   - **Lookup Fields**: Display related data

### Schema Change Management

#### Change Tracking
- All schema changes are logged
- Track who made changes and when
- View change history and details
- Audit trail for compliance

#### Approval Workflow
- Schema changes can require approval
- Configure approval rules by role
- Email notifications for pending approvals
- Rollback capabilities for approved changes

## 📈 Analytics and Monitoring

### Performance Dashboard

**Access**: Manager or Admin role

1. **System Metrics**
   - Server performance indicators
   - Database connection status
   - API response times
   - Error rates and trends

2. **Usage Analytics**
   - Active users and sessions
   - Most used codepages
   - Performance bottlenecks
   - Resource utilization

### Codepage Analytics

1. **Execution Metrics**
   - Average execution time
   - Memory usage patterns
   - API call frequency
   - Error occurrence rates

2. **Usage Patterns**
   - Most frequently executed codepages
   - Peak usage times
   - User adoption rates
   - Feature utilization

### Audit Logs

1. **User Activities**
   - Login/logout events
   - Codepage modifications
   - Deployment activities
   - Schema changes

2. **System Events**
   - Server starts/stops
   - Configuration changes
   - Error occurrences
   - Performance alerts

## 🔧 User Settings

### Profile Management

1. **Access Settings**
   - Click profile icon (top right)
   - Select "Settings"

2. **Update Profile**
   - Change name and email
   - Update password
   - Set notification preferences
   - Configure editor preferences

### Editor Preferences

- **Theme**: Light/Dark mode
- **Font Size**: Adjust for readability
- **Tab Size**: Indentation preferences
- **Auto-save**: Enable/disable auto-save
- **Syntax Highlighting**: Color scheme selection

### Notification Settings

- **Email Notifications**: 
  - Deployment status updates
  - Error alerts
  - Collaboration invites
  - System maintenance notices

- **In-app Notifications**:
  - Real-time collaboration updates
  - Test completion alerts
  - System status changes

## 🆘 Getting Help

### Built-in Help

1. **Tooltips and Hints**
   - Hover over UI elements for explanations
   - Context-sensitive help text
   - Keyboard shortcut reminders

2. **Documentation Links**
   - Quick access to relevant documentation
   - API reference integration
   - Example code snippets

### Support Resources

1. **Health Check**
   - System status indicators
   - Connectivity tests
   - Performance diagnostics

2. **Error Reporting**
   - Automatic error capture
   - Detailed error information
   - Steps to reproduce issues

3. **Contact Support**
   - Built-in support ticket system
   - Include system diagnostics
   - Attach relevant log files

## 💡 Best Practices

### Code Development

1. **Code Organization**
   - Use clear, descriptive function names
   - Add comments for complex logic
   - Break large functions into smaller ones
   - Follow consistent coding style

2. **Error Handling**
   ```javascript
   try {
     const result = await QB.getRecord('table', recordId);
     return { success: true, data: result };
   } catch (error) {
     console.error('Error fetching record:', error);
     return { success: false, error: error.message };
   }
   ```

3. **Performance Optimization**
   - Minimize API calls
   - Use batch operations when possible
   - Cache frequently accessed data
   - Implement proper error handling

### Testing Strategy

1. **Test Early and Often**
   - Test after each significant change
   - Use realistic test data
   - Test edge cases and error conditions
   - Validate performance requirements

2. **Test Data Management**
   - Use consistent test datasets
   - Document test scenarios
   - Clean up test data regularly
   - Separate test and production data

### Deployment Guidelines

1. **Pre-deployment Checklist**
   - [ ] All tests pass
   - [ ] Code review completed
   - [ ] Performance acceptable
   - [ ] Documentation updated
   - [ ] Rollback plan prepared

2. **Post-deployment Monitoring**
   - Monitor system performance
   - Check error rates
   - Validate functionality
   - Gather user feedback

---

For more information, see:
- [Installation Guide](INSTALLATION.md)
- [API Documentation](API.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Deployment Guide](DEPLOYMENT.md)