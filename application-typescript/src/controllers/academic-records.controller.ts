import { Request, Response } from 'express';
import logger from '../config/logger';
import {
  addOrUpdateAcademicRecord,
  getAcademicRecordsByStudentId,
  getAcademicRecord,
  calculateCumulativeGPA,
  getAllAcademicRecords,
  deleteAcademicRecord,
} from '../services/academic-records.service';
import type { AcademicRecord } from '../services/academic-records.service';

export class AcademicRecordsController {
  /**
   * Add or update academic record with subjects and marks
   */
  async addOrUpdateAcademicRecord(req: Request, res: Response): Promise<void> {
    try {
      const {
        studentId,
        semester,
        academicYear,
        subjects,
      } = req.body;

      // Validate input
      if (!studentId || !semester || !academicYear || !subjects || !Array.isArray(subjects)) {
        res.status(400).json({
          error: 'Missing required fields: studentId, semester, academicYear, subjects (array)',
        });
        return;
      }

      // Validate subjects
      for (const subject of subjects) {
        if (
          !subject.subjectCode ||
          !subject.subjectName ||
          !subject.credits ||
          subject.marksObtained === undefined ||
          subject.marksTotal === undefined
        ) {
          res.status(400).json({
            error: 'Each subject must have: subjectCode, subjectName, credits, marksObtained, marksTotal',
          });
          return;
        }

        // Validate marks
        if (subject.marksObtained > subject.marksTotal) {
          res.status(400).json({
            error: `Invalid marks for ${subject.subjectName}: obtained marks cannot exceed total marks`,
          });
          return;
        }

        if (subject.marksObtained < 0 || subject.marksTotal < 0) {
          res.status(400).json({
            error: `Invalid marks for ${subject.subjectName}: marks cannot be negative`,
          });
          return;
        }
      }

      console.log('\n' + '═'.repeat(70));
      console.log('📚 SEMESTER/ACADEMIC RECORD ADDED');
      console.log('═'.repeat(70));
      console.log(`🆔 Student ID: ${studentId}`);
      console.log(`📖 Semester: ${semester}`);
      console.log(`📅 Academic Year: ${academicYear}`);
      console.log(`📊 Total Subjects: ${subjects.length}`);
      subjects.forEach((subj: any, idx: number) => {
        console.log(`   ${idx + 1}. ${subj.subjectName} (${subj.subjectCode})`);
        console.log(`      Credits: ${subj.credits}, Marks: ${subj.marksObtained}/${subj.marksTotal}`);
        const percentage = ((subj.marksObtained / subj.marksTotal) * 100).toFixed(2);
        console.log(`      Percentage: ${percentage}%`);
      });
      console.log('═'.repeat(70));

      logger.info(`Adding/Updating academic record for student: ${studentId}`);

      const record: AcademicRecord = {
        studentId,
        semester,
        academicYear,
        subjects,
        createdAt: new Date().toISOString(),
      };

      const savedRecord = addOrUpdateAcademicRecord(record);

      console.log('\n✅ ACADEMIC RECORD SAVED SUCCESSFULLY');
      console.log(`Record ID: ${studentId}-Sem${semester}`);
      console.log('\n');

      res.status(201).json({
        success: true,
        message: 'Academic record added/updated successfully',
        data: savedRecord,
      });
    } catch (error) {
      logger.error(`Error adding/updating academic record: ${error}`);
      res.status(500).json({ error: 'Failed to add/update academic record' });
    }
  }

  /**
   * Get all academic records for a student
   */
  async getStudentAcademicRecords(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required' });
        return;
      }

      logger.info(`Fetching academic records for student: ${studentId}`);

      const records = getAcademicRecordsByStudentId(studentId);
      const cumulativeGPA = calculateCumulativeGPA(studentId);

