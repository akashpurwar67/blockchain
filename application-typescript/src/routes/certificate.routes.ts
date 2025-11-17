import { Router, Request, Response } from 'express';
import { CertificateController } from '../controllers/certificate.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const certificateController = new CertificateController();

/**
 * Generate certificate and verification code
 * POST /api/certificates/generate
 * Body: { studentID, studentName, certificateName, certificateType, issueDate }
 */
router.post('/generate',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await certificateController.generateCertificate(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Verify certificate using verification code
 * GET /api/certificates/verify/:verificationCode
 */
router.get('/verify/:verificationCode',
  async (req: Request, res: Response) => {
    try {
      const result = await certificateController.verifyCertificate(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Get certificate details
 * GET /api/certificates/:certificateId
 */
router.get('/:certificateId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await certificateController.getCertificate(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Get all certificates for a student
 * GET /api/certificates/student/:studentId
 */
router.get('/student/:studentId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await certificateController.getStudentCertificates(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
