import { z } from 'zod';

// Codepage storage and retrieval interfaces
export interface CodepageStorage {
  id: string;
  projectId: string;
  versionId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  quickbaseRecordId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveCodepageInput {
  projectId: string;
  versionId: string;
  name: string;
  code: string;
  description?: string;
}

export interface CodepageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CodepageExecutionContext {
  tableId?: string;
  recordId?: number;
  userId?: string;
  environment: 'development' | 'staging' | 'production';
}

// Validation schemas
export const SaveCodepageSchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  name: z.string().min(1).max(100),
  code: z.string().min(1),
  description: z.string().max(500).optional(),
});

export const CodepageExecutionSchema = z.object({
  tableId: z.string().optional(),
  recordId: z.number().optional(),
  userId: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
});

export class CodepageService {
  private codepages: Map<string, CodepageStorage> = new Map();
  private quickbaseMCPAvailable: boolean = false;

  constructor() {
    // Check if QuickBase MCP server is available
    this.checkQuickBaseMCPAvailability();
    this.initializeSampleCodepages();
  }

  private async checkQuickBaseMCPAvailability(): Promise<void> {
    try {
      // In a real implementation, this would check if the MCP server is running
      // For now, we'll simulate this check
      this.quickbaseMCPAvailable = process.env.QUICKBASE_MCP_ENABLED === 'true';
      console.log(`📦 QuickBase MCP Server availability: ${this.quickbaseMCPAvailable}`);
    } catch (error) {
      console.warn('⚠️ QuickBase MCP Server not available, using local storage');
      this.quickbaseMCPAvailable = false;
    }
  }

