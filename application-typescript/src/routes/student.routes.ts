import { Router, Request, Response } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { organizationCheck } from '../middleware/organization.middleware';

const router = Router();
const studentController = new StudentController();

/**
 * Create a new student (NITWarangal only)
 * POST /api/students
 */
router.post('/', 
  authMiddleware, 
  organizationCheck('NITWarangalMSP'),
  async (req: Request, res: Response) => {
    try {
      const result = await studentController.createStudent(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Get all students
 * GET /api/students
 */
router.get('/', 
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await studentController.getAllStudents(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Get specific student
 * GET /api/students/:studentId
 */
router.get('/:studentId', 
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await studentController.getStudent(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Update student details (NITWarangal only)
 * PUT /api/students/:studentId
 */
router.put('/:studentId', 
  authMiddleware,
  organizationCheck('NITWarangalMSP'),
  async (req: Request, res: Response) => {
    try {
      const result = await studentController.updateStudent(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Update student status (NITWarangal only)
 * PATCH /api/students/:studentId/status
 */
router.patch('/:studentId/status', 
  authMiddleware,
  organizationCheck('NITWarangalMSP'),
  async (req: Request, res: Response) => {
    try {
      const result = await studentController.updateStudentStatus(req, res);
      return result;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
