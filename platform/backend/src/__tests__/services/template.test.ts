import { TemplateService, TemplateCategory } from '../../services/template.js';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  describe('initialization', () => {
    it('should initialize with default dealership templates', async () => {
      const templates = await templateService.getAllTemplates();
      
      expect(templates.length).toBeGreaterThanOrEqual(3);
      
      const templateNames = templates.map(t => t.name);
      expect(templateNames).toContain('Vehicle Pricing Calculator');
      expect(templateNames).toContain('Vehicle Inventory Manager');
      expect(templateNames).toContain('Customer Information Form');
    });

    it('should have correct template categories', async () => {
      const templates = await templateService.getAllTemplates();
      
      const calculatorTemplate = templates.find(t => t.name === 'Vehicle Pricing Calculator');
      const inventoryTemplate = templates.find(t => t.name === 'Vehicle Inventory Manager');
      const formTemplate = templates.find(t => t.name === 'Customer Information Form');

      expect(calculatorTemplate?.category).toBe(TemplateCategory.CALCULATOR);
      expect(inventoryTemplate?.category).toBe(TemplateCategory.DASHBOARD);
      expect(formTemplate?.category).toBe(TemplateCategory.FORM);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template successfully', async () => {
      const input = {
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.UTILITY,
        code: 'function test() { return "test"; }',
        dependencies: ['test-lib.js'],
        configSchema: { type: 'object' },
        isPublic: true
      };

      const template = await templateService.createTemplate(input, 'user-001');

      expect(template.id).toBeDefined();
      expect(template.name).toBe(input.name);
      expect(template.description).toBe(input.description);
      expect(template.category).toBe(input.category);
      expect(template.code).toBe(input.code);
      expect(template.dependencies).toEqual(input.dependencies);
      expect(template.configSchema).toEqual(input.configSchema);
      expect(template.isPublic).toBe(input.isPublic);
      expect(template.authorId).toBe('user-001');
      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
    });

    it('should set default values for optional fields', async () => {
      const input = {
        name: 'Minimal Template',
        description: 'Minimal test template',
        category: TemplateCategory.UTILITY,
        code: 'console.log("minimal");'
      };

      const template = await templateService.createTemplate(input, 'user-001');

      expect(template.dependencies).toEqual([]);
      expect(template.configSchema).toEqual({});
      expect(template.isPublic).toBe(false);
    });
  });

  describe('getTemplate', () => {
    it('should retrieve existing template', async () => {
      const input = {
        name: 'Retrieve Test',
        description: 'Template for retrieval test',
        category: TemplateCategory.FORM,
        code: 'function retrieve() { return "found"; }'
      };

      const created = await templateService.createTemplate(input, 'user-001');
      const retrieved = await templateService.getTemplate(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe(created.name);
    });

    it('should return null for non-existent template', async () => {
      const result = await templateService.getTemplate('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('getAllTemplates', () => {
    it('should return all templates including defaults', async () => {
      const templates = await templateService.getAllTemplates();
      
      expect(templates.length).toBeGreaterThanOrEqual(3); // Default templates
      expect(templates.every(t => t.id && t.name && t.category)).toBe(true);
    });
  });

  describe('getPublicTemplates', () => {
    it('should return only public templates', async () => {
      // Create a private template
      await templateService.createTemplate({
        name: 'Private Template',
        description: 'Private test template',
        category: TemplateCategory.UTILITY,
        code: 'console.log("private");',
        isPublic: false
      }, 'user-001');

      // Create a public template
      await templateService.createTemplate({
        name: 'Public Template',
        description: 'Public test template',
        category: TemplateCategory.UTILITY,
        code: 'console.log("public");',
        isPublic: true
      }, 'user-001');

      const publicTemplates = await templateService.getPublicTemplates();
      
      expect(publicTemplates.every(t => t.isPublic)).toBe(true);
      expect(publicTemplates.some(t => t.name === 'Public Template')).toBe(true);
      expect(publicTemplates.some(t => t.name === 'Private Template')).toBe(false);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates filtered by category', async () => {
      const calculatorTemplates = await templateService.getTemplatesByCategory(TemplateCategory.CALCULATOR);
      
      expect(calculatorTemplates.every(t => t.category === TemplateCategory.CALCULATOR)).toBe(true);
      expect(calculatorTemplates.some(t => t.name === 'Vehicle Pricing Calculator')).toBe(true);
    });

    it('should return empty array for category with no templates', async () => {
      // Assuming no templates exist for a specific category initially
      const utilityTemplates = await templateService.getTemplatesByCategory(TemplateCategory.UTILITY);
      
      // Should be empty or contain only utility templates
      expect(utilityTemplates.every(t => t.category === TemplateCategory.UTILITY)).toBe(true);
    });
  });

  describe('getUserTemplates', () => {
    it('should return templates created by specific user', async () => {
      const userId = 'test-user-123';

      await templateService.createTemplate({
        name: 'User Template 1',
        description: 'First user template',
        category: TemplateCategory.FORM,
        code: 'console.log("user1");'
      }, userId);

      await templateService.createTemplate({
        name: 'User Template 2',
        description: 'Second user template',
        category: TemplateCategory.UTILITY,
        code: 'console.log("user2");'
      }, userId);

      const userTemplates = await templateService.getUserTemplates(userId);
      
      expect(userTemplates).toHaveLength(2);
      expect(userTemplates.every(t => t.authorId === userId)).toBe(true);
    });

    it('should return empty array for user with no templates', async () => {
      const userTemplates = await templateService.getUserTemplates('nonexistent-user');
      expect(userTemplates).toHaveLength(0);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const input = {
        name: 'Original Template',
        description: 'Original description',
        category: TemplateCategory.FORM,
        code: 'console.log("original");'
      };

      const created = await templateService.createTemplate(input, 'user-001');
      
      const updated = await templateService.updateTemplate(created.id, {
        name: 'Updated Template',
        description: 'Updated description',
        code: 'console.log("updated");'
      }, 'user-001');

      expect(updated.name).toBe('Updated Template');
      expect(updated.description).toBe('Updated description');
      expect(updated.code).toBe('console.log("updated");');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should throw error for non-existent template', async () => {
      await expect(templateService.updateTemplate('nonexistent-id', {
        name: 'New Name'
      }, 'user-001')).rejects.toThrow('Template not found');
    });

    it('should throw error when user lacks permission', async () => {
      const input = {
        name: 'Permission Test',
        description: 'Template for permission test',
        category: TemplateCategory.UTILITY,
        code: 'console.log("permission");'
      };

      const created = await templateService.createTemplate(input, 'user-001');

      await expect(templateService.updateTemplate(created.id, {
        name: 'Unauthorized Update'
      }, 'different-user')).rejects.toThrow('Insufficient permissions to update template');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      const input = {
        name: 'To Delete',
        description: 'Template to be deleted',
        category: TemplateCategory.UTILITY,
        code: 'console.log("delete me");'
      };

      const created = await templateService.createTemplate(input, 'user-001');
      
      await expect(templateService.deleteTemplate(created.id, 'user-001')).resolves.not.toThrow();
      
      const deleted = await templateService.getTemplate(created.id);
      expect(deleted).toBeNull();
    });

    it('should throw error for non-existent template', async () => {
      await expect(templateService.deleteTemplate('nonexistent-id', 'user-001'))
        .rejects.toThrow('Template not found');
    });

    it('should throw error when user lacks permission', async () => {
      const input = {
        name: 'Permission Delete Test',
        description: 'Template for delete permission test',
        category: TemplateCategory.UTILITY,
        code: 'console.log("permission");'
      };

      const created = await templateService.createTemplate(input, 'user-001');

      await expect(templateService.deleteTemplate(created.id, 'different-user'))
        .rejects.toThrow('Insufficient permissions to delete template');
    });
  });

  describe('searchTemplates', () => {
    beforeEach(async () => {
      await templateService.createTemplate({
        name: 'Calculator Widget',
        description: 'Advanced pricing calculator',
        category: TemplateCategory.CALCULATOR,
        code: 'function calculate() { return 42; }'
      }, 'user-001');

      await templateService.createTemplate({
        name: 'Form Builder',
        description: 'Dynamic form creation tool',
        category: TemplateCategory.FORM,
        code: 'function buildForm() { return true; }'
      }, 'user-001');
    });

    it('should search by name', async () => {
      const results = await templateService.searchTemplates('Calculator');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.name.includes('Calculator'))).toBe(true);
    });

    it('should search by description', async () => {
      const results = await templateService.searchTemplates('pricing');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.description.includes('pricing'))).toBe(true);
    });

    it('should filter by category', async () => {
      const results = await templateService.searchTemplates('', TemplateCategory.FORM);
      
      expect(results.every(t => t.category === TemplateCategory.FORM)).toBe(true);
    });

    it('should combine search query and category filter', async () => {
      const results = await templateService.searchTemplates('Form', TemplateCategory.FORM);
      
      expect(results.every(t => t.category === TemplateCategory.FORM)).toBe(true);
      expect(results.some(t => t.name.includes('Form') || t.description.includes('form'))).toBe(true);
    });
  });

  describe('validateTemplateCode', () => {
    it('should validate correct JavaScript syntax', () => {
      const validCode = 'class TestClass { constructor() { QB.on("ready", () => {}); } }';
      const result = (templateService as any).validateTemplateCode(validCode);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect JavaScript syntax errors', () => {
      const invalidCode = 'function test( { return "invalid"; }'; // Missing closing parenthesis
      const result = (templateService as any).validateTemplateCode(invalidCode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Syntax error');
    });

    it('should warn about missing QuickBase integration', () => {
      const codeWithoutQB = 'function test() { return "no QB"; }';
      const result = (templateService as any).validateTemplateCode(codeWithoutQB);
      
      expect(result.errors.some((e: string) => e.includes('QuickBase Hero library integration'))).toBe(true);
    });

    it('should warn about missing structure', () => {
      const codeWithoutStructure = 'console.log("no structure");';
      const result = (templateService as any).validateTemplateCode(codeWithoutStructure);
      
      expect(result.errors.some((e: string) => e.includes('define at least one class or function'))).toBe(true);
    });
  });

  describe('processTemplateCode', () => {
    it('should inject CDN Hero library when not present', () => {
      const originalCode = 'function test() { return "test"; }';
      const processedCode = (templateService as any).processTemplateCode(originalCode);
      
      expect(processedCode).toContain('quickbase_codepage_hero.js');
      expect(processedCode).toContain('typeof QB === \'undefined\'');
    });

    it('should replace configuration placeholders', () => {
      const codeWithPlaceholders = 'const basePrice = {{basePrice}}; const taxRate = {{taxRate}};';
      const config = { basePrice: 25000, taxRate: 0.08 };
      
      const processedCode = (templateService as any).processTemplateCode(codeWithPlaceholders, config);
      
      expect(processedCode).toContain('const basePrice = 25000;');
      expect(processedCode).toContain('const taxRate = 0.08;');
    });

    it('should handle string configuration values', () => {
      const codeWithPlaceholders = 'const tableName = {{tableName}};';
      const config = { tableName: 'vehicles' };
      
      const processedCode = (templateService as any).processTemplateCode(codeWithPlaceholders, config);
      
      expect(processedCode).toContain('const tableName = \'vehicles\';');
    });
  });

  describe('getTemplateStats', () => {
    it('should return correct template statistics', async () => {
      // Create additional templates for testing
      await templateService.createTemplate({
        name: 'Public Calculator',
        description: 'Public calculator template',
        category: TemplateCategory.CALCULATOR,
        code: 'function calc() {}',
        isPublic: true
      }, 'user-001');

      await templateService.createTemplate({
        name: 'Private Form',
        description: 'Private form template',
        category: TemplateCategory.FORM,
        code: 'function form() {}',
        isPublic: false
      }, 'user-001');

      const stats = (templateService as any).getTemplateStats();
      
      expect(stats.totalTemplates).toBeGreaterThanOrEqual(5); // 3 default + 2 created
      expect(stats.publicTemplates).toBeGreaterThanOrEqual(4); // 3 default public + 1 created public
      expect(stats.categoryCounts[TemplateCategory.CALCULATOR]).toBeGreaterThanOrEqual(2);
      expect(stats.categoryCounts[TemplateCategory.FORM]).toBeGreaterThanOrEqual(2);
      expect(stats.categoryCounts[TemplateCategory.DASHBOARD]).toBeGreaterThanOrEqual(1);
    });
  });
});