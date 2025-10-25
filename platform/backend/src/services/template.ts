import { z } from 'zod';

// Import shared types (will be available once shared package is properly linked)
// For now, we'll define local types that match the shared types
export enum TemplateCategory {
  CALCULATOR = 'calculator',
  FORM = 'form',
  DASHBOARD = 'dashboard',
  UTILITY = 'utility'
}

export interface CodepageTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  code: string;
  dependencies: string[];
  configSchema: Record<string, any>;
  isPublic: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateInput {
  name: string;
  description: string;
  category: TemplateCategory;
  code: string;
  dependencies?: string[];
  configSchema?: Record<string, any>;
  isPublic?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  code?: string;
  dependencies?: string[];
  configSchema?: Record<string, any>;
  isPublic?: boolean;
}

// Validation schemas
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  category: z.nativeEnum(TemplateCategory),
  code: z.string(),
  dependencies: z.array(z.string()).default([]),
  configSchema: z.record(z.any()).default({}),
  isPublic: z.boolean().default(false),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.nativeEnum(TemplateCategory).optional(),
  code: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  configSchema: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
});

export class TemplateService {
  private templates: Map<string, CodepageTemplate> = new Map();

  constructor() {
    // Initialize with pre-built dealership templates
    this.initializeDealershipTemplates();
  }

