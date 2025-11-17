import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

export interface Subject {
  subjectCode: string;
  subjectName: string;
  credits: number;
  marksObtained: number;
  marksTotal: number;
  grade?: string;
  gradePoint?: number;
}

export interface AcademicRecord {
  studentId: string;
  semester: string;
  academicYear: string;
  subjects: Subject[];
  totalCredits?: number;
  totalMarks?: number;
  totalMarksMax?: number;
  gpaForSemester?: number;
  cumulativeGPA?: number;
  createdAt: string;
  updatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const ACADEMIC_RECORDS_FILE = path.join(DATA_DIR, 'academic-records.json');

/**
 * Ensure data directory exists
 */
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info(`Created data directory: ${DATA_DIR}`);
  }
};

/**
 * Load all academic records from file
 */
export const loadAcademicRecords = (): AcademicRecord[] => {
  try {
    ensureDataDir();
    if (fs.existsSync(ACADEMIC_RECORDS_FILE)) {
      const data = fs.readFileSync(ACADEMIC_RECORDS_FILE, 'utf-8');
      const records = JSON.parse(data);
      logger.info(`Loaded ${records.length} academic records from file`);
      return records;
    }
    return [];
  } catch (error) {
    logger.error(`Error loading academic records: ${error}`);
    return [];
  }
};

/**
 * Save all academic records to file
 */
export const saveAcademicRecords = (records: AcademicRecord[]): void => {
  try {
    ensureDataDir();
    fs.writeFileSync(ACADEMIC_RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
    logger.info(`Saved ${records.length} academic records to file`);
  } catch (error) {
    logger.error(`Error saving academic records: ${error}`);
  }
};

/**
 * Calculate grade based on marks
 */
export const calculateGrade = (marksObtained: number, marksTotal: number): { grade: string; gradePoint: number } => {
  const percentage = (marksObtained / marksTotal) * 100;

  if (percentage >= 90) return { grade: 'A+', gradePoint: 10 };
  if (percentage >= 80) return { grade: 'A', gradePoint: 9 };
  if (percentage >= 70) return { grade: 'B+', gradePoint: 8 };
  if (percentage >= 60) return { grade: 'B', gradePoint: 7 };
  if (percentage >= 50) return { grade: 'C+', gradePoint: 6 };
  if (percentage >= 40) return { grade: 'C', gradePoint: 5 };
  return { grade: 'F', gradePoint: 0 };
};

/**
 * Calculate semester GPA (out of 10)
 */
export const calculateSemesterGPA = (subjects: Subject[]): number => {
  if (subjects.length === 0) return 0;

  let totalWeightedGradePoints = 0;
  let totalCredits = 0;

  for (const subject of subjects) {
    const gradeInfo = calculateGrade(subject.marksObtained, subject.marksTotal);
    const weightedPoints = gradeInfo.gradePoint * subject.credits;
    totalWeightedGradePoints += weightedPoints;
    totalCredits += subject.credits;
  }

  if (totalCredits === 0) return 0;
  const gpa = totalWeightedGradePoints / totalCredits;
  return Math.round(gpa * 100) / 100; // Round to 2 decimal places
};

/**
 * Add or update academic record
 */
export const addOrUpdateAcademicRecord = (record: AcademicRecord): AcademicRecord => {
  const records = loadAcademicRecords();
  
  // Calculate grades for each subject
  const subjectsWithGrades = record.subjects.map(subject => {
    const gradeInfo = calculateGrade(subject.marksObtained, subject.marksTotal);
    return {
      ...subject,
      grade: gradeInfo.grade,
      gradePoint: gradeInfo.gradePoint,
    };
  });

  // Calculate semester GPA
  const gpaForSemester = calculateSemesterGPA(subjectsWithGrades);

  // Calculate total marks
  const totalMarks = subjectsWithGrades.reduce((sum, s) => sum + s.marksObtained, 0);
  const totalMarksMax = subjectsWithGrades.reduce((sum, s) => sum + s.marksTotal, 0);
  const totalCredits = subjectsWithGrades.reduce((sum, s) => sum + s.credits, 0);

  const updatedRecord: AcademicRecord = {
    ...record,
    subjects: subjectsWithGrades,
    gpaForSemester,
    totalMarks,
    totalMarksMax,
    totalCredits,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Find and update or add new record
  const index = records.findIndex(
    r => r.studentId === record.studentId && 
         r.semester === record.semester && 
         r.academicYear === record.academicYear
  );

  if (index !== -1) {
    records[index] = updatedRecord;
  } else {
    records.push(updatedRecord);
  }

  saveAcademicRecords(records);
  logger.info(`Added/Updated academic record for student: ${record.studentId}`);
  return updatedRecord;
};

/**
 * Get academic records by student ID
 */
export const getAcademicRecordsByStudentId = (studentId: string): AcademicRecord[] => {
  const records = loadAcademicRecords();
  return records.filter(r => r.studentId === studentId);
};

/**
 * Get specific academic record
 */
export const getAcademicRecord = (
  studentId: string,
  semester: string,
  academicYear: string
): AcademicRecord | undefined => {
  const records = loadAcademicRecords();
  return records.find(
    r => r.studentId === studentId && r.semester === semester && r.academicYear === academicYear
  );
};

/**
 * Calculate cumulative GPA from all semesters
 */
export const calculateCumulativeGPA = (studentId: string): number => {
  const records = getAcademicRecordsByStudentId(studentId);
  
  if (records.length === 0) return 0;

  let totalWeightedPoints = 0;
  let totalCredits = 0;

  for (const record of records) {
    const recordWeightedPoints = (record.gpaForSemester || 0) * (record.totalCredits || 0);
    totalWeightedPoints += recordWeightedPoints;
    totalCredits += record.totalCredits || 0;
  }

  if (totalCredits === 0) return 0;
  const cumulativeGPA = totalWeightedPoints / totalCredits;
  return Math.round(cumulativeGPA * 100) / 100; // Round to 2 decimal places
};

/**
 * Get all academic records (for marksheet)
 */
export const getAllAcademicRecords = (): AcademicRecord[] => {
  return loadAcademicRecords();
};

/**
 * Delete academic record
 */
export const deleteAcademicRecord = (
  studentId: string,
  semester: string,
  academicYear: string
): boolean => {
  const records = loadAcademicRecords();
  const index = records.findIndex(
    r => r.studentId === studentId && r.semester === semester && r.academicYear === academicYear
  );

  if (index === -1) return false;

  records.splice(index, 1);
  saveAcademicRecords(records);
  logger.info(`Deleted academic record for student: ${studentId}`);
  return true;
};
