import { apiClient } from './apiClient';
import {
  CodepageTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  ApiResponse,
  SearchInput,
} from '../types/shared.js';

export class TemplateService {
  private basePath = '/templates';

  async getTemplates(params?: SearchInput): Promise<ApiResponse<CodepageTemplate[]>> {
    const response = await apiClient.get(this.basePath, { params });
    return response.data;
  }

  async getPublicTemplates(params?: SearchInput): Promise<ApiResponse<CodepageTemplate[]>> {
    const response = await apiClient.get(`${this.basePath}/public`, { params });
    return response.data;
  }

  async getTemplate(id: string): Promise<ApiResponse<CodepageTemplate>> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  async createTemplate(input: CreateTemplateInput): Promise<ApiResponse<CodepageTemplate>> {
    const response = await apiClient.post(this.basePath, input);
    return response.data;
  }

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<ApiResponse<CodepageTemplate>> {
    const response = await apiClient.patch(`${this.basePath}/${id}`, input);
    return response.data;
  }

  async deleteTemplate(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`${this.basePath}/${id}`);
    return response.data;
  }

  async getBuiltInTemplates(): Promise<ApiResponse<CodepageTemplate[]>> {
    const response = await apiClient.get(`${this.basePath}/built-in`);
    return response.data;
  }

  // Get pre-defined templates for common dealership use cases
  async getDealershipTemplates(): Promise<CodepageTemplate[]> {
    const builtInTemplates: CodepageTemplate[] = [
      {
        id: 'pricing-calculator',
        name: 'Vehicle Pricing Calculator',
        description: 'Interactive calculator for vehicle pricing with options, discounts, and financing calculations',
        category: 'calculator',
        code: `// Vehicle Pricing Calculator Template
// This template provides a foundation for building interactive vehicle pricing calculators

class VehiclePricingCalculator {
  constructor() {
    this.basePrice = 0;
    this.selectedOptions = [];
    this.discounts = [];
    this.taxRate = 0.08; // 8% default tax rate
    this.financeRate = 0.049; // 4.9% APR default
  }

  // Load vehicle data from QuickBase
  async loadVehicleData(vehicleId) {
    try {
      const vehicle = await QB.api.getRecord('vehicles', vehicleId);
      this.basePrice = vehicle.msrp || 0;
      return vehicle;
    } catch (error) {
      QB.ui.showMessage('Error loading vehicle data: ' + error.message, 'error');
      throw error;
    }
  }

  // Add option to the vehicle
  addOption(optionId, price) {
    this.selectedOptions.push({ id: optionId, price: price });
    this.updateTotal();
  }

  // Remove option from the vehicle
  removeOption(optionId) {
    this.selectedOptions = this.selectedOptions.filter(opt => opt.id !== optionId);
    this.updateTotal();
  }

  // Apply discount
  applyDiscount(type, amount) {
    this.discounts.push({ type: type, amount: amount });
    this.updateTotal();
  }

  // Calculate subtotal
  getSubtotal() {
    const optionsTotal = this.selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    const discountTotal = this.discounts.reduce((sum, disc) => sum + disc.amount, 0);
    return this.basePrice + optionsTotal - discountTotal;
  }

  // Calculate tax
  getTax() {
    return this.getSubtotal() * this.taxRate;
  }

  // Calculate total price
  getTotal() {
    return this.getSubtotal() + this.getTax();
  }

  // Calculate monthly payment
  calculateMonthlyPayment(downPayment = 0, termMonths = 60) {
    const loanAmount = this.getTotal() - downPayment;
    const monthlyRate = this.financeRate / 12;
    
    if (monthlyRate === 0) {
      return loanAmount / termMonths;
    }
    
    const payment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                   (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    return payment;
  }

  // Update the display
  updateTotal() {
    const subtotal = this.getSubtotal();
    const tax = this.getTax();
    const total = this.getTotal();
    
    // Update UI elements
    document.getElementById('subtotal').textContent = QB.utils.formatCurrency(subtotal);
    document.getElementById('tax').textContent = QB.utils.formatCurrency(tax);
    document.getElementById('total').textContent = QB.utils.formatCurrency(total);
  }

  // Save quote to QuickBase
  async saveQuote(customerInfo) {
    try {
      const quoteData = {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        vehicle_id: this.vehicleId,
        base_price: this.basePrice,
        options: JSON.stringify(this.selectedOptions),
        discounts: JSON.stringify(this.discounts),
        subtotal: this.getSubtotal(),
        tax: this.getTax(),
        total: this.getTotal(),
        created_date: new Date().toISOString()
      };
      
      const quote = await QB.api.createRecord('quotes', quoteData);
      QB.ui.showMessage('Quote saved successfully!', 'success');
      return quote;
    } catch (error) {
      QB.ui.showMessage('Error saving quote: ' + error.message, 'error');
      throw error;
    }
  }
}

// Initialize calculator when page loads
const calculator = new VehiclePricingCalculator();

// Example usage:
// calculator.loadVehicleData('VEHICLE_ID');
// calculator.addOption('leather_seats', 1500);
// calculator.applyDiscount('trade_in', 5000);`,
        dependencies: ['quickbase_codepage_hero.js'],
        configSchema: {
          type: 'object',
          properties: {
            taxRate: { type: 'number', default: 0.08 },
            financeRate: { type: 'number', default: 0.049 },
            vehicleTableId: { type: 'string' },
            quotesTableId: { type: 'string' }
          }
        },
        isPublic: true,
        authorId: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'inventory-manager',
        name: 'Inventory Management Dashboard',
        description: 'Dashboard for managing vehicle inventory with search, filters, and bulk operations',
        category: 'dashboard',
        code: `// Inventory Management Dashboard Template
// This template provides tools for managing vehicle inventory

class InventoryManager {
  constructor() {
    this.vehicles = [];
    this.filters = {};
    this.sortBy = 'year';
    this.sortOrder = 'desc';
  }

  // Load inventory from QuickBase
  async loadInventory() {
    try {
      const vehicles = await QB.api.getRecords('vehicles', {
        select: [3, 6, 7, 8, 9, 10], // Adjust field IDs as needed
        sortBy: [{ fieldId: 6, order: this.sortOrder }] // Sort by year
      });
      
      this.vehicles = vehicles;
      this.renderInventory();
      return vehicles;
    } catch (error) {
      QB.ui.showMessage('Error loading inventory: ' + error.message, 'error');
      throw error;
    }
  }

  // Apply filters to inventory
  applyFilters(filters) {
    this.filters = filters;
    this.renderInventory();
  }

  // Get filtered vehicles
  getFilteredVehicles() {
    return this.vehicles.filter(vehicle => {
      // Apply make filter
      if (this.filters.make && vehicle.make !== this.filters.make) {
        return false;
      }
      
      // Apply model filter
      if (this.filters.model && vehicle.model !== this.filters.model) {
        return false;
      }
      
      // Apply year range filter
      if (this.filters.yearMin && vehicle.year < this.filters.yearMin) {
        return false;
      }
      if (this.filters.yearMax && vehicle.year > this.filters.yearMax) {
        return false;
      }
      
      // Apply price range filter
      if (this.filters.priceMin && vehicle.price < this.filters.priceMin) {
        return false;
      }
      if (this.filters.priceMax && vehicle.price > this.filters.priceMax) {
        return false;
      }
      
      return true;
    });
  }

  // Render inventory table
  renderInventory() {
    const filteredVehicles = this.getFilteredVehicles();
    const tableBody = document.getElementById('inventory-table-body');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    filteredVehicles.forEach(vehicle => {
      const row = document.createElement('tr');
      row.innerHTML = \`
        <td><input type="checkbox" value="\${vehicle.id}" class="vehicle-checkbox"></td>
        <td>\${vehicle.year}</td>
        <td>\${vehicle.make}</td>
        <td>\${vehicle.model}</td>
        <td>\${vehicle.trim || ''}</td>
        <td>\${QB.utils.formatCurrency(vehicle.price)}</td>
        <td>\${vehicle.status}</td>
        <td>
          <button onclick="editVehicle('\${vehicle.id}')" class="btn-edit">Edit</button>
          <button onclick="deleteVehicle('\${vehicle.id}')" class="btn-delete">Delete</button>
        </td>
      \`;
      tableBody.appendChild(row);
    });
    
    // Update count
    const countElement = document.getElementById('vehicle-count');
    if (countElement) {
      countElement.textContent = \`Showing \${filteredVehicles.length} of \${this.vehicles.length} vehicles\`;
    }
  }

  // Update vehicle status
  async updateVehicleStatus(vehicleId, status) {
    try {
      await QB.api.updateRecord('vehicles', vehicleId, { status: status });
      
      // Update local data
      const vehicle = this.vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        vehicle.status = status;
        this.renderInventory();
      }
      
      QB.ui.showMessage('Vehicle status updated successfully', 'success');
    } catch (error) {
      QB.ui.showMessage('Error updating vehicle status: ' + error.message, 'error');
    }
  }

  // Bulk update selected vehicles
  async bulkUpdateStatus(status) {
    const checkboxes = document.querySelectorAll('.vehicle-checkbox:checked');
    const vehicleIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (vehicleIds.length === 0) {
      QB.ui.showMessage('Please select vehicles to update', 'warning');
      return;
    }
    
    try {
      const promises = vehicleIds.map(id => 
        QB.api.updateRecord('vehicles', id, { status: status })
      );
      
      await Promise.all(promises);
      
      // Update local data
      vehicleIds.forEach(id => {
        const vehicle = this.vehicles.find(v => v.id === id);
        if (vehicle) {
          vehicle.status = status;
        }
      });
      
      this.renderInventory();
      QB.ui.showMessage(\`Updated \${vehicleIds.length} vehicles successfully\`, 'success');
    } catch (error) {
      QB.ui.showMessage('Error updating vehicles: ' + error.message, 'error');
    }
  }

  // Export inventory to CSV
  exportToCSV() {
    const filteredVehicles = this.getFilteredVehicles();
    const headers = ['Year', 'Make', 'Model', 'Trim', 'Price', 'Status'];
    
    let csv = headers.join(',') + '\\n';
    
    filteredVehicles.forEach(vehicle => {
      const row = [
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim || '',
        vehicle.price,
        vehicle.status
      ];
      csv += row.map(field => \`"\${field}"\`).join(',') + '\\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// Initialize inventory manager
const inventoryManager = new InventoryManager();

// Load inventory on page load
inventoryManager.loadInventory();

// Global functions for button clicks
function editVehicle(vehicleId) {
  // Implement edit functionality
  QB.ui.showMessage('Edit functionality to be implemented', 'info');
}

function deleteVehicle(vehicleId) {
  if (confirm('Are you sure you want to delete this vehicle?')) {
    // Implement delete functionality
    QB.ui.showMessage('Delete functionality to be implemented', 'info');
  }
}`,
        dependencies: ['quickbase_codepage_hero.js'],
        configSchema: {
          type: 'object',
          properties: {
            vehicleTableId: { type: 'string' },
            statusOptions: { type: 'array', items: { type: 'string' } }
          }
        },
        isPublic: true,
        authorId: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'customer-form',
        name: 'Customer Information Form',
        description: 'Comprehensive customer intake form with validation and QuickBase integration',
        category: 'form',
        code: `// Customer Information Form Template
// This template provides a customer intake form with validation

class CustomerForm {
  constructor() {
    this.formData = {};
    this.validationRules = {
      firstName: { required: true, minLength: 2 },
      lastName: { required: true, minLength: 2 },
      email: { required: true, pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ },
      phone: { required: true, pattern: /^[\\d\\s\\-\\(\\)\\+]+$/ },
      address: { required: true },
      city: { required: true },
      state: { required: true },
      zipCode: { required: true, pattern: /^\\d{5}(-\\d{4})?$/ }
    };
  }

  // Initialize form
  init() {
    this.setupEventListeners();
    this.loadStates();
  }

  // Setup form event listeners
  setupEventListeners() {
    const form = document.getElementById('customer-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
      
      // Real-time validation
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', (e) => this.validateField(e.target));
        input.addEventListener('input', (e) => this.clearFieldError(e.target));
      });
    }
  }

  // Load states dropdown
  loadStates() {
    const stateSelect = document.getElementById('state');
    if (stateSelect) {
      const states = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
      ];
      
      states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
      });
    }
  }

  // Validate individual field
  validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const rules = this.validationRules[fieldName];
    
    if (!rules) return true;
    
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (rules.required && !value) {
      isValid = false;
      errorMessage = 'This field is required';
    }
    
    // Minimum length validation
    if (isValid && rules.minLength && value.length < rules.minLength) {
      isValid = false;
      errorMessage = \`Minimum length is \${rules.minLength} characters\`;
    }
    
    // Pattern validation
    if (isValid && rules.pattern && !rules.pattern.test(value)) {
      isValid = false;
      errorMessage = 'Please enter a valid format';
    }
    
    // Display validation result
    this.showFieldValidation(field, isValid, errorMessage);
    
    return isValid;
  }

  // Show field validation result
  showFieldValidation(field, isValid, errorMessage) {
    const errorElement = document.getElementById(\`\${field.name}-error\`);
    
    if (isValid) {
      field.classList.remove('error');
      field.classList.add('valid');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
      }
    } else {
      field.classList.remove('valid');
      field.classList.add('error');
      if (errorElement) {
        errorElement.textContent = errorMessage;
        errorElement.style.display = 'block';
      }
    }
  }

  // Clear field error
  clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = document.getElementById(\`\${field.name}-error\`);
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  // Validate entire form
  validateForm() {
    const form = document.getElementById('customer-form');
    const inputs = form.querySelectorAll('input[name], select[name], textarea[name]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  // Handle form submission
  async handleSubmit(event) {
    event.preventDefault();
    
    if (!this.validateForm()) {
      QB.ui.showMessage('Please correct the errors in the form', 'error');
      return;
    }
    
    // Collect form data
    const formData = new FormData(event.target);
    const customerData = {};
    
    for (let [key, value] of formData.entries()) {
      customerData[key] = value;
    }
    
    try {
      // Save to QuickBase
      const customer = await this.saveCustomer(customerData);
      QB.ui.showMessage('Customer information saved successfully!', 'success');
      
      // Reset form
      event.target.reset();
      this.clearAllValidation();
      
      return customer;
    } catch (error) {
      QB.ui.showMessage('Error saving customer: ' + error.message, 'error');
    }
  }

  // Save customer to QuickBase
  async saveCustomer(customerData) {
    const record = {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      city: customerData.city,
      state: customerData.state,
      zip_code: customerData.zipCode,
      date_created: new Date().toISOString(),
      notes: customerData.notes || ''
    };
    
    return await QB.api.createRecord('customers', record);
  }

  // Clear all validation styling
  clearAllValidation() {
    const form = document.getElementById('customer-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.classList.remove('error', 'valid');
    });
    
    const errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(element => {
      element.style.display = 'none';
    });
  }

  // Auto-populate from existing customer
  async loadCustomer(customerId) {
    try {
      const customer = await QB.api.getRecord('customers', customerId);
      
      // Populate form fields
      document.getElementById('firstName').value = customer.first_name || '';
      document.getElementById('lastName').value = customer.last_name || '';
      document.getElementById('email').value = customer.email || '';
      document.getElementById('phone').value = customer.phone || '';
      document.getElementById('address').value = customer.address || '';
      document.getElementById('city').value = customer.city || '';
      document.getElementById('state').value = customer.state || '';
      document.getElementById('zipCode').value = customer.zip_code || '';
      document.getElementById('notes').value = customer.notes || '';
      
      return customer;
    } catch (error) {
      QB.ui.showMessage('Error loading customer: ' + error.message, 'error');
      throw error;
    }
  }
}

// Initialize customer form
const customerForm = new CustomerForm();
customerForm.init();`,
        dependencies: ['quickbase_codepage_hero.js'],
        configSchema: {
          type: 'object',
          properties: {
            customerTableId: { type: 'string' },
            requiredFields: { type: 'array', items: { type: 'string' } }
          }
        },
        isPublic: true,
        authorId: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    return builtInTemplates;
  }
}

export const templateService = new TemplateService();