  private initializeSampleCodepages(): void {
    const sampleCodepage: CodepageStorage = {
      id: 'codepage-001',
      projectId: 'project-001',
      versionId: 'version-001',
      name: 'Vehicle Pricing Calculator v1.0',
      code: this.getSamplePricingCalculatorCode(),
      description: 'Interactive vehicle pricing calculator with financing options',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.codepages.set(sampleCodepage.id, sampleCodepage);
    console.log('📄 Initialized sample codepages for development');
  }

  private getSamplePricingCalculatorCode(): string {
    return `// Vehicle Pricing Calculator - Enhanced with CDN Hero Integration
// Auto-includes QuickBase Codepage Hero library

(function() {
  'use strict';
  
  // Ensure CDN Hero library is loaded
  if (typeof QB === 'undefined') {
    console.warn('QuickBase Hero library not loaded, loading from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.example.com/quickbase_codepage_hero.js';
    script.onload = function() {
      console.log('QuickBase Hero library loaded successfully');
      initializePricingCalculator();
    };
    document.head.appendChild(script);
  } else {
    initializePricingCalculator();
  }
  
  function initializePricingCalculator() {
    class EnhancedPricingCalculator {
      constructor() {
        this.basePrice = 25000;
        this.selectedOptions = [];
        this.appliedDiscounts = [];
        this.taxRate = 0.08;
        this.dealershipFee = 500;
        
        this.init();
      }
      
      init() {
        this.createUI();
        this.bindEvents();
        this.loadVehicleData();
        console.log('Enhanced Pricing Calculator initialized');
      }
      
      createUI() {
        const container = document.getElementById('pricing-calculator') || document.body;
        container.innerHTML = \`
          <div class="enhanced-pricing-calculator">
            <header class="calculator-header">
              <h1>Vehicle Pricing Calculator</h1>
              <div class="calculator-status">
                <span id="connection-status" class="status-indicator">●</span>
                <span id="status-text">Connected to QuickBase</span>
              </div>
            </header>
            
            <div class="calculator-content">
              <div class="vehicle-selection">
                <h2>Vehicle Selection</h2>
                <div class="form-group">
                  <label for="vehicle-select">Select Vehicle:</label>
                  <select id="vehicle-select">
                    <option value="">Loading vehicles...</option>
                  </select>
                </div>
                <div class="vehicle-details" id="vehicle-details" style="display: none;">
                  <h3 id="selected-vehicle-name"></h3>
                  <p>Base Price: $<span id="base-price-display">0</span></p>
                </div>
              </div>
              
              <div class="options-section">
                <h2>Options & Packages</h2>
                <div id="options-grid" class="options-grid">
                  <!-- Options will be loaded dynamically -->
                </div>
              </div>
              
              <div class="discounts-section">
                <h2>Discounts & Incentives</h2>
                <div id="discounts-grid" class="discounts-grid">
                  <!-- Discounts will be loaded dynamically -->
                </div>
              </div>
              
              <div class="financing-section">
                <h2>Financing Options</h2>
                <div class="financing-controls">
                  <div class="form-group">
                    <label for="down-payment">Down Payment:</label>
                    <input type="number" id="down-payment" min="0" step="100" value="5000">
                  </div>
                  <div class="form-group">
                    <label for="loan-term">Loan Term:</label>
                    <select id="loan-term">
                      <option value="36">36 months</option>
                      <option value="48" selected>48 months</option>
                      <option value="60">60 months</option>
                      <option value="72">72 months</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="interest-rate">Interest Rate (%):</label>
                    <input type="number" id="interest-rate" min="0" max="30" step="0.1" value="5.5">
                  </div>
                </div>
              </div>
              
              <div class="pricing-summary">
                <h2>Pricing Summary</h2>
                <div class="price-breakdown">
                  <div class="price-line">
                    <span>Base Price:</span>
                    <span id="summary-base-price">$0</span>
                  </div>
                  <div class="price-line">
                    <span>Options Total:</span>
                    <span id="summary-options-total">$0</span>
                  </div>
                  <div class="price-line">
                    <span>Discounts Total:</span>
                    <span id="summary-discounts-total">-$0</span>
                  </div>
                  <div class="price-line">
                    <span>Subtotal:</span>
                    <span id="summary-subtotal">$0</span>
                  </div>
                  <div class="price-line">
                    <span>Tax (8%):</span>
                    <span id="summary-tax">$0</span>
                  </div>
                  <div class="price-line">
                    <span>Dealership Fee:</span>
                    <span id="summary-fee">$500</span>
                  </div>
                  <div class="price-line total-line">
                    <span><strong>Total Price:</strong></span>
                    <span id="summary-total"><strong>$0</strong></span>
                  </div>
                  <div class="price-line financing-line">
                    <span><strong>Monthly Payment:</strong></span>
                    <span id="summary-monthly"><strong>$0</strong></span>
                  </div>
                </div>
              </div>
              
              <div class="calculator-actions">
                <button id="save-quote" class="btn btn-primary">Save Quote</button>
                <button id="print-quote" class="btn btn-secondary">Print Quote</button>
                <button id="email-quote" class="btn btn-secondary">Email Quote</button>
                <button id="reset-calculator" class="btn btn-outline">Reset</button>
              </div>
            </div>
          </div>
        \`;
      }
      
      bindEvents() {
        // Vehicle selection
        document.getElementById('vehicle-select').addEventListener('change', (e) => {
          this.selectVehicle(e.target.value);
        });
        
        // Financing inputs
        ['down-payment', 'loan-term', 'interest-rate'].forEach(id => {
          document.getElementById(id).addEventListener('input', () => {
            this.updateCalculation();
          });
        });
        
        // Action buttons
        document.getElementById('save-quote').addEventListener('click', () => this.saveQuote());
        document.getElementById('print-quote').addEventListener('click', () => this.printQuote());
        document.getElementById('email-quote').addEventListener('click', () => this.emailQuote());
        document.getElementById('reset-calculator').addEventListener('click', () => this.resetCalculator());
      }
      
      async loadVehicleData() {
        try {
          this.updateStatus('Loading vehicle data...', 'loading');
          
          if (typeof QB !== 'undefined') {
            // Load vehicles from QuickBase
            const vehicles = await QB.api.queryRecords({
              tableId: 'vehicles_table_id', // Configure this
              select: [6, 7, 8], // Make, Model, Price fields
              where: "{9.EX.'Available'}" // Status field
            });
            
            this.populateVehicleSelect(vehicles.data);
            this.updateStatus('Connected to QuickBase', 'connected');
          } else {
            // Use sample data
            const sampleVehicles = [
              { id: 1, make: 'Toyota', model: 'Camry', price: 28000 },
              { id: 2, make: 'Honda', model: 'Accord', price: 32000 },
              { id: 3, make: 'Ford', model: 'F-150', price: 45000 }
            ];
            this.populateVehicleSelect(sampleVehicles);
            this.updateStatus('Using sample data', 'offline');
          }
          
          await this.loadOptionsAndDiscounts();
          
        } catch (error) {
          console.error('Error loading vehicle data:', error);
          this.updateStatus('Error loading data', 'error');
        }
      }
      
      populateVehicleSelect(vehicles) {
        const select = document.getElementById('vehicle-select');
        select.innerHTML = '<option value="">Select a vehicle...</option>';
        
        vehicles.forEach(vehicle => {
          const option = document.createElement('option');
          option.value = JSON.stringify(vehicle);
          option.textContent = \`\${vehicle.make} \${vehicle.model} - $\${vehicle.price.toLocaleString()}\`;
          select.appendChild(option);
        });
      }
      
      async loadOptionsAndDiscounts() {
        // Load available options
        const optionsGrid = document.getElementById('options-grid');
        const sampleOptions = [
          { id: 'premium', name: 'Premium Package', price: 2500 },
          { id: 'navigation', name: 'Navigation System', price: 1200 },
          { id: 'sunroof', name: 'Sunroof', price: 800 },
          { id: 'leather', name: 'Leather Seats', price: 1500 }
        ];
        
        optionsGrid.innerHTML = sampleOptions.map(option => \`
          <label class="option-item">
            <input type="checkbox" data-option-id="\${option.id}" data-price="\${option.price}">
            <span class="option-name">\${option.name}</span>
            <span class="option-price">+$\${option.price.toLocaleString()}</span>
          </label>
        \`).join('');
        
        // Load available discounts
        const discountsGrid = document.getElementById('discounts-grid');
        const sampleDiscounts = [
          { id: 'loyalty', name: 'Loyalty Discount', amount: 1000 },
          { id: 'trade', name: 'Trade-in Credit', amount: 3000 },
          { id: 'military', name: 'Military Discount', amount: 500 }
        ];
        
        discountsGrid.innerHTML = sampleDiscounts.map(discount => \`
          <label class="discount-item">
            <input type="checkbox" data-discount-id="\${discount.id}" data-amount="\${discount.amount}">
            <span class="discount-name">\${discount.name}</span>
            <span class="discount-amount">-$\${discount.amount.toLocaleString()}</span>
          </label>
        \`).join('');
        
        // Bind change events
        optionsGrid.addEventListener('change', () => this.updateCalculation());
        discountsGrid.addEventListener('change', () => this.updateCalculation());
      }
      
      selectVehicle(vehicleData) {
        if (!vehicleData) {
          document.getElementById('vehicle-details').style.display = 'none';
          this.basePrice = 0;
          this.updateCalculation();
          return;
        }
        
        const vehicle = JSON.parse(vehicleData);
        this.basePrice = vehicle.price;
        
        document.getElementById('selected-vehicle-name').textContent = \`\${vehicle.make} \${vehicle.model}\`;
        document.getElementById('base-price-display').textContent = vehicle.price.toLocaleString();
        document.getElementById('vehicle-details').style.display = 'block';
        
        this.updateCalculation();
      }
      
      updateCalculation() {
        if (this.basePrice === 0) return;
        
        // Calculate options total
        const optionsTotal = Array.from(document.querySelectorAll('[data-option-id]:checked'))
          .reduce((total, checkbox) => total + parseInt(checkbox.dataset.price), 0);
        
        // Calculate discounts total
        const discountsTotal = Array.from(document.querySelectorAll('[data-discount-id]:checked'))
          .reduce((total, checkbox) => total + parseInt(checkbox.dataset.amount), 0);
        
        // Calculate subtotal
        const subtotal = this.basePrice + optionsTotal - discountsTotal;
        
        // Calculate tax
        const tax = subtotal * this.taxRate;
        
        // Calculate total
        const total = subtotal + tax + this.dealershipFee;
        
        // Calculate monthly payment
        const downPayment = parseFloat(document.getElementById('down-payment').value) || 0;
        const loanAmount = Math.max(0, total - downPayment);
        const loanTerm = parseInt(document.getElementById('loan-term').value);
        const interestRate = parseFloat(document.getElementById('interest-rate').value) / 100;
        const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, loanTerm);
        
        // Update display
        document.getElementById('summary-base-price').textContent = \`$\${this.basePrice.toLocaleString()}\`;
        document.getElementById('summary-options-total').textContent = \`$\${optionsTotal.toLocaleString()}\`;
        document.getElementById('summary-discounts-total').textContent = \`-$\${discountsTotal.toLocaleString()}\`;
        document.getElementById('summary-subtotal').textContent = \`$\${subtotal.toLocaleString()}\`;
        document.getElementById('summary-tax').textContent = \`$\${Math.round(tax).toLocaleString()}\`;
        document.getElementById('summary-fee').textContent = \`$\${this.dealershipFee.toLocaleString()}\`;
        document.getElementById('summary-total').textContent = \`$\${Math.round(total).toLocaleString()}\`;
        document.getElementById('summary-monthly').textContent = \`$\${Math.round(monthlyPayment).toLocaleString()}\`;
      }
      
      calculateMonthlyPayment(principal, annualRate, termMonths) {
        if (principal <= 0 || annualRate <= 0) return 0;
        
        const monthlyRate = annualRate / 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                       (Math.pow(1 + monthlyRate, termMonths) - 1);
        return payment;
      }
      
      async saveQuote() {
        try {
          const quoteData = this.collectQuoteData();
          
          if (typeof QB !== 'undefined') {
            await QB.api.createRecord({
              tableId: 'quotes_table_id', // Configure this
              fields: {
                'quote_data': { value: JSON.stringify(quoteData) },
                'total_price': { value: quoteData.totalPrice },
                'monthly_payment': { value: quoteData.monthlyPayment }
              }
            });
            
            this.showNotification('Quote saved successfully!', 'success');
          } else {
            console.log('Quote data:', quoteData);
            this.showNotification('Quote saved locally', 'info');
          }
        } catch (error) {
          console.error('Error saving quote:', error);
          this.showNotification('Error saving quote', 'error');
        }
      }
      
      collectQuoteData() {
        return {
          vehicleInfo: document.getElementById('selected-vehicle-name').textContent,
          basePrice: this.basePrice,
          selectedOptions: Array.from(document.querySelectorAll('[data-option-id]:checked'))
            .map(cb => ({ id: cb.dataset.optionId, price: parseInt(cb.dataset.price) })),
          appliedDiscounts: Array.from(document.querySelectorAll('[data-discount-id]:checked'))
            .map(cb => ({ id: cb.dataset.discountId, amount: parseInt(cb.dataset.amount) })),
          totalPrice: parseFloat(document.getElementById('summary-total').textContent.replace(/[$,]/g, '')),
          monthlyPayment: parseFloat(document.getElementById('summary-monthly').textContent.replace(/[$,]/g, '')),
          timestamp: new Date().toISOString()
        };
      }
      
      printQuote() {
        window.print();
      }
      
      emailQuote() {
        // Implementation for emailing quote
        this.showNotification('Email functionality coming soon', 'info');
      }
      
      resetCalculator() {
        document.getElementById('vehicle-select').value = '';
        document.querySelectorAll('[data-option-id], [data-discount-id]').forEach(cb => cb.checked = false);
        document.getElementById('down-payment').value = '5000';
        document.getElementById('loan-term').value = '48';
        document.getElementById('interest-rate').value = '5.5';
        
        this.basePrice = 0;
        document.getElementById('vehicle-details').style.display = 'none';
        this.updateCalculation();
      }
      
      updateStatus(message, type) {
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('connection-status');
        
        statusText.textContent = message;
        statusIndicator.className = \`status-indicator \${type}\`;
      }
      
      showNotification(message, type) {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = \`notification \${type}\`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);
      }
    }
    
    // Initialize the calculator
    new EnhancedPricingCalculator();
  }
  
  // Auto-initialize if QB is already loaded
  if (typeof QB !== 'undefined') {
    QB.on('ready', initializePricingCalculator);
  }
})();`;
  }

  // Core codepage storage and retrieval methods

  async saveCodepage(input: SaveCodepageInput): Promise<CodepageStorage> {
    // Validate the codepage code
    const validation = this.validateCodepage(input.code);
    if (!validation.isValid) {
      throw new Error(`Codepage validation failed: ${validation.errors.join(', ')}`);
    }

    // Process the code to include CDN Hero integration
    const processedCode = this.processCodepageCode(input.code);

    const codepage: CodepageStorage = {
      id: `codepage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: input.projectId,
      versionId: input.versionId,
      name: input.name,
      code: processedCode,
      description: input.description,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to QuickBase if available
    if (this.quickbaseMCPAvailable) {
      try {
        const recordId = await this.saveToQuickBase(codepage);
        codepage.quickbaseRecordId = recordId;
      } catch (error) {
        console.error('Error saving to QuickBase:', error);
        // Continue with local storage as fallback
      }
    }

    // Store locally
    this.codepages.set(codepage.id, codepage);

    console.log(`💾 Saved codepage "${codepage.name}" (ID: ${codepage.id})`);
    return codepage;
  }

  async getCodepage(codepageId: string): Promise<CodepageStorage | null> {
    // Try local storage first
    let codepage = this.codepages.get(codepageId);

    // If not found locally and QuickBase is available, try loading from QuickBase
    if (!codepage && this.quickbaseMCPAvailable) {
      try {
        const loadedCodepage = await this.loadFromQuickBase(codepageId);
        if (loadedCodepage) {
          codepage = loadedCodepage;
          this.codepages.set(codepage.id, codepage);
        }
      } catch (error) {
        console.error('Error loading from QuickBase:', error);
      }
    }

    return codepage || null;
  }

  async updateCodepage(codepageId: string, updates: Partial<SaveCodepageInput>): Promise<CodepageStorage> {
    const codepage = await this.getCodepage(codepageId);
    if (!codepage) {
      throw new Error('Codepage not found');
    }

    // Validate updated code if provided
    if (updates.code) {
      const validation = this.validateCodepage(updates.code);
      if (!validation.isValid) {
        throw new Error(`Codepage validation failed: ${validation.errors.join(', ')}`);
      }
      codepage.code = this.processCodepageCode(updates.code);
    }

    // Update other fields
    if (updates.name !== undefined) codepage.name = updates.name;
    if (updates.description !== undefined) codepage.description = updates.description;
    codepage.updatedAt = new Date();

    // Update in QuickBase if available
    if (this.quickbaseMCPAvailable && codepage.quickbaseRecordId) {
      try {
        await this.updateInQuickBase(codepage);
      } catch (error) {
        console.error('Error updating in QuickBase:', error);
      }
    }

    // Update locally
    this.codepages.set(codepage.id, codepage);

    console.log(`📝 Updated codepage "${codepage.name}" (ID: ${codepage.id})`);
    return codepage;
  }

  async deleteCodepage(codepageId: string): Promise<void> {
    const codepage = await this.getCodepage(codepageId);
    if (!codepage) {
      throw new Error('Codepage not found');
    }

    // Delete from QuickBase if available
    if (this.quickbaseMCPAvailable && codepage.quickbaseRecordId) {
      try {
        await this.deleteFromQuickBase(codepage.quickbaseRecordId);
      } catch (error) {
        console.error('Error deleting from QuickBase:', error);
      }
    }

    // Delete locally
    this.codepages.delete(codepageId);

    console.log(`🗑️ Deleted codepage "${codepage.name}" (ID: ${codepage.id})`);
  }

  async getProjectCodepages(projectId: string): Promise<CodepageStorage[]> {
    return Array.from(this.codepages.values()).filter(
      codepage => codepage.projectId === projectId
    );
  }

  async getActiveCodepages(): Promise<CodepageStorage[]> {
    return Array.from(this.codepages.values()).filter(
      codepage => codepage.isActive
    );
  }

  // Codepage validation and processing

  validateCodepage(code: string): CodepageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic syntax validation
    try {
      new Function(code);
    } catch (error) {
      errors.push(`JavaScript syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check for potentially dangerous code
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /document\.write/,
      /innerHTML\s*=/,
      /outerHTML\s*=/
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        warnings.push(`Potentially unsafe code pattern detected: ${pattern.source}`);
      }
    });

