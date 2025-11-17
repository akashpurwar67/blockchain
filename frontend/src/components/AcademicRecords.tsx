import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AcademicRecords.css';

interface Subject {
  subjectCode: string;
  subjectName: string;
  credits: number;
  marksObtained: number;
  marksTotal: number;
  grade?: string;
  gradePoint?: number;
}

interface AcademicRecord {
  studentId: string;
  semester: string;
  academicYear: string;
  subjects: Subject[];
  totalCredits?: number;
  totalMarks?: number;
  totalMarksMax?: number;
  gpaForSemester?: number;
  cumulativeGPA?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface AcademicRecordsProps {
  studentId: string;
  studentName: string;
  token: string;
}

const AcademicRecords: React.FC<AcademicRecordsProps> = ({
  studentId,
  studentName,
  token,
}) => {
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<AcademicRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesterForm, setSemesterForm] = useState({
    semester: '1',
    academicYear: '2024-2025',
  });

  useEffect(() => {
    fetchAcademicRecords();
  }, [studentId]);

  const fetchAcademicRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(
        `http://localhost:4000/api/academic-records/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let recordsList = [];
      // Handle array response
      if (Array.isArray(response.data)) {
        recordsList = response.data;
      } else if (response.data.records && Array.isArray(response.data.records)) {
        recordsList = response.data.records;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        recordsList = response.data.data;
      }

      console.log('[AcademicRecords] Fetched records:', recordsList);
      setRecords(recordsList);
      if (recordsList.length > 0) {
        setSelectedSemester(recordsList[0]);
      }
    } catch (err: any) {
      console.error('Error fetching academic records:', err);
      // Not finding records is not an error, just no data
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = () => {
    setSubjects([
      ...subjects,
      {
        subjectCode: '',
        subjectName: '',
        credits: 3,
        marksObtained: 0,
        marksTotal: 100,
      },
    ]);
  };

  const handleUpdateSubject = (
    index: number,
    field: keyof Subject,
    value: any
  ) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
    setSubjects(updatedSubjects);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (subjects.length === 0) {
      setError('Please add at least one subject');
      return;
    }

    // Validate all subjects
    for (let subject of subjects) {
      if (!subject.subjectCode || !subject.subjectName) {
        setError('Please fill in all subject details');
        return;
      }
      if (subject.marksObtained < 0 || subject.marksObtained > subject.marksTotal) {
        setError(
          `Invalid marks for ${subject.subjectName}. Marks obtained must be between 0 and ${subject.marksTotal}`
        );
        return;
      }
      if (subject.credits <= 0) {
        setError(`Credits must be greater than 0 for ${subject.subjectName}`);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        studentId,
        semester: semesterForm.semester,
        academicYear: semesterForm.academicYear,
        subjects,
      };

      const response = await axios.post(
        'http://localhost:4000/api/academic-records',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newRecord = response.data.data || response.data.record || response.data;
      if (newRecord) {
        setRecords([...records, newRecord]);
        setSelectedSemester(newRecord);
        setSubjects([]);
        setSemesterForm({ semester: '1', academicYear: '2024-2025' });
        setShowAddForm(false);
        setError('✅ Academic record created successfully! GPA: ' + (newRecord.gpaForSemester?.toFixed(2) || 'N/A') + '/10');
      }
    } catch (err: any) {
      console.error('Error creating academic record:', err);
      setError(
        err.response?.data?.error || err.response?.data?.message || 'Failed to create academic record'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (semester: string, year: string) => {
    if (!window.confirm('Are you sure you want to delete this semester record?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      await axios.delete(
        `http://localhost:4000/api/academic-records/${studentId}/${semester}/${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedRecords = records.filter(
        (r) => !(r.semester === semester && r.academicYear === year)
      );
      setRecords(updatedRecords);
      setSelectedSemester(updatedRecords.length > 0 ? updatedRecords[0] : null);
      alert('Academic record deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting academic record:', err);
      setError(err.response?.data?.error || 'Failed to delete academic record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="academic-records-container">
      <div className="records-header">
        <h3>📚 Academic Records - {studentName}</h3>
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Cancel' : '➕ Add Semester Record'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Add New Record Form */}
      {showAddForm && (
        <div className="add-record-form">
          <h4>Add New Semester Record</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Semester</label>
              <select
                value={semesterForm.semester}
                onChange={(e) =>
                  setSemesterForm({ ...semesterForm, semester: e.target.value })
                }
              >
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Academic Year</label>
              <input
                type="text"
                value={semesterForm.academicYear}
                onChange={(e) =>
                  setSemesterForm({ ...semesterForm, academicYear: e.target.value })
                }
                placeholder="e.g., 2024-2025"
              />
            </div>
          </div>

          {/* Subjects Section */}
          <div className="subjects-section">
            <div className="subjects-header">
              <h5>Subjects</h5>
              <button
                className="btn-secondary"
                onClick={handleAddSubject}
                type="button"
              >
                ➕ Add Subject
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className="no-subjects">No subjects added. Click "Add Subject" to begin.</p>
            ) : (
              <div className="subjects-list">
                {subjects.map((subject, index) => (
                  <div key={index} className="subject-form">
                    <div className="subject-form-row">
                      <div className="form-group">
                        <label>Subject Code</label>
                        <input
                          type="text"
                          value={subject.subjectCode}
                          onChange={(e) =>
                            handleUpdateSubject(index, 'subjectCode', e.target.value)
                          }
                          placeholder="e.g., CS101"
                        />
                      </div>
                      <div className="form-group">
                        <label>Subject Name</label>
                        <input
                          type="text"
                          value={subject.subjectName}
                          onChange={(e) =>
                            handleUpdateSubject(index, 'subjectName', e.target.value)
                          }
                          placeholder="e.g., Data Structures"
                        />
                      </div>
                    </div>

                    <div className="subject-form-row">
                      <div className="form-group">
                        <label>Credits</label>
                        <input
                          type="number"
                          value={subject.credits}
                          onChange={(e) =>
                            handleUpdateSubject(index, 'credits', parseFloat(e.target.value))
                          }
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div className="form-group">
                        <label>Marks Obtained</label>
                        <input
                          type="number"
                          value={subject.marksObtained}
                          onChange={(e) =>
                            handleUpdateSubject(index, 'marksObtained', parseFloat(e.target.value))
                          }
                          min="0"
                          max={subject.marksTotal}
                        />
                      </div>
                      <div className="form-group">
                        <label>Total Marks</label>
                        <input
                          type="number"
                          value={subject.marksTotal}
                          onChange={(e) =>
                            handleUpdateSubject(index, 'marksTotal', parseFloat(e.target.value))
                          }
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="subject-form-row">
                      <div className="form-group">
                        <label>Percentage</label>
                        <input
                          type="text"
                          value={
                            subject.marksTotal > 0
                              ? ((subject.marksObtained / subject.marksTotal) * 100).toFixed(2) + '%'
                              : '0%'
                          }
                          disabled
                          className="percentage-display"
                        />
                      </div>
                      <div className="form-group">
                        <label>Grade (Auto)</label>
                        <input
                          type="text"
                          value={subject.grade || 'N/A'}
                          disabled
                          className="grade-display"
                        />
                      </div>
                      <div className="form-group">
                        <label>Grade Point (Auto)</label>
                        <input
                          type="text"
                          value={subject.gradePoint !== undefined ? subject.gradePoint.toFixed(1) : 'N/A'}
                          disabled
                          className="grade-point-display"
                        />
                      </div>
                    </div>

                    <button
                      className="btn-danger"
                      onClick={() => handleRemoveSubject(index)}
                      type="button"
                    >
                      🗑️ Remove Subject
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn-submit"
            onClick={handleSubmitRecord}
            disabled={loading || subjects.length === 0}
          >
            {loading ? '⏳ Saving...' : '💾 Save Academic Record'}
          </button>
        </div>
      )}

      {/* Existing Records Display */}
      {loading && !showAddForm ? (
        <p className="loading">Loading academic records...</p>
      ) : records.length === 0 ? (
        <div className="no-records">
          <p>📭 No academic records found</p>
          <p>Click "Add Semester Record" to create the first record</p>
        </div>
      ) : (
        <div className="records-display">
          <div className="records-tabs">
            {records.map((record) => (
              <button
                key={`${record.semester}-${record.academicYear}`}
                className={`record-tab ${
                  selectedSemester?.semester === record.semester &&
                  selectedSemester?.academicYear === record.academicYear
                    ? 'active'
                    : ''
                }`}
                onClick={() => setSelectedSemester(record)}
              >
                Sem {record.semester}
              </button>
            ))}
          </div>

          {selectedSemester && (
            <div className="record-details">
              <div className="record-header">
                <h4>
                  Semester {selectedSemester.semester} - {selectedSemester.academicYear}
                </h4>
                <button
                  className="btn-danger-small"
                  onClick={() =>
                    handleDeleteRecord(
                      selectedSemester.semester,
                      selectedSemester.academicYear
                    )
                  }
                >
                  🗑️ Delete
                </button>
              </div>

              {/* Subjects Table */}
              <div className="subjects-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Subject Name</th>
                      <th>Credits</th>
                      <th>Marks</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                      <th>Gr.Pt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSemester.subjects.map((subject, idx) => (
                      <tr key={idx}>
                        <td className="code">{subject.subjectCode}</td>
                        <td className="name">{subject.subjectName}</td>
                        <td className="credits">{subject.credits}</td>
                        <td className="marks">
                          {subject.marksObtained}/{subject.marksTotal}
                        </td>
                        <td className="percentage">
                          {subject.marksTotal > 0
                            ? ((subject.marksObtained / subject.marksTotal) * 100).toFixed(1)
                            : '0'}
                          %
                        </td>
                        <td className="grade">
                          <span className={`grade-badge ${subject.grade?.toLowerCase()}`}>
                            {subject.grade || 'N/A'}
                          </span>
                        </td>
                        <td className="grade-point">
                          {subject.gradePoint !== undefined
                            ? subject.gradePoint.toFixed(1)
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats */}
              <div className="summary-stats">
                <div className="stat">
                  <span className="label">Total Credits</span>
                  <span className="value">
                    {selectedSemester.totalCredits || 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="label">Total Marks</span>
                  <span className="value">
                    {selectedSemester.totalMarks}/{selectedSemester.totalMarksMax}
                  </span>
                </div>
                <div className="stat">
                  <span className="label">Percentage</span>
                  <span className="value">
                    {selectedSemester.totalMarksMax
                      ? (
                          (selectedSemester.totalMarks! /
                            selectedSemester.totalMarksMax) *
                          100
                        ).toFixed(1)
                      : '0'}
                    %
                  </span>
                </div>
                <div className="stat">
                  <span className="label">Semester GPA</span>
                  <span className="value gpa-highlight">
                    {selectedSemester.gpaForSemester?.toFixed(2) || '0.00'}/10
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cumulative GPA */}
      {records.length > 0 && records[0].cumulativeGPA !== undefined && (
        <div className="cumulative-gpa">
          <h4>📊 Cumulative GPA</h4>
          <div className="gpa-display">
            <span className="gpa-value">{records[0].cumulativeGPA.toFixed(2)}</span>
            <span className="gpa-scale">/10</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicRecords;
