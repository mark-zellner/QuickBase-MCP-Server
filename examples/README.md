# QuickBase Codepage Examples

This directory contains production-ready example codepages that demonstrate various use cases and best practices for QuickBase application development.

## 📋 Examples Overview

### 1. 🚗 MyDealership.html
**AI-Powered Car Dealership Pricing Calculator**

- **Use Case**: Calculate car financing with MSRP, discounts, trade-ins, and interest rates
- **Features**:
  - Real-time pricing calculations
  - AI-powered deal optimization suggestions
  - QuickBase save functionality with Test Connection
  - Debug info panel for troubleshooting
  - Comprehensive error handling
- **QuickBase Integration**: 
  - Saves pricing calculations to Pricing Calculator table
  - Uses `qdb.api` for optimal performance
  - Includes connection testing
- **Table Fields Required**:
  - Field 7: MSRP (currency)
  - Field 8: Discount (currency)
  - Field 9: Financing Rate (percent)
  - Field 10: Trade-In Value (currency)
  - Field 11: Final Price (currency)
  - Field 12: Make (text)
  - Field 13: Model (text)

### 2. 📇 ContactManager.html
**Full-Featured Contact Management System**

- **Use Case**: Manage customer/client contacts with CRUD operations
- **Features**:
  - Add, edit, delete contacts
  - Real-time contact list display
  - Search and filter capabilities
  - Form validation
  - Responsive grid layout
- **QuickBase Integration**:
  - Full CRUD operations using `qdb.api`
  - Query records with filtering
  - Update existing records
  - Delete with confirmation
- **Table Fields Required**:
  - Field 6: First Name (text)
  - Field 7: Last Name (text)
  - Field 8: Email (email)
  - Field 9: Phone (phone)
  - Field 10: Company (text)
  - Field 11: Notes (multiline text)

### 3. 🧾 InvoiceGenerator.html
**Professional Invoice Creation Tool**

- **Use Case**: Generate detailed invoices with line items and automatic calculations
- **Features**:
  - Dynamic line item management
  - Automatic subtotal, tax, and total calculations
  - Client information management
  - Invoice numbering and dating
  - Multi-item support with quantity and pricing
- **QuickBase Integration**:
  - Saves complete invoice data
  - Stores line items as JSON
  - Automatic calculation of totals
- **Table Fields Required**:
  - Field 6: Invoice Number (text)
  - Field 7: Invoice Date (date)
  - Field 8: Due Date (date)
  - Field 9: Client Name (text)
  - Field 10: Client Email (email)
  - Field 11: Client Address (multiline text)
  - Field 12: Items (text - JSON array)
  - Field 13: Subtotal (currency)
  - Field 14: Tax (currency)
  - Field 15: Total (currency)

### 4. 📊 TaskDashboard.html
**Real-Time Analytics Dashboard with Charts**

- **Use Case**: Visualize task data with interactive charts and statistics
- **Features**:
  - Real-time data visualization using Chart.js
  - Status distribution (doughnut chart)
  - Priority breakdown (bar chart)
  - Live statistics (totals, completion rates)
  - Recent tasks list with filtering
  - Auto-refresh capability
- **QuickBase Integration**:
  - Queries task data in real-time
  - Aggregates statistics
  - Sorts and filters tasks
- **Table Fields Required**:
  - Field 6: Title (text)
  - Field 7: Status (choice: To Do, In Progress, Done)
  - Field 8: Priority (choice: High, Medium, Low)
  - Field 9: Assignee (text)
  - Field 10: Due Date (date)
- **External Libraries**: Chart.js for data visualization

## 🚀 Getting Started

### Prerequisites
- QuickBase account with application access
- Tables created with appropriate field types
- QuickBase user token or session authentication

### Setup Steps

1. **Choose an Example**: Select the codepage that matches your use case

2. **Update Configuration**: Edit the `CONFIG` object in each file:
   ```javascript
   const CONFIG = {
       tableId: 'your_table_id_here',  // Update this!
       fields: {
           fieldName: 6,  // Update field IDs
           // ...
       }
   };
   ```

3. **Create QuickBase Table**: Ensure your table has the required fields with correct types

4. **Deploy to QuickBase**:
   - Option A: Copy HTML to QuickBase Code Page
   - Option B: Use the CLI tool: `node cli.js deploy example.html --name "My App" --target-table "bxxxxxxx"`

5. **Test Functionality**: Open in QuickBase and test all features

## 📝 Field ID Reference

QuickBase uses numeric field IDs. Common system fields:
- **Field 3**: Record ID (auto-generated)
- **Field 4**: Date Created
- **Field 5**: Date Modified
- **Field 6+**: Your custom fields

To find field IDs:
1. Go to your table in QuickBase
2. Click "Table" → "Fields"
3. Note the Field ID (FID) for each field

## 🔧 Configuration Guide