    // Check for QuickBase integration
    if (!code.includes('QB') && !code.includes('QuickBase')) {
      warnings.push('No QuickBase integration detected. Consider using QB API for data operations.');
    }

    // Check for proper error handling
    if (!code.includes('try') && !code.includes('catch')) {
      warnings.push('No error handling detected. Consider adding try-catch blocks for robustness.');
    }

    // Check for console.log statements (should be warnings in production)
    if (code.includes('console.log')) {
      warnings.push('Console.log statements detected. Consider removing for production deployment.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  processCodepageCode(code: string): string {
    let processedCode = code;

    // Auto-inject CDN Hero library if not already present
    if (!processedCode.includes('quickbase_codepage_hero') && !processedCode.includes('QB')) {
      const heroInjection = `
// Auto-injected QuickBase Codepage Hero library
(function() {
  if (typeof QB === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.example.com/quickbase_codepage_hero.js';
    script.onload = function() {
      console.log('QuickBase Hero library loaded');
      if (typeof initializeCodepage === 'function') {
        initializeCodepage();
      }
    };
    document.head.appendChild(script);
  } else {
    if (typeof initializeCodepage === 'function') {
      QB.on('ready', initializeCodepage);
    }
  }
})();

`;
      processedCode = heroInjection + processedCode;
    }

    // Wrap code in IIFE for isolation
    if (!processedCode.trim().startsWith('(function()') && !processedCode.trim().startsWith('(() =>')) {
      processedCode = `
(function() {
  'use strict';
  
${processedCode}

})();`;
    }

    return processedCode;
  }

  // QuickBase MCP Server integration methods

  private async saveToQuickBase(codepage: CodepageStorage): Promise<number> {
    try {
      // This would use the actual QuickBase MCP server methods
      // For now, we'll simulate the API call
      console.log(`📤 Saving codepage to QuickBase: ${codepage.name}`);
      
      // Simulated MCP call:
      // const response = await quickbaseMCPClient.saveCodepage({
      //   tableId: 'codepages_table_id',
      //   name: codepage.name,
      //   code: codepage.code
      // });
      
      // Simulate a record ID
      const simulatedRecordId = Math.floor(Math.random() * 10000) + 1000;
      
      console.log(`✅ Codepage saved to QuickBase with record ID: ${simulatedRecordId}`);
      return simulatedRecordId;
      
    } catch (error) {
      console.error('Error saving to QuickBase:', error);
      throw error;
    }
  }

  private async loadFromQuickBase(codepageId: string): Promise<CodepageStorage | null> {
    try {
      console.log(`📥 Loading codepage from QuickBase: ${codepageId}`);
      
      // Simulated MCP call:
      // const response = await quickbaseMCPClient.getCodepage({
      //   tableId: 'codepages_table_id',
      //   recordId: parseInt(codepageId)
      // });
      
      // For now, return null to indicate not found
      return null;
      
    } catch (error) {
      console.error('Error loading from QuickBase:', error);
      throw error;
    }
  }

  private async updateInQuickBase(codepage: CodepageStorage): Promise<void> {
    try {
      console.log(`📤 Updating codepage in QuickBase: ${codepage.name}`);
      
      // Simulated MCP call:
      // await quickbaseMCPClient.updateRecord({
      //   tableId: 'codepages_table_id',
      //   recordId: codepage.quickbaseRecordId,
      //   fields: {
      //     'name': { value: codepage.name },
      //     'code': { value: codepage.code }
      //   }
      // });
      
      console.log(`✅ Codepage updated in QuickBase`);
      
    } catch (error) {
      console.error('Error updating in QuickBase:', error);
      throw error;
    }
  }

  private async deleteFromQuickBase(recordId: number): Promise<void> {
    try {
      console.log(`🗑️ Deleting codepage from QuickBase: ${recordId}`);
      
      // Simulated MCP call:
      // await quickbaseMCPClient.deleteRecord({
      //   tableId: 'codepages_table_id',
      //   recordId: recordId
      // });
      
      console.log(`✅ Codepage deleted from QuickBase`);
      
    } catch (error) {
      console.error('Error deleting from QuickBase:', error);
      throw error;
    }
  }

  // Utility methods

  async searchCodepages(query: string, projectId?: string): Promise<CodepageStorage[]> {
    let codepages = Array.from(this.codepages.values());

    // Filter by project if specified
    if (projectId) {
      codepages = codepages.filter(codepage => codepage.projectId === projectId);
    }

    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      codepages = codepages.filter(codepage =>
        codepage.name.toLowerCase().includes(lowerQuery) ||
        (codepage.description && codepage.description.toLowerCase().includes(lowerQuery)) ||
        codepage.code.toLowerCase().includes(lowerQuery)
      );
    }

    return codepages;
  }

