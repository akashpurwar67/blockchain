import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FabricService } from '../services/fabric.service';
import { addStudent, getAllStudents as getAllStoredStudents, getStudentById as getStoredStudentById, updateStudent as updateStoredStudent } from '../services/student-storage.service';
import logger from '../config/logger';

export class StudentController {
  private fabricService: FabricService;

  constructor() {
    this.fabricService = new FabricService();
  }

  /**
   * Create a new student
   */
  async createStudent(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, name, email, department, gpa, enrollmentDate, notes } = req.body;

      console.log('\n' + '═'.repeat(70));
      console.log('📝 STUDENT CREATION');
      console.log('═'.repeat(70));
      console.log(`🆔 Student ID: ${studentId}`);
      console.log(`📚 Name: ${name}`);
      console.log(`📧 Email: ${email}`);
      console.log(`🏢 Department: ${department}`);
      if (gpa) console.log(`📊 GPA: ${gpa}`);
      if (enrollmentDate) console.log(`📅 Enrollment Date: ${enrollmentDate}`);
      if (notes) console.log(`📝 Notes: ${notes}`);
      console.log('═'.repeat(70));

      logger.info(`[CREATE STUDENT] Request body:`, JSON.stringify(req.body));
      logger.info(`[CREATE STUDENT] Extracted: gpa=${gpa}, enrollmentDate=${enrollmentDate}, notes=${notes}`);

      // Validate input
      if (!studentId || !name || !email || !department) {
        res.status(400).json({ error: 'Missing required fields: studentId, name, email, department' });
        return;
      }

      logger.info(`Creating student: ${studentId}`);

      // Submit transaction to chaincode
      const result = await this.fabricService.submitTransaction(
        'CreateStudent',
        [studentId, name, email, department]
      );

      const student = JSON.parse(result.toString());

      // Save to persistent storage with all fields
      const studentData: any = {
        studentId,
        name,
        email,
        department,
        status: student.Status || 'ACTIVE',
        transactionId: student.TransactionID,
        createdAt: new Date().toISOString(),
        certificatesGenerated: [],
      };

      // Add all fields from request body that aren't empty
      if (gpa !== undefined && gpa !== '' && gpa !== null) {
        studentData.gpa = parseFloat(String(gpa));
        logger.info(`[CREATE STUDENT] Added gpa: ${studentData.gpa}`);
      }
      if (enrollmentDate !== undefined && enrollmentDate !== '') {
        studentData.enrollmentDate = enrollmentDate;
        logger.info(`[CREATE STUDENT] Added enrollmentDate: ${enrollmentDate}`);
      }
      if (notes !== undefined && notes !== '') {
        studentData.notes = notes;
        logger.info(`[CREATE STUDENT] Added notes: ${notes}`);
      }

      logger.info(`[CREATE STUDENT] Final studentData:`, JSON.stringify(studentData));
      const storedStudent = addStudent(studentData);

      console.log('\n✅ STUDENT CREATED SUCCESSFULLY');
      console.log(`Student ID: ${storedStudent.studentId}`);
      console.log(`Transaction ID: ${storedStudent.transactionId}`);
      console.log('\n');

      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: storedStudent,
      });
    } catch (error) {
      logger.error(`Error creating student: ${error}`);
      res.status(500).json({ error: 'Failed to create student' });
    }
  }

  /**
   * Get all students
   */
  async getAllStudents(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching all students from storage');

      // Get students from persistent storage instead of blockchain
      const students = getAllStoredStudents();
      logger.info(`Found ${students.length} students in storage`);

      res.status(200).json({
        success: true,
        data: students,
        count: students.length,
      });
    } catch (error) {
      logger.error(`Error fetching students: ${error}`);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  }

  /**
   * Get specific student
   */
  async getStudent(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required' });
        return;
      }

      logger.info(`Fetching student from storage: ${studentId}`);

      const student = getStoredStudentById(studentId);

      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: student,
      });
    } catch (error) {
      logger.error(`Error fetching student: ${error}`);
      res.status(404).json({ error: 'Student not found' });
    }
  }

  /**
   * Update student details
   */
  async updateStudent(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const { name, email, department, gpa, enrollmentDate, status, notes } = req.body;

      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required' });
        return;
      }

      logger.info(`Updating student: ${studentId}`);

      // Build update object with only provided fields
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (department !== undefined) updates.department = department;
      if (gpa !== undefined) updates.gpa = parseFloat(gpa);
      if (enrollmentDate !== undefined) updates.enrollmentDate = enrollmentDate;
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes;

      // Update in persistent storage
      const updatedStudent = updateStoredStudent(studentId, updates);

      if (!updatedStudent) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: updatedStudent,
      });
    } catch (error) {
      logger.error(`Error updating student: ${error}`);
      res.status(500).json({ error: 'Failed to update student' });
    }
  }

  /**
   * Update student status
   */
  async updateStudentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const { status } = req.body;

      if (!studentId || !status) {
        res.status(400).json({ error: 'Student ID and status are required' });
        return;
      }

      const validStatuses = ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'INACTIVE'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      logger.info(`Updating student status: ${studentId} -> ${status}`);

      // Update in storage
      const updatedStudent = updateStoredStudent(studentId, { status });

      if (!updatedStudent) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Student status updated successfully',
        data: updatedStudent,
      });
    } catch (error) {
      logger.error(`Error updating student status: ${error}`);
      res.status(500).json({ error: 'Failed to update student status' });
    }
  }
}

export default StudentController;
