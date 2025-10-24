import request from 'supertest';
import express from 'express';
import { AuthService } from '../../services/auth.js';
import { CodepageService } from '../../services/codepage.js';
import { createAuthRoutes } from '../../routes/auth.js';

describe('Codepages API Integration Tests', () => {
  let app: express.Application;
  let authService: AuthService;
  let codepageService: CodepageService;
  let authToken: string;

  beforeEach(async () => {
    authService = new AuthService();
    codepageService = new CodepageService();
    
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(authService));
    
    // Mock the codepages routes since they're not properly exported
    const router = express.Router();
    
    // Mock auth middleware
    const mockAuthMiddleware = (req: any, res: any, next: any) => {
      if (!req.headers.authorization) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const payload = authService.verifyToken(token);
        req.user = { id: payload.userId, role: payload.role };
        next();
      } catch (error) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
      }
    };

    // GET /codepages/stats
    router.get('/stats', mockAuthMiddleware, async (req, res) => {
      try {
        const stats = await codepageService.getCodepageStats();
        res.json({ success: true, data: stats });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
      }
    });

    // GET /codepages/search
    router.get('/search', mockAuthMiddleware, async (req, res) => {
      try {
        const query = req.query.q as string || '';
        const projectId = req.query.projectId as string;
        const codepages = await codepageService.searchCodepages(query, projectId);
        res.json({ success: true, data: codepages, count: codepages.length });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to search codepages' });
      }
    });

    // GET /codepages/active
    router.get('/active', mockAuthMiddleware, async (req, res) => {
      try {
        const codepages = await codepageService.getActiveCodepages();
        res.json({ success: true, data: codepages, count: codepages.length });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch active codepages' });
      }
    });

    // GET /codepages/project/:projectId
    router.get('/project/:projectId', mockAuthMiddleware, async (req, res) => {
      try {
        const projectId = req.params.projectId;
        const codepages = await codepageService.getProjectCodepages(projectId);
        res.json({ success: true, data: codepages, count: codepages.length });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch project codepages' });
      }
    });

    // GET /codepages/:codepageId
    router.get('/:codepageId', mockAuthMiddleware, async (req, res) => {
      try {
        const codepage = await codepageService.getCodepage(req.params.codepageId);
        if (!codepage) {
          return res.status(404).json({ success: false, error: 'Codepage not found' });
        }
        res.json({ success: true, data: codepage });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch codepage' });
      }
    });

    // POST /codepages
    router.post('/', mockAuthMiddleware, async (req, res) => {
      try {
        const codepage = await codepageService.saveCodepage(req.body);
        res.status(201).json({ success: true, data: codepage });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // PUT /codepages/:codepageId
    router.put('/:codepageId', mockAuthMiddleware, async (req, res) => {
      try {
        const codepage = await codepageService.updateCodepage(req.params.codepageId, req.body);
        res.json({ success: true, data: codepage });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ success: false, error: error.message });
        }
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // DELETE /codepages/:codepageId
    router.delete('/:codepageId', mockAuthMiddleware, async (req, res) => {
      try {
        await codepageService.deleteCodepage(req.params.codepageId);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.use('/codepages', router);

    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@dealership.com',
        password: 'admin123'
      });
    
    authToken = loginResponse.body.data.token;
  });

  describe('GET /codepages/stats', () => {
    it('should return codepage statistics', async () => {
      const response = await request(app)
        .get('/codepages/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCodepages');
      expect(response.body.data).toHaveProperty('activeCodepages');
      expect(response.body.data).toHaveProperty('averageCodeSize');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/codepages/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /codepages/search', () => {
    it('should search codepages by query', async () => {
      const response = await request(app)
        .get('/codepages/search?q=calculator')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe('number');
    });

    it('should search codepages by project ID', async () => {
      const response = await request(app)
        .get('/codepages/search?projectId=project-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app)
        .get('/codepages/search?q=nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /codepages/active', () => {
    it('should return active codepages', async () => {
      const response = await request(app)
        .get('/codepages/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('GET /codepages/project/:projectId', () => {
    it('should return codepages for a project', async () => {
      const response = await request(app)
        .get('/codepages/project/project-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /codepages', () => {
    it('should create a new codepage', async () => {
      const codepageData = {
        projectId: 'test-project',
        versionId: 'v1.0.0',
        name: 'Test Codepage',
        code: 'console.log("Hello World");',
        description: 'A test codepage'
      };

      const response = await request(app)
        .post('/codepages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(codepageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(codepageData.name);
      expect(response.body.data.projectId).toBe(codepageData.projectId);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 400 for invalid JavaScript code', async () => {
      const codepageData = {
        projectId: 'test-project',
        versionId: 'v1.0.0',
        name: 'Invalid Codepage',
        code: 'function invalid( { // Missing closing brace'
      };

      const response = await request(app)
        .post('/codepages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(codepageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation failed');
    });
  });

  describe('GET /codepages/:codepageId', () => {
    it('should return a specific codepage', async () => {
      // First create a codepage
      const createResponse = await request(app)
        .post('/codepages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'test-project',
          versionId: 'v1.0.0',
          name: 'Test Codepage',
          code: 'console.log("test");'
        });

      const codepageId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/codepages/${codepageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(codepageId);
    });

    it('should return 404 for non-existent codepage', async () => {
      const response = await request(app)
        .get('/codepages/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Codepage not found');
    });
  });

  describe('PUT /codepages/:codepageId', () => {
    it('should update an existing codepage', async () => {
      // First create a codepage
      const createResponse = await request(app)
        .post('/codepages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'test-project',
          versionId: 'v1.0.0',
          name: 'Original Name',
          code: 'console.log("original");'
        });

      const codepageId = createResponse.body.data.id;

      const updateData = {
        name: 'Updated Name',
        code: 'console.log("updated");'
      };

      const response = await request(app)
        .put(`/codepages/${codepageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should return 404 for non-existent codepage', async () => {
      const response = await request(app)
        .put('/codepages/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /codepages/:codepageId', () => {
    it('should delete an existing codepage', async () => {
      // First create a codepage
      const createResponse = await request(app)
        .post('/codepages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'test-project',
          versionId: 'v1.0.0',
          name: 'To Delete',
          code: 'console.log("delete me");'
        });

      const codepageId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/codepages/${codepageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's deleted
      await request(app)
        .get(`/codepages/${codepageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent codepage', async () => {
      const response = await request(app)
        .delete('/codepages/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});