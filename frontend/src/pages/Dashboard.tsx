import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Dashboard.css';
import AcademicRecords from '../components/AcademicRecords';

interface Student {
  studentId: string;
  name: string;
  email: string;
  status: string;
  department?: string;
  gpa?: number;
  enrollmentDate?: string;
  createdAt?: string;
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

interface DashboardProps {
  token: string;
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ token, onLogout }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();

  // New student form state
  const [newStudent, setNewStudent] = useState({
    studentId: '',
    name: '',
    email: '',
    department: '',
    gpa: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Update student form state
  const [updateForm, setUpdateForm] = useState({
    name: '',
    email: '',
    department: '',
    gpa: '',
    status: '',
    enrollmentDate: '',
    notes: '',
  });

  const [newStatus, setNewStatus] = useState('');
  const [certModal, setCertModal] = useState<{ isOpen: boolean; type: string; data: any }>({
    isOpen: false,
    type: '',
    data: null,
  });

  // Certificate creation form state
  const [certForm, setCertForm] = useState({
    certificateName: '',
    certificateType: 'Academic',
    issueDate: new Date().toISOString().split('T')[0],
    certificateDescription: '',
  });
  const [certLoading, setCertLoading] = useState(false);
  const [studentCertificates, setStudentCertificates] = useState<any[]>([]);

  useEffect(() => {
    console.log('[Dashboard] Component mounted');
    console.log('[Dashboard] Props received:', { tokenLength: token?.length, hasLogout: !!onLogout });
    fetchStudents();
    decodeToken();
  }, []);

  const decodeToken = () => {
    try {
      console.log('[Dashboard] decodeToken called');
      const parts = token.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1]));
        console.log('[Dashboard] Token decoded:', decoded);
        setUserRole(decoded.mspID || '');
      } else {
        console.error('[Dashboard] Invalid token format');
      }
    } catch (err) {
      console.error('[Dashboard] Failed to decode token:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      console.log('[Dashboard] fetchStudents called');
      setLoading(true);
      setError('');
      console.log('[Dashboard] Token:', token.substring(0, 20) + '...');
      const response = await axios.get('http://localhost:4000/api/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Dashboard] Students fetched:', response.data);
      
      let studentList: Student[] = [];
      if (response.data.data) {
        if (Array.isArray(response.data.data)) {
          console.log('[Dashboard] Data is an array');
          studentList = response.data.data;
        } else if (typeof response.data.data === 'object') {
          console.log('[Dashboard] Data is an object (blockchain verification), using empty list');
          studentList = [];
        }
      }
      console.log('[Dashboard] Final student list:', studentList);
      setStudents(studentList);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load students';
      console.error('[Dashboard] Error fetching students:', errorMsg);
      console.error('[Dashboard] Full error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Dashboard] handleCreateStudent called');
    console.log('[Dashboard] Student data:', newStudent);
    try {
      console.log('[Dashboard] Sending POST to /api/students');
      const response = await axios.post(
        'http://localhost:4000/api/students',
        newStudent,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[Dashboard] Student created successfully:', response.data);
      const newStudentData = response.data.data;
      console.log('[Dashboard] New student data to add:', newStudentData);
      if (newStudentData) {
        // Data is already in the correct Student format
        console.log('[Dashboard] Adding student to list:', newStudentData);
        setStudents([...students, newStudentData]);
        console.log('[Dashboard] Student added to list');
      }
      setNewStudent({
        studentId: '',
        name: '',
        email: '',
        department: '',
        gpa: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowCreateForm(false);
      setError('');
      console.log('[Dashboard] Form reset and closed');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create student';
      console.error('[Dashboard] Error creating student:', errorMsg);
      console.error('[Dashboard] Full error:', err);
      setError(errorMsg);
    }
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) {
      setError('Please select a student first');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await axios.put(
        `http://localhost:4000/api/students/${selectedStudent.studentId}`,
        updateForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(
        students.map((s) =>
          s.studentId === selectedStudent.studentId
            ? response.data.data
            : s
        )
      );
      setSelectedStudent(response.data.data);
      setError('');
      alert('Student information updated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update student';
      setError(errorMsg);
      alert('Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStudent || !newStatus) return;
    try {
      const response = await axios.patch(
        `http://localhost:4000/api/students/${selectedStudent.studentId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(
        students.map((s) =>
          s.studentId === selectedStudent.studentId
            ? response.data.data
            : s
        )
      );
      setSelectedStudent(response.data.data);
      setNewStatus('');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setUpdateForm({
      name: student.name || '',
      email: student.email || '',
      department: student.department || '',
      gpa: student.gpa ? String(student.gpa) : '',
      status: student.status || '',
      enrollmentDate: student.enrollmentDate || '',
      notes: student.notes || '',
    });
    setActiveTab('details');
    
    // Fetch certificates for this student
    fetchStudentCertificates(student.studentId);
  };

  const fetchStudentCertificates = async (studentId: string) => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/certificates/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.certificates) {
        setStudentCertificates(response.data.certificates);
        console.log(`[Dashboard] Fetched ${response.data.certificates.length} certificates for student ${studentId}`);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching certificates:', error);
      setStudentCertificates([]);
    }
  };

  const handleDownloadCertificate = (certName: string) => {
    // Create a mock certificate download
    const certificateContent = `
CERTIFICATE OF ACHIEVEMENT

Student Name: ${selectedStudent?.name || 'N/A'}
Student ID: ${selectedStudent?.studentId || 'N/A'}
Certificate: ${certName}
Issue Date: ${new Date().toLocaleDateString()}

This is to certify that the above named student has successfully completed the requirements for the ${certName}.

Issued by: NIT Warangal Academic Affairs
Digital Verification Code: ${Math.random().toString(36).substring(2, 11).toUpperCase()}

Authorized by:
[Dean - Academic Affairs]
[Registrar]
    `.trim();

    const element = document.createElement('a');
    const file = new Blob([certificateContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedStudent?.name}_${certName.replace(/\s+/g, '_')}_Certificate.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleViewDetails = (certName: string) => {
    setCertModal({
      isOpen: true,
      type: 'details',
      data: {
        name: certName,
        studentName: selectedStudent?.name,
        studentId: selectedStudent?.studentId,
        issueDate: new Date().toLocaleDateString(),
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toLocaleDateString(),
      },
    });
  };

  const handleVerifyCredential = async (certName: string) => {
    if (!selectedStudent) return;
    
    try {
      // Call backend to generate a certificate with verification code
      const response = await axios.post(
        'http://localhost:4000/api/certificates/generate',
        {
          studentID: selectedStudent.studentId,
          studentName: selectedStudent.name,
          certificateName: certName,
          certificateType: 'Academic',
          issueDate: new Date().toISOString().split('T')[0],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { certificate, verificationUrl, blockchainStatus, blockchainDetails } = response.data;

      setCertModal({
        isOpen: true,
        type: 'verify',
        data: {
          name: certName,
          studentName: selectedStudent?.name,
          verificationCode: certificate.verificationCode,
          verificationUrl,
          verified: true,
          blockchainStatus,
          blockchainHash: blockchainDetails?.CertificateHash || certificate.blockchainHash,
        },
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      // Fallback to demo mode
      const verificationCode = Math.random().toString(36).substring(2, 11).toUpperCase();
      setCertModal({
        isOpen: true,
        type: 'verify',
        data: {
          name: certName,
          studentName: selectedStudent?.name,
          verificationCode,
          verificationUrl: `http://localhost:4000/verify/${verificationCode}`,
          verified: true,
          blockchainStatus: 'OFFLINE',
        },
      });
    }
  };

  const handleCreateCertificate = async () => {
    if (!selectedStudent || !certForm.certificateName) {
      setError('Please select a student and enter certificate name');
      return;
    }

    try {
      setCertLoading(true);
      setError('');

      const payload: any = {
        studentID: selectedStudent.studentId,
        studentName: selectedStudent.name,
        certificateName: certForm.certificateName,
        certificateType: certForm.certificateType,
        issueDate: certForm.issueDate,
      };

      // If this is a marksheet certificate, fetch academic records
      if (certForm.certificateType === 'Marksheet') {
        try {
          const academicResponse = await axios.get(
            `http://localhost:4000/api/academic-records/marksheet/${selectedStudent.studentId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (academicResponse.data.marksheetData) {
            payload.isMarksheet = true;
            payload.marksheetData = academicResponse.data.marksheetData;
            console.log('[Dashboard] Marksheet data attached:', payload.marksheetData);
          } else {
            setError('No academic records found for this student. Please add semester records first.');
            setCertLoading(false);
            return;
          }
        } catch (academicError) {
          console.error('[Dashboard] Error fetching academic records for marksheet:', academicError);
          setError('Could not fetch academic records for marksheet');
          setCertLoading(false);
          return;
        }
      }

      const response = await axios.post(
        'http://localhost:4000/api/certificates/generate',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { certificate, verificationUrl, blockchainStatus, blockchainDetails } = response.data;

      // Show success modal with certificate details
      setCertModal({
        isOpen: true,
        type: 'verify',
        data: {
          name: certForm.certificateName,
          studentName: selectedStudent?.name,
          verificationCode: certificate.verificationCode,
          verificationUrl,
          verified: true,
          blockchainStatus,
          blockchainHash: blockchainDetails?.CertificateHash || certificate.blockchainHash,
        },
      });

      // Reset form
      setCertForm({
        certificateName: '',
        certificateType: 'Academic',
        issueDate: new Date().toISOString().split('T')[0],
        certificateDescription: '',
      });

      // Refresh certificates list
      if (selectedStudent) {
        await fetchStudentCertificates(selectedStudent.studentId);
      }

      setError('');
    } catch (error: any) {
      console.error('Error creating certificate:', error);
      setError(error.response?.data?.error || 'Failed to create certificate');
    } finally {
      setCertLoading(false);
    }
  };

  const isAdmin = userRole.includes('MSP');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Academic Records System</h1>
          <p className="subtitle">NIT Warangal Blockchain</p>
          <p className="user-info">Organization: {userRole || 'Loading...'}</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Students List
        </button>
        {selectedStudent && (
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            👤 Student Details
          </button>
        )}
        {selectedStudent && (
          <button
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            📚 Academic Records
          </button>
        )}
        {selectedStudent && (
          <button
            className={`tab-btn ${activeTab === 'certificates' ? 'active' : ''}`}
            onClick={() => setActiveTab('certificates')}
          >
            🏆 Certificates
          </button>
        )}
      </div>

      <div className="dashboard-content">
        {error && <div className="error-message">{error}</div>}

        {/* Students List Tab */}
        {activeTab === 'list' && (
          <div className="tab-content">
            <div className="list-header">
              <h2>Students</h2>
              {isAdmin && (
                <button
                  className="btn-primary"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {showCreateForm ? '❌ Cancel' : '➕ Add Student'}
                </button>
              )}
            </div>

            {showCreateForm && isAdmin && (
              <form className="form-card" onSubmit={handleCreateStudent}>
                <h3>Create New Student</h3>
                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    type="text"
                    value={newStudent.studentId}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, studentId: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={newStudent.department}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, department: e.target.value })
                    }
                  />
                </div>
                <button type="submit" className="btn-submit">
                  Create Student
                </button>
              </form>
            )}

            {loading ? (
              <p className="loading">Loading students...</p>
            ) : (
              <div className="students-grid">
                {students.length > 0 ? (
                  students.map((student) => (
                    <div
                      key={student.studentId}
                      className={`student-card ${
                        selectedStudent?.studentId === student.studentId
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() => handleSelectStudent(student)}
                    >
                      <div className="student-card-header">
                        <h3>{student.name}</h3>
                        <span className={`status-badge ${student?.status?.toLowerCase() || 'active'}`}>
                          {student?.status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="student-id">ID: {student.studentId}</p>
                      <p className="student-email">📧 {student.email}</p>
                      {student.department && (
                        <p className="student-dept">🏢 {student.department}</p>
                      )}
                      {student.gpa !== undefined && student.gpa !== null && (
                        <p className="student-gpa">GPA: {student.gpa.toFixed(2)}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-data">No students found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Student Details Tab */}
        {activeTab === 'details' && selectedStudent && (
          <div className="tab-content">
            <h2>Student Details - {selectedStudent.name}</h2>
            <div className="details-container">
              <div className="details-section">
                <h3>Personal Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Student ID</label>
                    <p>{selectedStudent.studentId}</p>
                  </div>
                  <div className="detail-item">
                    <label>Name</label>
                    <p>{selectedStudent.name}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <p>{selectedStudent.email}</p>
                  </div>
                  <div className="detail-item">
                    <label>Department</label>
                    <p>{selectedStudent.department || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Enrollment Date</label>
                    <p>
                      {selectedStudent.createdAt
                        ? new Date(selectedStudent.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="detail-item">
                    <label>GPA</label>
                    <p>{selectedStudent.gpa !== undefined && selectedStudent.gpa !== null ? selectedStudent.gpa.toFixed(2) : 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Current Status</label>
                    <p className={`status-badge ${selectedStudent?.status?.toLowerCase() || 'active'}`}>
                      {selectedStudent?.status || 'ACTIVE'}
                    </p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <>
                  <div className="details-section">
                    <h3>Update Student Information</h3>
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={updateForm.name}
                        onChange={(e) =>
                          setUpdateForm({ ...updateForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={updateForm.email}
                        onChange={(e) =>
                          setUpdateForm({ ...updateForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <input
                        type="text"
                        value={updateForm.department}
                        onChange={(e) =>
                          setUpdateForm({ ...updateForm, department: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>GPA</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={updateForm.gpa}
                        onChange={(e) =>
                          setUpdateForm({ ...updateForm, gpa: e.target.value })
                        }
                      />
                    </div>
                    <button 
                      className="btn-submit" 
                      onClick={handleUpdateStudent}
                      disabled={loading || !selectedStudent}
                      title={!selectedStudent ? 'Please select a student first' : 'Click to update student information'}
                    >
                      {loading ? '⏳ Updating...' : 'Update Information'}
                    </button>
                  </div>

                  <div className="details-section">
                    <h3>Update Student Status</h3>
                    <div className="form-group">
                      <label>New Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="">Select status...</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="GRADUATED">Graduated</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="TRANSFERRED">Transferred</option>
                      </select>
                    </div>
                    <button 
                      className="btn-submit" 
                      onClick={handleUpdateStatus}
                      disabled={loading || !selectedStudent || !newStatus}
                      title={!selectedStudent ? 'Please select a student first' : !newStatus ? 'Please select a status' : 'Click to update status'}
                    >
                      {loading ? '⏳ Updating...' : 'Update Status'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Academic Records Tab */}
        {activeTab === 'records' && selectedStudent && (
          <div className="tab-content">
            <AcademicRecords
              studentId={selectedStudent.studentId}
              studentName={selectedStudent.name}
              token={token}
            />
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && selectedStudent && (
          <div className="tab-content">
            <h2>Certificates & Credentials - {selectedStudent.name}</h2>
            <div className="certificates-container">
              {studentCertificates && studentCertificates.length > 0 ? (
                studentCertificates.map((cert, index) => (
                  <div key={index} className="cert-card">
                    <div className="cert-header">
                      <h3>📜 {cert.certificateName}</h3>
                      <span className="cert-status">{cert.certificateType}</span>
                    </div>
                    <div className="cert-details">
                      <p>
                        <strong>Type:</strong> {cert.certificateType}
                      </p>
                      <p>
                        <strong>Issue Date:</strong> {new Date(cert.issueDate).toLocaleDateString()}
                      </p>
                      {cert.expiryDate && (
                        <p>
                          <strong>Expiry Date:</strong> {new Date(cert.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={`status-badge ${cert.onBlockchain ? 'valid' : 'pending'}`}>
                          {cert.onBlockchain ? '✓ On Blockchain' : '⏳ Pending'}
                        </span>
                      </p>
                      <p>
                        <strong>Verification Code:</strong> <code>{cert.verificationCode}</code>
                      </p>

                      {/* Display Academic Records if this is a marksheet */}
                      {cert.isMarksheet && cert.marksheetData && (
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e7ff' }}>
                          <h4 style={{ margin: '10px 0', color: '#1f2937' }}>📊 Academic Records</h4>
                          
                          {/* Aggregate Data Section */}
                          {cert.marksheetData.aggregateData && (
                            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                              <h5 style={{ margin: '0 0 10px 0', color: '#15803d' }}>📈 Cumulative Performance</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                                <p style={{ margin: '5px 0' }}>
                                  <strong>Total Semesters:</strong> {cert.marksheetData.aggregateData.totalSemesters}
                                </p>
                                <p style={{ margin: '5px 0' }}>
                                  <strong>Total Credits:</strong> {cert.marksheetData.aggregateData.totalCredits}
                                </p>
                                <p style={{ margin: '5px 0' }}>
                                  <strong>Overall Marks:</strong> {cert.marksheetData.aggregateData.totalMarks}/{cert.marksheetData.aggregateData.totalMarksMax}
                                </p>
                                <p style={{ margin: '5px 0' }}>
                                  <strong>Overall Percentage:</strong> {cert.marksheetData.aggregateData.overallPercentage}%
                                </p>
                                <p style={{ margin: '5px 0', gridColumn: '1 / -1' }}>
                                  <strong>Average GPA:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{cert.marksheetData.aggregateData.averageGPA?.toFixed(2) || 'N/A'}/10</span>
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Semester-wise breakdown */}
                          {cert.marksheetData.semesters && cert.marksheetData.semesters.length > 0 && (
                            <div>
                              <h5 style={{ margin: '15px 0 10px 0', color: '#1f2937' }}>📋 Semester Breakdown</h5>
                              <div style={{ display: 'grid', gap: '10px' }}>
                                {cert.marksheetData.semesters.map((sem: any, idx: number) => (
                                  <div key={idx} style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Semester {sem.semester} ({sem.academicYear})</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                      <p style={{ margin: '2px 0' }}>Marks: {sem.totalMarks}/{sem.totalMarksMax}</p>
                                      <p style={{ margin: '2px 0' }}>Percentage: {sem.percentage}%</p>
                                      <p style={{ margin: '2px 0' }}>GPA: {sem.gpa?.toFixed(2) || 'N/A'}/10</p>
                                      <p style={{ margin: '2px 0' }}>Credits: {sem.credits}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button 
                      className="btn-download"
                      onClick={() => {
                        navigator.clipboard.writeText(cert.verificationCode);
                        alert('Verification code copied! Share with students to verify.');
                      }}
                    >
                      📋 Copy Verification Code
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  <p>📭 No certificates issued yet for this student</p>
                  <p style={{ fontSize: '14px' }}>Use the form below to create and issue the first certificate</p>
                </div>
              )}
            </div>

            {/* Certificate Creation Form */}
            {isAdmin && (
              <div className="cert-creation-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9ff', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
                <h3>➕ Issue New Certificate</h3>
                <div className="form-group">
                  <label>Certificate Name</label>
                  <input
                    type="text"
                    value={certForm.certificateName}
                    onChange={(e) => setCertForm({ ...certForm, certificateName: e.target.value })}
                    placeholder="e.g., Bachelor of Technology, AWS Certification"
                  />
                </div>
                <div className="form-group">
                  <label>Certificate Type</label>
                  <select
                    value={certForm.certificateType}
                    onChange={(e) => setCertForm({ ...certForm, certificateType: e.target.value })}
                  >
                    <option value="Academic">Academic</option>
                    <option value="Certification">Certification</option>
                    <option value="Award">Award</option>
                    <option value="Achievement">Achievement</option>
                    <option value="Marksheet">📊 Marksheet</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    value={certForm.issueDate}
                    onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Certificate Description (Optional)</label>
                  <textarea
                    value={certForm.certificateDescription}
                    onChange={(e) => setCertForm({ ...certForm, certificateDescription: e.target.value })}
                    placeholder="e.g., This is to certify that the holder has successfully completed..."
                    rows={3}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <button
                  className="btn-submit"
                  onClick={handleCreateCertificate}
                  disabled={certLoading || !certForm.certificateName}
                  title={!certForm.certificateName ? 'Please enter certificate name' : 'Click to create and issue certificate'}
                >
                  {certLoading ? '⏳ Creating Certificate...' : '🎓 Create & Issue Certificate'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      {certModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setCertModal({ isOpen: false, type: '', data: null })}>
              ✕
            </button>
            
            {certModal.type === 'details' && certModal.data && (
              <div className="modal-body">
                <h2>📋 Certificate Details</h2>
                <div className="cert-detail-section">
                  <p>
                    <strong>Certificate Name:</strong> {certModal.data.name}
                  </p>
                  <p>
                    <strong>Recipient:</strong> {certModal.data.studentName}
                  </p>
                  <p>
                    <strong>Student ID:</strong> {certModal.data.studentID}
                  </p>
                  <p>
                    <strong>Issue Date:</strong> {certModal.data.issueDate}
                  </p>
                  <p>
                    <strong>Expiry Date:</strong> {certModal.data.expiryDate}
                  </p>
                  <p>
                    <strong>Status:</strong> <span className="badge-valid">✓ Valid</span>
                  </p>
                </div>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    handleDownloadCertificate(certModal.data.name);
                    setCertModal({ isOpen: false, type: '', data: null });
                  }}
                >
                  📥 Download Certificate
                </button>
              </div>
            )}
            
            {certModal.type === 'verify' && certModal.data && (
              <div className="modal-body">
                <h2>🔗 Credential Verification</h2>
                <div className="cert-detail-section">
                  <p>
                    <strong>Certification:</strong> {certModal.data.name}
                  </p>
                  <p>
                    <strong>Recipient:</strong> {certModal.data.studentName}
                  </p>
                  <p>
                    <strong>Verification Status:</strong> {' '}
                    <span className="badge-verified">✓ VERIFIED</span>
                  </p>
                  <p>
                    <strong>Verification Code:</strong> <code>{certModal.data.verificationCode}</code>
                  </p>
                  <p>
                    <strong>Verification URL:</strong> <br />
                    <a href={certModal.data.verificationUrl} target="_blank" rel="noopener noreferrer">
                      {certModal.data.verificationUrl}
                    </a>
                  </p>
                  
                  {/* Blockchain Status */}
                  <div className="blockchain-status" style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', backgroundColor: '#f0f4ff' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>🔗 Blockchain Status</h4>
                    {certModal.data.blockchainStatus === 'SUBMITTED' ? (
                      <div>
                        <p style={{ margin: '5px 0', color: '#22a352' }}>
                          ✅ <strong>Certificate submitted to Hyperledger Fabric blockchain</strong>
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                          Blockchain Hash: <code style={{ fontSize: '11px' }}>{certModal.data.blockchainHash?.substring(0, 16)}...</code>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: '5px 0', color: '#ff9800' }}>
                          ⚠️ <strong>Certificate stored locally (Blockchain network offline)</strong>
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                          Will be submitted to blockchain when network becomes available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(certModal.data.verificationCode);
                    alert('Verification code copied to clipboard!');
                  }}
                >
                  📋 Copy Verification Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
