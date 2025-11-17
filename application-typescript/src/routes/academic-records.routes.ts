import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import AcademicRecordsController from '../controllers/academic-records.controller';

const router = Router();
const controller = new AcademicRecordsController();

/**
 * POST /api/academic-records
 * Add or update academic record with subjects and marks
 * Auth: Required
 */
router.post(
  '/',
  authMiddleware,
  (req: Request, res: Response) => controller.addOrUpdateAcademicRecord(req, res)
);

/**
 * GET /api/academic-records/marksheet/:studentId
 * Get academic records formatted for marksheet certificate
 * Auth: Required
 */
router.get(
  '/marksheet/:studentId',
  authMiddleware,
  (req: Request, res: Response) => controller.getMarksheetData(req, res)
);

/**
 * GET /api/academic-records/student/:studentId
 * Get all academic records for a student
 * Auth: Required
 */
router.get(
  '/student/:studentId',
  authMiddleware,
  (req: Request, res: Response) => controller.getStudentAcademicRecords(req, res)
);

/**
 * GET /api/academic-records/:studentId/:semester/:academicYear
 * Get specific academic record
 * Auth: Required
 */
router.get(
  '/:studentId/:semester/:academicYear',
  authMiddleware,
  (req: Request, res: Response) => controller.getAcademicRecord(req, res)
);

/**
 * GET /api/academic-records
 * Get all academic records (admin only)
 * Auth: Required
 */
router.get(
  '/',
  authMiddleware,
  (req: Request, res: Response) => controller.getAllAcademicRecords(req, res)
);

/**
 * DELETE /api/academic-records/:studentId/:semester/:academicYear
 * Delete specific academic record
 * Auth: Required
 */
router.delete(
  '/:studentId/:semester/:academicYear',
  authMiddleware,
  (req: Request, res: Response) => controller.deleteAcademicRecord(req, res)
);

export default router;
