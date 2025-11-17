package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract defines the smart contract structure
type SmartContract struct {
	contractapi.Contract
}

// ========== DATA MODELS ==========

// Student represents a student record
type Student struct {
	StudentID    string    `json:"studentId"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Department   string    `json:"department"`
	EnrollmentDate string  `json:"enrollmentDate"`
	Status       string    `json:"status"` // ACTIVE, GRADUATED, SUSPENDED
	CreatedBy    string    `json:"createdBy"`
	CreatedAt    string    `json:"createdAt"`
}

// AcademicRecord represents semester-wise academic performance
type AcademicRecord struct {
	RecordID      string                 `json:"recordId"`
	StudentID     string                 `json:"studentId"`
	Semester      int                    `json:"semester"`
	Year          int                    `json:"year"`
	Courses       []CourseGrade          `json:"courses"`
	SGPA          float64                `json:"sgpa"`
	CGPA          float64                `json:"cgpa"`
	Status        string                 `json:"status"` // DRAFT, SUBMITTED, APPROVED, VERIFIED
	CreatedBy     string                 `json:"createdBy"`
	ApprovedBy    string                 `json:"approvedBy"`
	VerifiedBy    string                 `json:"verifiedBy"`
	CreatedAt     string                 `json:"createdAt"`
	ApprovedAt    string                 `json:"approvedAt"`
	VerifiedAt    string                 `json:"verifiedAt"`
	Remarks       string                 `json:"remarks"`
}

// CourseGrade represents individual course performance
type CourseGrade struct {
	CourseCode   string  `json:"courseCode"`
	CourseName   string  `json:"courseName"`
	Credits      float64 `json:"credits"`
	Grade        string  `json:"grade"` // A, B, C, D, F
	GradePoint   float64 `json:"gradePoint"`
}

// Certificate represents issued certificate
type Certificate struct {
	CertificateID  string    `json:"certificateId"`
	StudentID      string    `json:"studentId"`
	CertificationType string `json:"certificationType"` // DEGREE, TRANSCRIPT, DIPLOMA
	IssuedDate     string    `json:"issuedDate"`
	CertificateHash string   `json:"certificateHash"` // SHA256 hash for verification
	QRCode         string    `json:"qrCode"`
	Status         string    `json:"status"` // ISSUED, VERIFIED, REVOKED
	IssuedBy       string    `json:"issuedBy"`
	VerificationCount int    `json:"verificationCount"`
	CreatedAt      string    `json:"createdAt"`
}

// AuditLog represents transaction history
type AuditLog struct {
	LogID         string    `json:"logId"`
	Timestamp     string    `json:"timestamp"`
	Organization  string    `json:"organization"`
	User          string    `json:"user"`
	Action        string    `json:"action"`
	RecordType    string    `json:"recordType"` // STUDENT, RECORD, CERTIFICATE
	RecordID      string    `json:"recordId"`
	Details       string    `json:"details"`
	TransactionID string    `json:"transactionId"`
}

// VerificationRequest represents external verification queries
type VerificationRequest struct {
	RequestID     string `json:"requestId"`
	CertificateID string `json:"certificateId"`
	CertificateHash string `json:"certificateHash"`
	RequestedBy   string `json:"requestedBy"`
	RequestedAt   string `json:"requestedAt"`
	Status        string `json:"status"` // PENDING, VERIFIED, INVALID
}

// ========== STUDENT MANAGEMENT ==========

// CreateStudent creates a new student record
func (s *SmartContract) CreateStudent(ctx contractapi.TransactionContextInterface, studentID string, name string, email string, department string) (*Student, error) {
	// Verify caller is from NITWarangal org
	creatorOrg, err := getCreatorOrganization(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get creator organization: %v", err)
	}

	if creatorOrg != "NITWarangalMSP" {
		return nil, fmt.Errorf("only NITWarangal can create students")
	}

	// Check if student already exists
	existing, err := ctx.GetStub().GetState(studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("student %s already exists", studentID)
	}

	// Create student object
	student := Student{
		StudentID:      studentID,
		Name:           name,
		Email:          email,
		Department:     department,
		EnrollmentDate: time.Now().Format(time.RFC3339),
		Status:         "ACTIVE",
		CreatedBy:      creatorOrg,
		CreatedAt:      time.Now().Format(time.RFC3339),
	}

	// Save to blockchain
	studentJSON, err := json.Marshal(student)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal student: %v", err)
	}

	err = ctx.GetStub().PutState(studentID, studentJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to put state: %v", err)
	}

	// Create index for student queries
	err = ctx.GetStub().CreateCompositeKey("student~department", []string{department, studentID})
	if err != nil {
		return nil, fmt.Errorf("failed to create index: %v", err)
	}

	// Log audit entry
	logAudit(ctx, "CreateStudent", "STUDENT", studentID, fmt.Sprintf("Created student %s", name))

	return &student, nil
}

// GetStudent retrieves a student record
func (s *SmartContract) GetStudent(ctx contractapi.TransactionContextInterface, studentID string) (*Student, error) {
	studentJSON, err := ctx.GetStub().GetState(studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if studentJSON == nil {
		return nil, fmt.Errorf("student %s not found", studentID)
	}

	var student Student
	err = json.Unmarshal(studentJSON, &student)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal student: %v", err)
	}

	return &student, nil
}

// UpdateStudentStatus updates student status
func (s *SmartContract) UpdateStudentStatus(ctx contractapi.TransactionContextInterface, studentID string, status string) (*Student, error) {
	creatorOrg, err := getCreatorOrganization(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get creator organization: %v", err)
	}

	if creatorOrg != "NITWarangalMSP" {
		return nil, fmt.Errorf("only NITWarangal can update student status")
	}

	student, err := s.GetStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}

	student.Status = status

	studentJSON, _ := json.Marshal(student)
	ctx.GetStub().PutState(studentID, studentJSON)

	logAudit(ctx, "UpdateStudentStatus", "STUDENT", studentID, fmt.Sprintf("Updated status to %s", status))

	return student, nil
}

// GetAllStudents retrieves all students
func (s *SmartContract) GetAllStudents(ctx contractapi.TransactionContextInterface) ([]*Student, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state range: %v", err)
	}
	defer resultsIterator.Close()

	var students []*Student
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var student Student
		err = json.Unmarshal(response.Value, &student)
		if err != nil {
			continue // Skip non-student records
		}
		students = append(students, &student)
	}

	return students, nil
}

// ========== ACADEMIC RECORDS ==========

// CreateAcademicRecord creates a new semester record (Department submits)
func (s *SmartContract) CreateAcademicRecord(ctx contractapi.TransactionContextInterface, recordID string, studentID string, semester int, year int, coursesJSON string) (*AcademicRecord, error) {
	creatorOrg, err := getCreatorOrganization(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get creator organization: %v", err)
	}

	if creatorOrg != "DepartmentsMSP" {
		return nil, fmt.Errorf("only Departments can create academic records")
	}

	// Verify student exists
	_, err = s.GetStudent(ctx, studentID)
	if err != nil {
		return nil, fmt.Errorf("student not found: %v", err)
	}

	// Parse courses
	var courses []CourseGrade
	err = json.Unmarshal([]byte(coursesJSON), &courses)
	if err != nil {
		return nil, fmt.Errorf("invalid courses JSON: %v", err)
	}

	// Calculate SGPA
	sgpa := calculateSGPA(courses)

	record := AcademicRecord{
		RecordID:   recordID,
		StudentID:  studentID,
		Semester:   semester,
		Year:       year,
		Courses:    courses,
		SGPA:       sgpa,
		Status:     "SUBMITTED",
		CreatedBy:  creatorOrg,
		CreatedAt:  time.Now().Format(time.RFC3339),
	}

	recordJSON, _ := json.Marshal(record)
	ctx.GetStub().PutState(recordID, recordJSON)

	// Create index for querying
	ctx.GetStub().CreateCompositeKey("record~student", []string{studentID, recordID})

	logAudit(ctx, "CreateAcademicRecord", "RECORD", recordID, fmt.Sprintf("Created record for student %s, semester %d", studentID, semester))

	return &record, nil
}

// ApproveAcademicRecord approves record (NITWarangal approves)
func (s *SmartContract) ApproveAcademicRecord(ctx contractapi.TransactionContextInterface, recordID string) (*AcademicRecord, error) {
	creatorOrg, err := getCreatorOrganization(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get creator organization: %v", err)
	}

	if creatorOrg != "NITWarangalMSP" {
		return nil, fmt.Errorf("only NITWarangal can approve records")
	}

	recordJSON, err := ctx.GetStub().GetState(recordID)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("record not found")
	}

	var record AcademicRecord
	json.Unmarshal(recordJSON, &record)

	record.Status = "APPROVED"
	record.ApprovedBy = creatorOrg
	record.ApprovedAt = time.Now().Format(time.RFC3339)

	recordJSON, _ = json.Marshal(record)
	ctx.GetStub().PutState(recordID, recordJSON)

	logAudit(ctx, "ApproveAcademicRecord", "RECORD", recordID, "Record approved by NITWarangal")

	return &record, nil
}

// VerifyAcademicRecord verifies record (Verifier final check)
func (s *SmartContract) VerifyAcademicRecord(ctx contractapi.TransactionContextInterface, recordID string) (*AcademicRecord, error) {
	creatorOrg, err := getCreatorOrganization(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get creator organization: %v", err)
	}

	if creatorOrg != "VerifiersMSP" {
		return nil, fmt.Errorf("only Verifiers can verify records")
	}

	recordJSON, err := ctx.GetStub().GetState(recordID)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("record not found")
	}

	var record AcademicRecord
	json.Unmarshal(recordJSON, &record)

	record.Status = "VERIFIED"
	record.VerifiedBy = creatorOrg
	record.VerifiedAt = time.Now().Format(time.RFC3339)

	recordJSON, _ = json.Marshal(record)
	ctx.GetStub().PutState(recordID, recordJSON)

	logAudit(ctx, "VerifyAcademicRecord", "RECORD", recordID, "Record verified by external verifier")

	return &record, nil
}

// GetAcademicRecord retrieves a specific record
func (s *SmartContract) GetAcademicRecord(ctx contractapi.TransactionContextInterface, recordID string) (*AcademicRecord, error) {
	recordJSON, err := ctx.GetStub().GetState(recordID)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("record not found")
	}

	var record AcademicRecord
	json.Unmarshal(recordJSON, &record)
	return &record, nil
}

// GetStudentRecords retrieves all records for a student
func (s *SmartContract) GetStudentRecords(ctx contractapi.TransactionContextInterface, studentID string) ([]*AcademicRecord, error) {
	resultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("record~student", []string{studentID})
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []*AcademicRecord
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Extract record ID from composite key
		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(response.Key)
		if err != nil || len(compositeKeyParts) < 2 {
			continue
		}

		recordID := compositeKeyParts[1]
		record, err := s.GetAcademicRecord(ctx, recordID)
		if err == nil {
			records = append(records, record)
		}
	}

	return records, nil
}

// ========== CERTIFICATE MANAGEMENT ==========

// IssueCertificate issues a certificate (NITWarangal issues)
func (s *SmartContract) IssueCertificate(ctx contractapi.TransactionContextInterface, certificateID string, studentID string, certificationType string) (*Certificate, error) {
	creatorOrg, err := getCreatorOrganization(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get creator organization: %v", err)
	}

	if creatorOrg != "NITWarangalMSP" {
		return nil, fmt.Errorf("only NITWarangal can issue certificates")
	}

	// Generate certificate hash
	certHash := generateCertificateHash(certificateID, studentID)
	qrCode := fmt.Sprintf("https://verify.nit.edu/cert/%s", certificateID)

	cert := Certificate{
		CertificateID:     certificateID,
		StudentID:         studentID,
		CertificationType: certificationType,
		IssuedDate:        time.Now().Format(time.RFC3339),
		CertificateHash:   certHash,
		QRCode:            qrCode,
		Status:            "ISSUED",
		IssuedBy:          creatorOrg,
		VerificationCount: 0,
		CreatedAt:         time.Now().Format(time.RFC3339),
	}

	certJSON, _ := json.Marshal(cert)
	ctx.GetStub().PutState(certificateID, certJSON)

	logAudit(ctx, "IssueCertificate", "CERTIFICATE", certificateID, fmt.Sprintf("Certificate issued to student %s", studentID))

	return &cert, nil
}

// VerifyCertificate verifies a certificate (Public endpoint)
func (s *SmartContract) VerifyCertificate(ctx contractapi.TransactionContextInterface, certificateID string, certHash string) (bool, error) {
	certJSON, err := ctx.GetStub().GetState(certificateID)
	if err != nil || certJSON == nil {
		return false, nil
	}

	var cert Certificate
	json.Unmarshal(certJSON, &cert)

	// Verify hash matches
	if cert.CertificateHash != certHash {
		return false, nil
	}

	// Increment verification count
	cert.VerificationCount++
	certJSON, _ = json.Marshal(cert)
	ctx.GetStub().PutState(certificateID, certJSON)

	// Log verification
	logAudit(ctx, "VerifyCertificate", "CERTIFICATE", certificateID, "Certificate verified by external party")

	return true, nil
}

// GetCertificate retrieves certificate details
func (s *SmartContract) GetCertificate(ctx contractapi.TransactionContextInterface, certificateID string) (*Certificate, error) {
	certJSON, err := ctx.GetStub().GetState(certificateID)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if certJSON == nil {
		return nil, fmt.Errorf("certificate not found")
	}

	var cert Certificate
	json.Unmarshal(certJSON, &cert)
	return &cert, nil
}

// GetStudentCertificates retrieves all certificates for a student
func (s *SmartContract) GetStudentCertificates(ctx contractapi.TransactionContextInterface, studentID string) ([]*Certificate, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var certificates []*Certificate
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var cert Certificate
		if err := json.Unmarshal(response.Value, &cert); err != nil {
			continue
		}

		if cert.StudentID == studentID {
			certificates = append(certificates, &cert)
		}
	}

	return certificates, nil
}

// ========== AUDIT & VERIFICATION ==========

// GetAuditLog retrieves audit trail for a record
func (s *SmartContract) GetAuditLog(ctx contractapi.TransactionContextInterface, recordID string) ([]*AuditLog, error) {
	resultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("audit", []string{recordID})
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var logs []*AuditLog
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var log AuditLog
		if err := json.Unmarshal(response.Value, &log); err != nil {
			continue
		}
		logs = append(logs, &log)
	}

	return logs, nil
}

// ========== HELPER FUNCTIONS ==========

// calculateSGPA calculates semester GPA
func calculateSGPA(courses []CourseGrade) float64 {
	var totalPoints float64
	var totalCredits float64

	for _, course := range courses {
		totalPoints += course.GradePoint * course.Credits
		totalCredits += course.Credits
	}

	if totalCredits == 0 {
		return 0
	}

	sgpa := totalPoints / totalCredits
	// Round to 2 decimal places
	return float64(int(sgpa*100)) / 100
}

// getCreatorOrganization extracts organization name from certificate
func getCreatorOrganization(ctx contractapi.TransactionContextInterface) (string, error) {
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", err
	}

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return "", err
	}

	log.Printf("Client: %s, MSPID: %s", clientID, mspID)
	return mspID, nil
}

// generateCertificateHash creates SHA256 hash for certificate
func generateCertificateHash(certificateID string, studentID string) string {
	data := certificateID + studentID + time.Now().String()
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// logAudit creates audit log entry
func logAudit(ctx contractapi.TransactionContextInterface, action string, recordType string, recordID string, details string) error {
	org, _ := getCreatorOrganization(ctx)

	logID := fmt.Sprintf("audit_%d_%s", time.Now().UnixNano(), recordID)
	auditLog := AuditLog{
		LogID:         logID,
		Timestamp:     time.Now().Format(time.RFC3339),
		Organization:  org,
		Action:        action,
		RecordType:    recordType,
		RecordID:      recordID,
		Details:       details,
		TransactionID: ctx.GetStub().GetTxID(),
	}

	logJSON, _ := json.Marshal(auditLog)
	ctx.GetStub().PutState(logID, logJSON)

	// Create index for audit queries
	ctx.GetStub().CreateCompositeKey("audit", []string{recordID, logID})

	return nil
}

// ========== ENTRY POINT ==========

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating academic-records chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting academic-records chaincode: %v", err)
	}
}