### Required Environment Variables
```bash
QB_REALM=your-realm.quickbase.com
QB_USER_TOKEN=your_user_token_here
QB_APP_ID=your_app_id
```

### API Priority (Working Pattern from Deal Sheet)
```javascript
// 1. qdb.api (BEST - no CORS issues)
if (typeof qdb !== 'undefined' && qdb.api) {
    await qdb.api.addRecord(tableId, recordData);
}
// 2. QB.api (Alternative)
else if (typeof QB !== 'undefined' && QB.api) {
    await QB.api.addRecord(tableId, recordData);
}
// 3. Session client (May have CORS)
else if (typeof window.qbClient !== 'undefined') {
    await window.qbClient.post('records', {...});
}
```

## 🎨 Customization Tips

### Styling
- All examples use inline CSS for easy deployment
- Modify gradient colors in the `<style>` section
- Adjust responsive breakpoints in media queries

### Validation
- Add custom validation rules in form handlers
- Modify required fields in HTML and JavaScript
- Update error messages for your use case

### Features
- Add export functionality (CSV, PDF)
- Implement search and filtering
- Add batch operations
- Create custom reports

## 🧪 Testing

Each example includes:
- ✅ Form validation
- ✅ Error handling with user feedback
- ✅ QuickBase connection testing
- ✅ Debug logging to console
- ✅ Status messages for operations

### Test Checklist
- [ ] Configuration updated with correct table ID and field IDs
- [ ] QuickBase table exists with matching field types
- [ ] Form submission creates records successfully
- [ ] Data displays correctly in QuickBase
- [ ] Error messages display appropriately
- [ ] Responsive design works on mobile

## 📚 Best Practices

### Security
- ⚠️ **Never** hardcode user tokens in production
- ✅ Use QuickBase session authentication
- ✅ Validate all user inputs
- ✅ Sanitize data before display

### Performance
- ✅ Use `qdb.api` for best performance
- ✅ Implement pagination for large datasets
- ✅ Cache data when appropriate
- ✅ Minimize API calls with batching

### Error Handling
- ✅ Try/catch blocks around all API calls
- ✅ User-friendly error messages
- ✅ Console logging for debugging
- ✅ Fallback for missing APIs

### Code Quality
- ✅ Clear variable naming
- ✅ Comments for complex logic
- ✅ Consistent formatting
- ✅ Modular functions

## 🔍 Troubleshooting

### Common Issues

**1. "QuickBase API not available"**
- Solution: Ensure `qdb.js` CDN is loaded
- Check: Network tab in DevTools for script loading

**2. "Record not saved"**
- Check: Table ID is correct
- Check: Field IDs match your table structure
- Check: Data types match field types

**3. "CORS error"**
- Solution: Use `qdb.api` instead of session client
- Alternative: Add CORS headers if using external API

**4. "Validation failed"**
- Check: All required fields are filled
- Check: Data format matches field type (date, email, etc.)

### Debug Mode

Enable debug logging in any example:
```javascript
const DEBUG = true;

if (DEBUG) {
    console.log('[Debug] Available APIs:', {
        qdb: typeof qdb !== 'undefined',
        qdb_api: typeof qdb !== 'undefined' && qdb.api,
        QB: typeof QB !== 'undefined'
    });
}
```

## 🚀 Deployment

### Manual Deployment
1. Copy HTML content
2. Go to QuickBase → Files → Code Pages
3. Create new Code Page
4. Paste HTML
5. Save and test

### CLI Deployment
```bash
# Validate before deployment
node cli.js validate examples/ContactManager.html

# Deploy to QuickBase
node cli.js deploy examples/ContactManager.html \
  --name "Contact Manager" \
  --version "1.0.0" \
  --description "Full-featured contact management" \
  --tags "contacts,crm" \
  --target-table "bxxxxxxx"

# Search deployed codepages
node cli.js search "Contact Manager"

# Get specific codepage
node cli.js get 123

# Update existing codepage
node cli.js update 123 examples/ContactManager.html --version "1.1.0"
```

## 📖 Learning Resources

- [QuickBase API Documentation](https://developer.quickbase.com/)
- [QuickBase JavaScript SDK](https://github.com/QuickBase/quickbase-jssdk)
- [Chart.js Documentation](https://www.chartjs.org/) (for TaskDashboard)
- [AGENTS.md](../AGENTS.md) - Integration patterns and best practices

## 🤝 Contributing

To add new examples:
1. Follow existing code structure
2. Include comprehensive comments
3. Add configuration section at top
4. Document required fields
5. Test thoroughly
6. Update this README

## 📄 License

These examples are provided as-is for educational and development purposes. See [LICENSE](../LICENSE) for details.

---

**Need Help?** Check [TROUBLESHOOTING.md](../TROUBLESHOOTING_404.md) or review [AGENTS.md](../AGENTS.md) for detailed integration patterns.
