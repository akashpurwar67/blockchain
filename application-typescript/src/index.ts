import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/config';
import logger from './config/logger';
import studentRoutes from './routes/student.routes';
import certificateRoutes from './routes/certificate.routes';
import academicRecordsRoutes from './routes/academic-records.routes';
import { FabricService } from './services/fabric.service';

class Server {
  private app: Express;
  private fabricService: FabricService;

  constructor() {
    this.app = express();
    this.fabricService = new FabricService();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Increase header size limits FIRST to prevent 431 errors
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // CORS configuration with expanded settings
    const corsOptions = {
      origin: config.cors.origin || 'http://localhost:3001',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400, // 24 hours
    };
    
    this.app.use(cors(corsOptions));

    // Handle OPTIONS requests explicitly for preflight
    this.app.options('*', cors(corsOptions));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // Authentication endpoint (for demo purposes)
    this.app.post('/auth/login', (req: Request, res: Response) => {
      const { userId, mspID, password } = req.body;

      // Demo authentication - in production, verify against Fabric MSP
      if (!userId || !mspID || !password) {
        res.status(400).json({ error: 'Missing credentials' });
        return;
      }

      const token = generateDemoToken(userId, mspID);
      res.status(200).json({
        success: true,
        token,
        user: { userId, mspID },
      });
    });

    // Student API routes
    this.app.use('/api/students', studentRoutes);

    // Certificate API routes
    this.app.use('/api/certificates', certificateRoutes);

    // Academic Records API routes
    this.app.use('/api/academic-records', academicRecordsRoutes);

    // Public verification endpoint (no auth required)
    this.app.get('/verify/:verificationCode', async (req: Request, res: Response) => {
      try {
        const { verificationCode } = req.params;
        // Forward to certificate verification endpoint
        const response = await fetch(`http://localhost:${config.server.port}/api/certificates/verify/${verificationCode}`);
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        logger.error(`Error verifying certificate: ${error}`);
        res.status(500).json({ error: 'Failed to verify certificate' });
      }
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(
      (
        err: any,
        req: Request,
        res: Response,
        next: Function
      ) => {
        logger.error(`Unhandled error: ${err.message}`);
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'production' ? undefined : err.message,
        });
      }
    );
  }

  async start(): Promise<void> {
    try {
      // Initialize Fabric connection
      await this.fabricService.initialize();

      const port = config.server.port as number;
      this.app.listen(port, '0.0.0.0', () => {
        logger.info(
          `🚀 Academic Records API Server started on port ${port}`
        );
        logger.info(`📊 Health check: http://localhost:${port}/health`);
      });
    } catch (error) {
      logger.error(`Failed to start server: ${error}`);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    await this.fabricService.disconnect();
    process.exit(0);
  }
}

/**
 * Generate demo JWT token
 * In production, this would be replaced with proper Fabric MSP authentication
 */
function generateDemoToken(userID: string, mspID: string): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: userID,
      mspID,
      organization: getOrganizationName(mspID),
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Map MSP ID to organization name
 */
function getOrganizationName(mspID: string): string {
  const orgMap: Record<string, string> = {
    NITWarangalMSP: 'NIT Warangal',
    StudentsMSP: 'Students',
    VerifiersMSP: 'Verifiers',
  };
  return orgMap[mspID] || mspID;
}

// Start server
const server = new Server();
server.start().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => server.shutdown());
process.on('SIGTERM', () => server.shutdown());

export default server;