  private initializeDealershipTemplates(): void {
    // Pricing Calculator Template
    const pricingCalculatorTemplate: CodepageTemplate = {
      id: 'template-pricing-calculator',
      name: 'Vehicle Pricing Calculator',
      description: 'Interactive calculator for vehicle pricing with options, discounts, and financing calculations',
      category: TemplateCategory.CALCULATOR,
      code: this.getPricingCalculatorCode(),
      dependencies: ['quickbase_codepage_hero.js'],
      configSchema: {
        type: 'object',
        properties: {
          basePrice: { type: 'number', description: 'Base vehicle price' },
          taxRate: { type: 'number', description: 'Tax rate percentage' },
          dealershipFee: { type: 'number', description: 'Dealership processing fee' },
          financingOptions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                term: { type: 'number', description: 'Loan term in months' },
                rate: { type: 'number', description: 'Interest rate percentage' }
              }
            }
          }
        }
      },
      isPublic: true,
      authorId: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Inventory Manager Template
    const inventoryManagerTemplate: CodepageTemplate = {
      id: 'template-inventory-manager',
      name: 'Vehicle Inventory Manager',
      description: 'Manage vehicle inventory with real-time updates, search, and filtering capabilities',
      category: TemplateCategory.DASHBOARD,
      code: this.getInventoryManagerCode(),
      dependencies: ['quickbase_codepage_hero.js'],
      configSchema: {
        type: 'object',
        properties: {
          inventoryTableId: { type: 'string', description: 'QuickBase table ID for inventory' },
          statusFieldId: { type: 'number', description: 'Field ID for vehicle status' },
          priceFieldId: { type: 'number', description: 'Field ID for vehicle price' },
          makeFieldId: { type: 'number', description: 'Field ID for vehicle make' },
          modelFieldId: { type: 'number', description: 'Field ID for vehicle model' }
        }
      },
      isPublic: true,
      authorId: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Customer Form Template
    const customerFormTemplate: CodepageTemplate = {
      id: 'template-customer-form',
      name: 'Customer Information Form',
      description: 'Comprehensive customer intake form with validation and QuickBase integration',
      category: TemplateCategory.FORM,
      code: this.getCustomerFormCode(),
      dependencies: ['quickbase_codepage_hero.js'],
      configSchema: {
        type: 'object',
        properties: {
          customerTableId: { type: 'string', description: 'QuickBase table ID for customers' },
          nameFieldId: { type: 'number', description: 'Field ID for customer name' },
          emailFieldId: { type: 'number', description: 'Field ID for customer email' },
          phoneFieldId: { type: 'number', description: 'Field ID for customer phone' },
          addressFieldId: { type: 'number', description: 'Field ID for customer address' }
        }
      },
      isPublic: true,
      authorId: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store templates
    this.templates.set(pricingCalculatorTemplate.id, pricingCalculatorTemplate);
    this.templates.set(inventoryManagerTemplate.id, inventoryManagerTemplate);
    this.templates.set(customerFormTemplate.id, customerFormTemplate);

    console.log('📋 Initialized dealership templates:', this.templates.size);
  }

  private getPricingCalculatorCode(): string {
    return `// Vehicle Pricing Calculator Template
// Automatically includes CDN Hero library

class VehiclePricingCalculator {
  constructor(config) {
    this.config = config;
    this.basePrice = config.basePrice || 25000;
    this.taxRate = config.taxRate || 0.08;
    this.dealershipFee = config.dealershipFee || 500;
    this.financingOptions = config.financingOptions || [
      { term: 36, rate: 0.045 },
      { term: 48, rate: 0.055 },
      { term: 60, rate: 0.065 }
    ];
    
    this.selectedOptions = [];
    this.selectedDiscounts = [];
    
    this.init();
  }
  
  init() {
    this.createCalculatorUI();
    this.bindEvents();
    console.log('Vehicle Pricing Calculator initialized');
  }
  
  createCalculatorUI() {
    const container = document.getElementById('calculator-container') || document.body;
    
    container.innerHTML = \`
      <div class="pricing-calculator">
        <h2>Vehicle Pricing Calculator</h2>
        
        <div class="price-section">
          <h3>Base Price: $<span id="base-price">\${this.basePrice.toLocaleString()}</span></h3>
        </div>
        
        <div class="options-section">
          <h3>Options & Packages</h3>
          <div id="options-list">
            <label><input type="checkbox" data-option="premium-package" data-price="2500"> Premium Package (+$2,500)</label>
            <label><input type="checkbox" data-option="navigation" data-price="1200"> Navigation System (+$1,200)</label>
            <label><input type="checkbox" data-option="sunroof" data-price="800"> Sunroof (+$800)</label>
            <label><input type="checkbox" data-option="leather" data-price="1500"> Leather Seats (+$1,500)</label>
          </div>
        </div>
        
        <div class="discounts-section">
          <h3>Discounts & Incentives</h3>
          <div id="discounts-list">
            <label><input type="checkbox" data-discount="loyalty" data-amount="1000"> Loyalty Discount (-$1,000)</label>
            <label><input type="checkbox" data-discount="trade-in" data-amount="3000"> Trade-in Credit (-$3,000)</label>
            <label><input type="checkbox" data-discount="military" data-amount="500"> Military Discount (-$500)</label>
          </div>
        </div>
        
        <div class="financing-section">
          <h3>Financing Options</h3>
          <select id="financing-term">
            <option value="">Select financing term</option>
            \${this.financingOptions.map(option => 
              \`<option value="\${option.term}" data-rate="\${option.rate}">\${option.term} months @ \${(option.rate * 100).toFixed(1)}% APR</option>\`
            ).join('')}
          </select>
        </div>
        
        <div class="total-section">
          <h2>Total Price: $<span id="total-price">\${this.basePrice.toLocaleString()}</span></h2>
          <div id="monthly-payment" style="display: none;">
            <h3>Monthly Payment: $<span id="payment-amount">0</span></h3>
          </div>
        </div>
        
        <div class="actions-section">
          <button id="save-quote" class="btn-primary">Save Quote</button>
          <button id="print-quote" class="btn-secondary">Print Quote</button>
        </div>
      </div>
    \`;
  }
  
  bindEvents() {
    // Option checkboxes
    document.querySelectorAll('[data-option]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateCalculation());
    });
    
    // Discount checkboxes
    document.querySelectorAll('[data-discount]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateCalculation());
    });
    
    // Financing dropdown
    document.getElementById('financing-term').addEventListener('change', () => this.updateCalculation());
    
    // Action buttons
    document.getElementById('save-quote').addEventListener('click', () => this.saveQuote());
    document.getElementById('print-quote').addEventListener('click', () => this.printQuote());
  }
  
  updateCalculation() {
    let totalPrice = this.basePrice;
    
    // Add selected options
    this.selectedOptions = [];
    document.querySelectorAll('[data-option]:checked').forEach(checkbox => {
      const price = parseInt(checkbox.dataset.price);
      totalPrice += price;
      this.selectedOptions.push({
        name: checkbox.dataset.option,
        price: price
      });
    });
    
    // Apply discounts
    this.selectedDiscounts = [];
    document.querySelectorAll('[data-discount]:checked').forEach(checkbox => {
      const amount = parseInt(checkbox.dataset.amount);
      totalPrice -= amount;
      this.selectedDiscounts.push({
        name: checkbox.dataset.discount,
        amount: amount
      });
    });
    
    // Add tax and fees
    const subtotal = totalPrice;
    const tax = subtotal * this.taxRate;
    totalPrice = subtotal + tax + this.dealershipFee;
    
    // Update display
    document.getElementById('total-price').textContent = totalPrice.toLocaleString();
    
    // Calculate monthly payment if financing selected
    const financingSelect = document.getElementById('financing-term');
    if (financingSelect.value) {
      const term = parseInt(financingSelect.value);
      const rate = parseFloat(financingSelect.selectedOptions[0].dataset.rate);
      const monthlyPayment = this.calculateMonthlyPayment(totalPrice, rate, term);
      
      document.getElementById('payment-amount').textContent = monthlyPayment.toLocaleString();
      document.getElementById('monthly-payment').style.display = 'block';
    } else {
      document.getElementById('monthly-payment').style.display = 'none';
    }
  }
  
  calculateMonthlyPayment(principal, annualRate, termMonths) {
    const monthlyRate = annualRate / 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                   (Math.pow(1 + monthlyRate, termMonths) - 1);
    return Math.round(payment);
  }
  
  async saveQuote() {
    const quoteData = {
      basePrice: this.basePrice,
      options: this.selectedOptions,
      discounts: this.selectedDiscounts,
      totalPrice: document.getElementById('total-price').textContent,
      monthlyPayment: document.getElementById('payment-amount').textContent,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Save to QuickBase using Hero library
      if (typeof QB !== 'undefined') {
        await QB.api.createRecord({
          tableId: 'quotes_table_id', // Configure this in template settings
          fields: {
            'quote_data': { value: JSON.stringify(quoteData) },
            'customer_id': { value: 'current_customer_id' }, // Get from context
            'total_price': { value: quoteData.totalPrice }
          }
        });
        
        alert('Quote saved successfully!');
      } else {
        console.log('Quote data:', quoteData);
        alert('Quote saved locally (QuickBase not available)');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Error saving quote. Please try again.');
    }
  }
  
  printQuote() {
    window.print();
  }
}

// Initialize calculator when page loads
QB.on('ready', function() {
  const calculator = new VehiclePricingCalculator({
    basePrice: 25000,
    taxRate: 0.08,
    dealershipFee: 500
  });
});

// Fallback initialization if QB not available
if (typeof QB === 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    const calculator = new VehiclePricingCalculator({
      basePrice: 25000,
      taxRate: 0.08,
      dealershipFee: 500
    });
  });
}`;
  }

  private getInventoryManagerCode(): string {
    return `// Vehicle Inventory Manager Template
// Automatically includes CDN Hero library

class VehicleInventoryManager {
  constructor(config) {
    this.config = config;
    this.inventoryTableId = config.inventoryTableId;
    this.vehicles = [];
    this.filteredVehicles = [];
    this.currentFilters = {};
    
    this.init();
  }
  
  async init() {
    this.createInventoryUI();
    this.bindEvents();
    await this.loadInventory();
    console.log('Vehicle Inventory Manager initialized');
  }
  
  createInventoryUI() {
    const container = document.getElementById('inventory-container') || document.body;
    
    container.innerHTML = \`
      <div class="inventory-manager">
        <h2>Vehicle Inventory Manager</h2>
        
        <div class="controls-section">
          <div class="search-controls">
            <input type="text" id="search-input" placeholder="Search vehicles...">
            <button id="search-btn">Search</button>
          </div>
          
          <div class="filter-controls">
            <select id="make-filter">
              <option value="">All Makes</option>
            </select>
            <select id="status-filter">
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="pending">Pending</option>
            </select>
            <select id="price-filter">
              <option value="">All Prices</option>
              <option value="0-25000">Under $25,000</option>
              <option value="25000-50000">$25,000 - $50,000</option>
              <option value="50000-999999">Over $50,000</option>
            </select>
          </div>
          
          <div class="action-controls">
            <button id="add-vehicle" class="btn-primary">Add Vehicle</button>
            <button id="refresh-inventory" class="btn-secondary">Refresh</button>
          </div>
        </div>
        
        <div class="inventory-stats">
          <div class="stat-card">
            <h3 id="total-vehicles">0</h3>
            <p>Total Vehicles</p>
          </div>
          <div class="stat-card">
            <h3 id="available-vehicles">0</h3>
            <p>Available</p>
          </div>
          <div class="stat-card">
            <h3 id="sold-vehicles">0</h3>
            <p>Sold</p>
          </div>
        </div>
        
        <div class="inventory-grid" id="inventory-grid">
          <!-- Vehicle cards will be populated here -->
        </div>
        
        <div id="vehicle-modal" class="modal" style="display: none;">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Vehicle Details</h3>
            <div id="vehicle-details"></div>
          </div>
        </div>
      </div>
    \`;
  }
  
  bindEvents() {
    // Search functionality
    document.getElementById('search-input').addEventListener('input', () => this.applyFilters());
    document.getElementById('search-btn').addEventListener('click', () => this.applyFilters());
    
    // Filter dropdowns
    document.getElementById('make-filter').addEventListener('change', () => this.applyFilters());
    document.getElementById('status-filter').addEventListener('change', () => this.applyFilters());
    document.getElementById('price-filter').addEventListener('change', () => this.applyFilters());
    
    // Action buttons
    document.getElementById('add-vehicle').addEventListener('click', () => this.showAddVehicleForm());
    document.getElementById('refresh-inventory').addEventListener('click', () => this.loadInventory());
    
    // Modal close
    document.querySelector('.close').addEventListener('click', () => this.closeModal());
  }
  
  async loadInventory() {
    try {
      if (typeof QB !== 'undefined' && this.inventoryTableId) {
        const response = await QB.api.queryRecords({
          tableId: this.inventoryTableId,
          select: [
            this.config.makeFieldId,
            this.config.modelFieldId,
            this.config.priceFieldId,
            this.config.statusFieldId
          ]
        });
        
        this.vehicles = response.data.map(record => ({
          id: record[3].value, // Record ID
          make: record[this.config.makeFieldId]?.value || 'Unknown',
          model: record[this.config.modelFieldId]?.value || 'Unknown',
          price: record[this.config.priceFieldId]?.value || 0,
          status: record[this.config.statusFieldId]?.value || 'available'
        }));
      } else {
        // Sample data for development
        this.vehicles = [
          { id: 1, make: 'Toyota', model: 'Camry', price: 28000, status: 'available' },
          { id: 2, make: 'Honda', model: 'Accord', price: 32000, status: 'available' },
          { id: 3, make: 'Ford', model: 'F-150', price: 45000, status: 'sold' },
          { id: 4, make: 'Chevrolet', model: 'Malibu', price: 26000, status: 'pending' }
        ];
      }
      
      this.populateMakeFilter();
      this.applyFilters();
      this.updateStats();
      
    } catch (error) {
      console.error('Error loading inventory:', error);
      alert('Error loading inventory data');
    }
  }
  
  populateMakeFilter() {
    const makeFilter = document.getElementById('make-filter');
    const makes = [...new Set(this.vehicles.map(v => v.make))].sort();
    
    // Clear existing options except "All Makes"
    makeFilter.innerHTML = '<option value="">All Makes</option>';
    
    makes.forEach(make => {
      const option = document.createElement('option');
      option.value = make;
      option.textContent = make;
      makeFilter.appendChild(option);
    });
  }
  
  applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const makeFilter = document.getElementById('make-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const priceFilter = document.getElementById('price-filter').value;
    
    this.filteredVehicles = this.vehicles.filter(vehicle => {
      // Search filter
      const matchesSearch = !searchTerm || 
        vehicle.make.toLowerCase().includes(searchTerm) ||
        vehicle.model.toLowerCase().includes(searchTerm);
      
      // Make filter
      const matchesMake = !makeFilter || vehicle.make === makeFilter;
      
      // Status filter
      const matchesStatus = !statusFilter || vehicle.status === statusFilter;
      
      // Price filter
      let matchesPrice = true;
      if (priceFilter) {
        const [min, max] = priceFilter.split('-').map(Number);
        matchesPrice = vehicle.price >= min && vehicle.price <= max;
      }
      
      return matchesSearch && matchesMake && matchesStatus && matchesPrice;
    });
    
    this.renderInventoryGrid();
  }
  
  renderInventoryGrid() {
    const grid = document.getElementById('inventory-grid');
    
    if (this.filteredVehicles.length === 0) {
      grid.innerHTML = '<p class="no-results">No vehicles found matching your criteria.</p>';
      return;
    }
    
    grid.innerHTML = this.filteredVehicles.map(vehicle => \`
      <div class="vehicle-card" data-vehicle-id="\${vehicle.id}">
        <div class="vehicle-info">
          <h4>\${vehicle.make} \${vehicle.model}</h4>
          <p class="price">$\${vehicle.price.toLocaleString()}</p>
          <p class="status status-\${vehicle.status}">\${vehicle.status.toUpperCase()}</p>
        </div>
        <div class="vehicle-actions">
          <button onclick="inventoryManager.viewVehicle(\${vehicle.id})" class="btn-view">View</button>
          <button onclick="inventoryManager.editVehicle(\${vehicle.id})" class="btn-edit">Edit</button>
        </div>
      </div>
    \`).join('');
  }
  
  updateStats() {
    document.getElementById('total-vehicles').textContent = this.vehicles.length;
    document.getElementById('available-vehicles').textContent = 
      this.vehicles.filter(v => v.status === 'available').length;
    document.getElementById('sold-vehicles').textContent = 
      this.vehicles.filter(v => v.status === 'sold').length;
  }
  
  viewVehicle(vehicleId) {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      document.getElementById('vehicle-details').innerHTML = \`
        <p><strong>Make:</strong> \${vehicle.make}</p>
        <p><strong>Model:</strong> \${vehicle.model}</p>
        <p><strong>Price:</strong> $\${vehicle.price.toLocaleString()}</p>
        <p><strong>Status:</strong> \${vehicle.status}</p>
      \`;
      document.getElementById('vehicle-modal').style.display = 'block';
    }
  }
  
  editVehicle(vehicleId) {
    // Implementation for editing vehicle
    console.log('Edit vehicle:', vehicleId);
  }
  
  showAddVehicleForm() {
    // Implementation for adding new vehicle
    console.log('Add new vehicle');
  }
  
  closeModal() {
    document.getElementById('vehicle-modal').style.display = 'none';
  }
}

// Global reference for event handlers
let inventoryManager;

// Initialize inventory manager when page loads
QB.on('ready', function() {
  inventoryManager = new VehicleInventoryManager({
    inventoryTableId: 'your_inventory_table_id', // Configure this
    makeFieldId: 6,
    modelFieldId: 7,
    priceFieldId: 8,
    statusFieldId: 9
  });
});

// Fallback initialization if QB not available
if (typeof QB === 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    inventoryManager = new VehicleInventoryManager({
      inventoryTableId: null // Will use sample data
    });
  });
}`;
  }

  private getCustomerFormCode(): string {
    return `// Customer Information Form Template
// Automatically includes CDN Hero library

class CustomerInformationForm {
  constructor(config) {
    this.config = config;
    this.customerTableId = config.customerTableId;
    this.formData = {};
    
    this.init();
  }
  
  init() {
    this.createFormUI();
    this.bindEvents();
    console.log('Customer Information Form initialized');
  }
  
  createFormUI() {
    const container = document.getElementById('customer-form-container') || document.body;
    
    container.innerHTML = \`
      <div class="customer-form">
        <h2>Customer Information</h2>
        
        <form id="customer-info-form">
          <div class="form-section">
            <h3>Personal Information</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="first-name">First Name *</label>
                <input type="text" id="first-name" name="firstName" required>
                <span class="error-message" id="first-name-error"></span>
              </div>
              
              <div class="form-group">
                <label for="last-name">Last Name *</label>
                <input type="text" id="last-name" name="lastName" required>
                <span class="error-message" id="last-name-error"></span>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="email">Email Address *</label>
                <input type="email" id="email" name="email" required>
                <span class="error-message" id="email-error"></span>
              </div>
              
              <div class="form-group">
                <label for="phone">Phone Number *</label>
                <input type="tel" id="phone" name="phone" required>
                <span class="error-message" id="phone-error"></span>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Address Information</h3>
            
            <div class="form-group">
              <label for="street-address">Street Address *</label>
              <input type="text" id="street-address" name="streetAddress" required>
              <span class="error-message" id="street-address-error"></span>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="city">City *</label>
                <input type="text" id="city" name="city" required>
                <span class="error-message" id="city-error"></span>
              </div>
              
              <div class="form-group">
                <label for="state">State *</label>
                <select id="state" name="state" required>
                  <option value="">Select State</option>
                  <option value="AL">Alabama</option>
                  <option value="AK">Alaska</option>
                  <option value="AZ">Arizona</option>
                  <!-- Add more states as needed -->
                </select>
                <span class="error-message" id="state-error"></span>
              </div>
              
              <div class="form-group">
                <label for="zip-code">ZIP Code *</label>
                <input type="text" id="zip-code" name="zipCode" pattern="[0-9]{5}(-[0-9]{4})?" required>
                <span class="error-message" id="zip-code-error"></span>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Vehicle Interest</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="vehicle-type">Vehicle Type</label>
                <select id="vehicle-type" name="vehicleType">
                  <option value="">Select Type</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="truck">Truck</option>
                  <option value="coupe">Coupe</option>
                  <option value="convertible">Convertible</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="budget-range">Budget Range</label>
                <select id="budget-range" name="budgetRange">
                  <option value="">Select Budget</option>
                  <option value="under-20k">Under $20,000</option>
                  <option value="20k-30k">$20,000 - $30,000</option>
                  <option value="30k-50k">$30,000 - $50,000</option>
                  <option value="over-50k">Over $50,000</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="financing-needed">
                <input type="checkbox" id="financing-needed" name="financingNeeded">
                Financing needed
              </label>
            </div>
            
            <div class="form-group">
              <label for="trade-in">
                <input type="checkbox" id="trade-in" name="tradeIn">
                Have trade-in vehicle
              </label>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Additional Information</h3>
            
            <div class="form-group">
              <label for="comments">Comments or Special Requests</label>
              <textarea id="comments" name="comments" rows="4" placeholder="Any additional information or special requests..."></textarea>
            </div>
            
            <div class="form-group">
              <label for="contact-preference">Preferred Contact Method</label>
              <div class="radio-group">
                <label><input type="radio" name="contactPreference" value="email"> Email</label>
                <label><input type="radio" name="contactPreference" value="phone"> Phone</label>
                <label><input type="radio" name="contactPreference" value="text"> Text Message</label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="marketing-consent">
                <input type="checkbox" id="marketing-consent" name="marketingConsent">
                I agree to receive marketing communications
              </label>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" id="save-draft" class="btn-secondary">Save Draft</button>
            <button type="submit" id="submit-form" class="btn-primary">Submit Information</button>
          </div>
        </form>
        
        <div id="form-status" class="status-message" style="display: none;"></div>
      </div>
    \`;
  }
  
  bindEvents() {
    const form = document.getElementById('customer-info-form');
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitForm();
    });
    
    // Save draft
    document.getElementById('save-draft').addEventListener('click', () => this.saveDraft());
    
    // Real-time validation
    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('input', () => this.clearFieldError(field));
    });
    
    // Phone number formatting
    document.getElementById('phone').addEventListener('input', (e) => {
      this.formatPhoneNumber(e.target);
    });
    
    // ZIP code validation
    document.getElementById('zip-code').addEventListener('input', (e) => {
      this.formatZipCode(e.target);
    });
  }
  
  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (field.required && !value) {
      isValid = false;
      errorMessage = 'This field is required';
    }
    
    // Specific field validations
    switch (fieldName) {
      case 'email':
        if (value && !this.isValidEmail(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address';
        }
        break;
        
      case 'phone':
        if (value && !this.isValidPhone(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid phone number';
        }
        break;
        
      case 'zipCode':
        if (value && !this.isValidZipCode(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid ZIP code';
        }
        break;
    }
    
    this.displayFieldError(field, isValid ? '' : errorMessage);
    return isValid;
  }
  
  validateForm() {
    const form = document.getElementById('customer-info-form');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  collectFormData() {
    const form = document.getElementById('customer-info-form');
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    // Handle checkboxes that might not be in FormData
    data.financingNeeded = document.getElementById('financing-needed').checked;
    data.tradeIn = document.getElementById('trade-in').checked;
    data.marketingConsent = document.getElementById('marketing-consent').checked;
    
    return data;
  }
  
  async submitForm() {
    if (!this.validateForm()) {
      this.showStatus('Please correct the errors above', 'error');
      return;
    }
    
    const formData = this.collectFormData();
    
    try {
      this.showStatus('Submitting customer information...', 'loading');
      
      if (typeof QB !== 'undefined' && this.customerTableId) {
        // Submit to QuickBase
        const response = await QB.api.createRecord({
          tableId: this.customerTableId,
          fields: {
            [this.config.nameFieldId]: { 
              value: \`\${formData.firstName} \${formData.lastName}\`
            },
            [this.config.emailFieldId]: { 
              value: formData.email 
            },
            [this.config.phoneFieldId]: { 
              value: formData.phone 
            },
            [this.config.addressFieldId]: { 
              value: \`\${formData.streetAddress}, \${formData.city}, \${formData.state} \${formData.zipCode}\`
            }
          }
        });
        
        this.showStatus('Customer information submitted successfully!', 'success');
        this.clearForm();
        
      } else {
        // Development mode - log data
        console.log('Customer form data:', formData);
        this.showStatus('Customer information saved locally (development mode)', 'success');
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      this.showStatus('Error submitting form. Please try again.', 'error');
    }
  }
  
  saveDraft() {
    const formData = this.collectFormData();
    localStorage.setItem('customerFormDraft', JSON.stringify(formData));
    this.showStatus('Draft saved successfully', 'success');
  }
  
  loadDraft() {
    const draft = localStorage.getItem('customerFormDraft');
    if (draft) {
      const formData = JSON.parse(draft);
      Object.keys(formData).forEach(key => {
        const field = document.querySelector(\`[name="\${key}"]\`);
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = formData[key];
          } else {
            field.value = formData[key];
          }
        }
      });
    }
  }
  
  clearForm() {
    document.getElementById('customer-info-form').reset();
    this.clearAllErrors();
    localStorage.removeItem('customerFormDraft');
  }
  
  // Utility methods
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  isValidPhone(phone) {
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  }
  
  isValidZipCode(zip) {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zip);
  }
  
  formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 6) {
      value = \`(\${value.slice(0, 3)}) \${value.slice(3, 6)}-\${value.slice(6, 10)}\`;
    } else if (value.length >= 3) {
      value = \`(\${value.slice(0, 3)}) \${value.slice(3)}\`;
    }
    input.value = value;
  }
  
  formatZipCode(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 5) {
      value = \`\${value.slice(0, 5)}-\${value.slice(5, 9)}\`;
    }
    input.value = value;
  }
  
  displayFieldError(field, message) {
    const errorElement = document.getElementById(\`\${field.id}-error\`);
    if (errorElement) {
      errorElement.textContent = message;
      field.classList.toggle('error', !!message);
    }
  }
  
  clearFieldError(field) {
    this.displayFieldError(field, '');
  }
  
  clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  }
  
  showStatus(message, type) {
    const statusElement = document.getElementById('form-status');
    statusElement.textContent = message;
    statusElement.className = \`status-message \${type}\`;
    statusElement.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize customer form when page loads
QB.on('ready', function() {
  const customerForm = new CustomerInformationForm({
    customerTableId: 'your_customer_table_id', // Configure this
    nameFieldId: 6,
    emailFieldId: 7,
    phoneFieldId: 8,
    addressFieldId: 9
  });
  
  // Load any saved draft
  customerForm.loadDraft();
});

// Fallback initialization if QB not available
if (typeof QB === 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    const customerForm = new CustomerInformationForm({
      customerTableId: null // Will use console logging
    });
    
    // Load any saved draft
    customerForm.loadDraft();
  });
}`;
  }

  // Template CRUD operations

  async createTemplate(input: CreateTemplateInput, authorId: string): Promise<CodepageTemplate> {
    const template: CodepageTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: input.name,
      description: input.description,
      category: input.category,
      code: input.code,
      dependencies: input.dependencies || [],
      configSchema: input.configSchema || {},
      isPublic: input.isPublic || false,
      authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    return template;
  }

  async getTemplate(templateId: string): Promise<CodepageTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getAllTemplates(): Promise<CodepageTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getPublicTemplates(): Promise<CodepageTemplate[]> {
    return Array.from(this.templates.values()).filter(template => template.isPublic);
  }

  async getTemplatesByCategory(category: TemplateCategory): Promise<CodepageTemplate[]> {
    return Array.from(this.templates.values()).filter(template => template.category === category);
  }

  async getUserTemplates(userId: string): Promise<CodepageTemplate[]> {
    return Array.from(this.templates.values()).filter(template => template.authorId === userId);
  }

  async updateTemplate(templateId: string, input: UpdateTemplateInput, userId: string): Promise<CodepageTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if user has permission to update
    if (template.authorId !== userId) {
      throw new Error('Insufficient permissions to update template');
    }

    // Update template properties
    if (input.name !== undefined) template.name = input.name;
    if (input.description !== undefined) template.description = input.description;
    if (input.category !== undefined) template.category = input.category;
    if (input.code !== undefined) template.code = input.code;
    if (input.dependencies !== undefined) template.dependencies = input.dependencies;
    if (input.configSchema !== undefined) template.configSchema = input.configSchema;
    if (input.isPublic !== undefined) template.isPublic = input.isPublic;
    template.updatedAt = new Date();

    return template;
  }

  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if user has permission to delete
    if (template.authorId !== userId) {
      throw new Error('Insufficient permissions to delete template');
    }

    this.templates.delete(templateId);
  }

  async searchTemplates(query: string, category?: TemplateCategory): Promise<CodepageTemplate[]> {
    let templates = Array.from(this.templates.values());

    // Filter by category if specified
    if (category) {
      templates = templates.filter(template => template.category === category);
    }

    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery)
      );
    }

    return templates;
  }

  // Integration with QuickBase MCP Server for template storage

  async saveTemplateToQuickBase(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    try {
      // This would use the QuickBase MCP server's codepage methods
      // For now, we'll simulate the storage
      console.log(`📋 Saving template "${template.name}" to QuickBase:`, {
        id: template.id,
        name: template.name,
        category: template.category,
        codeLength: template.code.length
      });

      // In a real implementation, this would call:
      // await quickbaseMCPClient.saveCodepage({
      //   tableId: 'templates_table_id',
      //   name: template.name,
      //   code: template.code
      // });

    } catch (error) {
      console.error('Error saving template to QuickBase:', error);
      throw new Error('Failed to save template to QuickBase');
    }
  }

  async loadTemplateFromQuickBase(codepageId: string): Promise<CodepageTemplate | null> {
    try {
      // This would use the QuickBase MCP server's codepage methods
      // For now, we'll simulate the retrieval
      console.log(`📋 Loading template from QuickBase codepage ID: ${codepageId}`);

      // In a real implementation, this would call:
      // const codepage = await quickbaseMCPClient.getCodepage({
      //   tableId: 'templates_table_id',
      //   recordId: codepageId
      // });

      // For now, return null to indicate not found
      return null;

    } catch (error) {
      console.error('Error loading template from QuickBase:', error);
      throw new Error('Failed to load template from QuickBase');
    }
  }

  // Template validation and processing

  validateTemplateCode(code: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic JavaScript syntax validation
    try {
      new Function(code);
    } catch (error) {
      errors.push(`Syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check for required CDN Hero integration
    if (!code.includes('QB.on') && !code.includes('typeof QB')) {
      warnings.push('Template should include QuickBase Hero library integration');
    }

    // Check for basic structure
    if (!code.includes('class ') && !code.includes('function ')) {
      warnings.push('Template should define at least one class or function');
    }

    // Check for console.log (warning only)
    if (code.includes('console.log')) {
      warnings.push('Template contains console.log statements - consider removing for production');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  processTemplateCode(code: string, config: Record<string, any> = {}): string {
    let processedCode = code;

    // Inject CDN Hero library if not already present
    if (!processedCode.includes('quickbase_codepage_hero.js')) {
      const heroScript = `
// Auto-injected CDN Hero library
if (typeof QB === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://your-cdn.com/quickbase_codepage_hero.js';
  document.head.appendChild(script);
}

`;
      processedCode = heroScript + processedCode;
    }

    // Replace configuration placeholders
    Object.keys(config).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = typeof config[key] === 'string' ? `'${config[key]}'` : config[key];
      processedCode = processedCode.replace(new RegExp(placeholder, 'g'), value);
    });

    return processedCode;
  }

  getTemplateStats(): {
    totalTemplates: number;
    publicTemplates: number;
    categoryCounts: Record<TemplateCategory, number>;
  } {
    const templates = Array.from(this.templates.values());
    const categoryCounts = {
      [TemplateCategory.CALCULATOR]: 0,
      [TemplateCategory.FORM]: 0,
      [TemplateCategory.DASHBOARD]: 0,
      [TemplateCategory.UTILITY]: 0,
    };

    templates.forEach(template => {
      categoryCounts[template.category]++;
    });

    return {
      totalTemplates: templates.length,
      publicTemplates: templates.filter(t => t.isPublic).length,
      categoryCounts,
    };
  }
}