      // Return flat array format that frontend expects
      res.status(200).json(records.length > 0 ? records : []);
    } catch (error) {
      logger.error(`Error fetching academic records: ${error}`);
      res.status(500).json({ error: 'Failed to fetch academic records' });
    }
  }

  /**
   * Get specific academic record for a student
   */
  async getAcademicRecord(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, semester, academicYear } = req.params;

      if (!studentId || !semester || !academicYear) {
        res.status(400).json({ error: 'Student ID, semester, and academic year are required' });
        return;
      }

      logger.info(`Fetching academic record: ${studentId} - ${semester} - ${academicYear}`);

      const record = getAcademicRecord(studentId, semester, academicYear);

      if (!record) {
        res.status(404).json({ error: 'Academic record not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      logger.error(`Error fetching academic record: ${error}`);
      res.status(500).json({ error: 'Failed to fetch academic record' });
    }
  }

  /**
   * Get marksheet data for a student (formatted for certificate)
   */
  async getMarksheetData(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required' });
        return;
      }

      logger.info(`Fetching marksheet data for student: ${studentId}`);

      const records = getAcademicRecordsByStudentId(studentId);
      const cumulativeGPA = calculateCumulativeGPA(studentId);

      // Calculate aggregate data across all semesters
      let totalMarksOverall = 0;
      let totalMarksMaxOverall = 0;
      let totalCreditsOverall = 0;
      let semesterCount = 0;
      const allSubjects: any[] = [];

      records.forEach(record => {
        totalMarksOverall += record.totalMarks ?? 0;
        totalMarksMaxOverall += record.totalMarksMax ?? 0;
        totalCreditsOverall += record.totalCredits ?? 0;
        semesterCount++;
        
        // Collect all subjects from all semesters
        if (record.subjects) {
          allSubjects.push(...record.subjects.map(s => ({
            ...s,
            semester: record.semester,
            academicYear: record.academicYear,
          })));
        }
      });

      const overallPercentage = totalMarksMaxOverall > 0 
        ? (totalMarksOverall / totalMarksMaxOverall) * 100 
        : 0;

      // Format for marksheet certificate with aggregated data
      const marksheetData = {
        semesters: records.map(record => ({
          semester: record.semester,
          academicYear: record.academicYear,
          totalMarks: record.totalMarks ?? 0,
          totalMarksMax: record.totalMarksMax ?? 0,
          percentage: record.totalMarksMax ? (((record.totalMarks ?? 0) / record.totalMarksMax) * 100).toFixed(1) : '0',
          gpa: record.gpaForSemester,
          credits: record.totalCredits,
        })),
        aggregateData: {
          totalSemesters: semesterCount,
          totalMarks: totalMarksOverall,
          totalMarksMax: totalMarksMaxOverall,
          overallPercentage: overallPercentage.toFixed(1),
          averageGPA: cumulativeGPA,
          totalCredits: totalCreditsOverall,
        },
        allSubjects: allSubjects,
      };

      res.status(200).json({
        success: true,
        studentId,
        marksheetData,
        cumulativeGPA,
        totalSemesters: records.length,
      });
    } catch (error) {
      logger.error(`Error fetching marksheet data: ${error}`);
      res.status(500).json({ error: 'Failed to fetch marksheet data' });
    }
  }

  /**
   * Get all academic records (for admin/verification)
   */
  async getAllAcademicRecords(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching all academic records');

      const records = getAllAcademicRecords();

      res.status(200).json({
        success: true,
        data: records,
        count: records.length,
      });
    } catch (error) {
      logger.error(`Error fetching all academic records: ${error}`);
      res.status(500).json({ error: 'Failed to fetch academic records' });
    }
  }

  /**
   * Delete academic record
   */
  async deleteAcademicRecord(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, semester, academicYear } = req.params;

      if (!studentId || !semester || !academicYear) {
        res.status(400).json({ error: 'Student ID, semester, and academic year are required' });
        return;
      }

      logger.info(`Deleting academic record: ${studentId} - ${semester} - ${academicYear}`);

      const deleted = deleteAcademicRecord(studentId, semester, academicYear);

      if (!deleted) {
        res.status(404).json({ error: 'Academic record not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Academic record deleted successfully',
      });
    } catch (error) {
      logger.error(`Error deleting academic record: ${error}`);
      res.status(500).json({ error: 'Failed to delete academic record' });
    }
  }
}

export default AcademicRecordsController;