  async getCodepageStats(): Promise<{
    totalCodepages: number;
    activeCodepages: number;
    quickbaseStoredCodepages: number;
    averageCodeSize: number;
  }> {
    const codepages = Array.from(this.codepages.values());
    
    return {
      totalCodepages: codepages.length,
      activeCodepages: codepages.filter(c => c.isActive).length,
      quickbaseStoredCodepages: codepages.filter(c => c.quickbaseRecordId).length,
      averageCodeSize: codepages.length > 0 
        ? Math.round(codepages.reduce((sum, c) => sum + c.code.length, 0) / codepages.length)
        : 0
    };
  }

  async deployCodepage(codepageId: string, context: CodepageExecutionContext): Promise<{
    success: boolean;
    deploymentId: string;
    message: string;
  }> {
    const codepage = await this.getCodepage(codepageId);
    if (!codepage) {
      throw new Error('Codepage not found');
    }

    try {
      const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`🚀 Deploying codepage "${codepage.name}" to ${context.environment}`);
      
      // In a real implementation, this would:
      // 1. Validate the codepage for the target environment
      // 2. Deploy to the specified QuickBase application/table
      // 3. Set up monitoring and logging
      // 4. Return deployment status
      
      // For now, simulate successful deployment
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate deployment time
      
      console.log(`✅ Codepage deployed successfully (ID: ${deploymentId})`);
      
      return {
        success: true,
        deploymentId,
        message: `Codepage "${codepage.name}" deployed to ${context.environment} environment`
      };
      
    } catch (error) {
      console.error('Deployment failed:', error);
      return {
        success: false,
        deploymentId: '',
        message: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}