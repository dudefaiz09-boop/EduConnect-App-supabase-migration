/**
 * CSV Validation utilities for bulk imports
 */

export interface CSVValidationError {
  line: number;
  message: string;
  value: string;
}

export interface CSVValidationResult<T> {
  isValid: boolean;
  errors?: CSVValidationError[];
  records?: T[];
}

interface FeeRecord {
  studentId: string;
  amountDue: number;
  dueDate: string;
}

export function validateFeesCSV(csvText: string): CSVValidationResult<FeeRecord> {
  const errors: CSVValidationError[] = [];
  const records: FeeRecord[] = [];

  if (!csvText.trim()) {
    return {
      isValid: false,
      errors: [{ line: 0, message: 'CSV content is empty', value: '' }]
    };
  }

  const lines = csvText.split('\n').filter(line => line.trim() !== '');

  if (lines.length === 0) {
    return {
      isValid: false,
      errors: [{ line: 0, message: 'No valid records found', value: '' }]
    };
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const parts = line.split(',').map(s => s.trim());

    // Check column count
    if (parts.length !== 3) {
      errors.push({
        line: lineNum,
        message: `Expected 3 columns (studentId, amountDue, dueDate), got ${parts.length}`,
        value: line
      });
      return;
    }

    const [studentId, amountDueStr, dueDate] = parts;

    // Validate studentId
    if (!studentId || studentId.length === 0) {
      errors.push({
        line: lineNum,
        message: 'Student ID cannot be empty',
        value: line
      });
      return;
    }

    // Validate amountDue
    const amountDue = parseFloat(amountDueStr);
    if (isNaN(amountDue) || amountDue <= 0) {
      errors.push({
        line: lineNum,
        message: `Invalid amount: "${amountDueStr}". Must be a positive number.`,
        value: line
      });
      return;
    }

    // Validate dueDate format (yyyy-mm-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
      errors.push({
        line: lineNum,
        message: `Invalid date format: "${dueDate}". Expected yyyy-mm-dd.`,
        value: line
      });
      return;
    }

    // Validate date is valid
    const dateParsed = new Date(dueDate);
    if (isNaN(dateParsed.getTime())) {
      errors.push({
        line: lineNum,
        message: `Date is invalid: "${dueDate}"`,
        value: line
      });
      return;
    }

    // All validations passed
    records.push({
      studentId,
      amountDue,
      dueDate
    });
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    records: records.length > 0 ? records : undefined
  };
}

interface PerformanceRecord {
  studentId: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
}

export function validatePerformanceCSV(csvText: string): CSVValidationResult<PerformanceRecord> {
  const errors: CSVValidationError[] = [];
  const records: PerformanceRecord[] = [];
  const validGrades = ['A', 'B', 'C', 'D', 'E', 'F'];

  if (!csvText.trim()) {
    return {
      isValid: false,
      errors: [{ line: 0, message: 'CSV content is empty', value: '' }]
    };
  }

  const lines = csvText.split('\n').filter(line => line.trim() !== '');

  if (lines.length === 0) {
    return {
      isValid: false,
      errors: [{ line: 0, message: 'No valid records found', value: '' }]
    };
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const parts = line.split(',').map(s => s.trim());

    // Check column count
    if (parts.length !== 5) {
      errors.push({
        line: lineNum,
        message: `Expected 5 columns (studentId, subject, term, score, grade), got ${parts.length}`,
        value: line
      });
      return;
    }

    const [studentId, subject, term, scoreStr, grade] = parts;

    // Validate studentId
    if (!studentId || studentId.length === 0) {
      errors.push({
        line: lineNum,
        message: 'Student ID cannot be empty',
        value: line
      });
      return;
    }

    // Validate subject
    if (!subject || subject.length === 0) {
      errors.push({
        line: lineNum,
        message: 'Subject cannot be empty',
        value: line
      });
      return;
    }

    // Validate term
    if (!term || term.length === 0) {
      errors.push({
        line: lineNum,
        message: 'Term cannot be empty',
        value: line
      });
      return;
    }

    // Validate score
    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push({
        line: lineNum,
        message: `Invalid score: "${scoreStr}". Must be a number between 0-100.`,
        value: line
      });
      return;
    }

    // Validate grade
    if (!validGrades.includes(grade.toUpperCase())) {
      errors.push({
        line: lineNum,
        message: `Invalid grade: "${grade}". Must be one of: ${validGrades.join(', ')}`,
        value: line
      });
      return;
    }

    // All validations passed
    records.push({
      studentId,
      subject,
      term,
      score,
      grade: grade.toUpperCase()
    });
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    records: records.length > 0 ? records : undefined
  };
}
