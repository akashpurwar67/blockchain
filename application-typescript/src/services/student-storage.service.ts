import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

interface StudentRecord {
  studentId: string;
  name: string;
  email: string;
  department: string;
  status?: string;
  gpa?: number;
  enrollmentDate?: string;
  createdAt: string;
  updatedAt?: string;
  transactionId?: string;
  certificatesGenerated?: {
    certificateId: string;
    type: string;
    issuedDate: string;
    verified: boolean;
    verificationCode?: string;
  }[];
  notes?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

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
 * Load all students from file
 */
export const loadStudents = (): StudentRecord[] => {
  try {
    ensureDataDir();
    if (fs.existsSync(STUDENTS_FILE)) {
      const data = fs.readFileSync(STUDENTS_FILE, 'utf-8');
      const students = JSON.parse(data);
      logger.info(`Loaded ${students.length} students from file`);
      return students;
    }
    return [];
  } catch (error) {
    logger.error(`Error loading students: ${error}`);
    return [];
  }
};

/**
 * Save all students to file
 */
export const saveStudents = (students: StudentRecord[]): void => {
  try {
    ensureDataDir();
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf-8');
    logger.info(`Saved ${students.length} students to file`);
  } catch (error) {
    logger.error(`Error saving students: ${error}`);
  }
};

/**
 * Add a new student
 */
export const addStudent = (student: StudentRecord): StudentRecord => {
  const students = loadStudents();
  const newStudent: StudentRecord = {
    ...student,
    createdAt: new Date().toISOString(),
  };
  students.push(newStudent);
  saveStudents(students);
  logger.info(`Added student: ${student.studentId}`);
  return newStudent;
};

/**
 * Get all students
 */
export const getAllStudents = (): StudentRecord[] => {
  return loadStudents();
};

/**
 * Get student by ID
 */
export const getStudentById = (studentId: string): StudentRecord | undefined => {
  const students = loadStudents();
  return students.find(s => s.studentId === studentId);
};

/**
 * Update student
 */
export const updateStudent = (studentId: string, updates: Partial<StudentRecord>): StudentRecord | undefined => {
  const students = loadStudents();
  const index = students.findIndex(s => s.studentId === studentId);
  
  if (index === -1) return undefined;
  
  students[index] = { 
    ...students[index], 
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveStudents(students);
  logger.info(`Updated student: ${studentId}`);
  return students[index];
};

/**
 * Delete student
 */
export const deleteStudent = (studentId: string): boolean => {
  const students = loadStudents();
  const index = students.findIndex(s => s.studentId === studentId);
  
  if (index === -1) return false;
  
  students.splice(index, 1);
  saveStudents(students);
  logger.info(`Deleted student: ${studentId}`);
  return true;
};
