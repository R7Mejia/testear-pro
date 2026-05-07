# Upload & Manual Input Feature - Testing Guide

## Overview

This document provides comprehensive testing instructions for the enhanced questionnaire creation system, including both file upload and manual input methods.

---

## Feature Updates

### 1. Enhanced Question Parser

- **Multi-format support**: Detects numbered lists, paragraphs, and various delimiters
- **Multiple splitting patterns**: Tries different separators to find question boundaries
- **Better fallback handling**: Gracefully handles unexpected formats
- **Improved option detection**: Identifies answer options with various formatting

### 2. Manual Question Input Component

- **Question types**: Multiple choice, True/False, Open-ended
- **Easy editing**: Collapsible cards for each question
- **Add/remove questions**: Flexible questionnaire building
- **Visual feedback**: Statistics showing question count and options

### 3. Improved Upload Flow

- **Mode selection**: Choose between upload or manual creation
- **Better UI**: Two-step workflow with clear options
- **Enhanced tips**: Updated guidance for all formats

---

## Test Cases

### Test 1: Upload CSV File

**Objective**: Verify CSV parsing works correctly

**Steps**:

1. Create a test CSV with headers: `question,optionA,optionB,optionC,optionD,answer`
2. Add 10+ rows of data
3. Go to Upload page
4. Select "Upload File" mode
5. Upload the CSV
6. Verify all questions appear correctly

**Expected Result**: ✅ All questions and options parsed correctly

**Sample CSV**:

```csv
question,optionA,optionB,optionC,optionD,answer
What is 2+2?,3,4,5,6,B
What is the capital of France?,London,Paris,Berlin,Madrid,B
What is Python?,A snake,A programming language,A game,A movie,B
```

---

### Test 2: Upload TXT File with Numbered Format

**Objective**: Verify numbered list parsing

**Steps**:

1. Create a TXT file with numbered questions:

```
1. What is 2+2?
A) 3
B) 4
C) 5
D) 6

2. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
```

2. Upload the file
3. Verify all questions parsed with options

**Expected Result**: ✅ Questions separated correctly with options

---

### Test 3: Upload Paragraph Format

**Objective**: Verify paragraph-based parsing

**Steps**:

1. Create a TXT file with questions as paragraphs (separated by blank lines):

```
What is 2+2? The answer is 4. A) 3 B) 4 C) 5 D) 6

What is the capital of France? Paris is the capital. A) London B) Paris C) Berlin D) Madrid
```

2. Upload the file
3. Verify questions are separated

**Expected Result**: ✅ Paragraphs treated as individual questions

---

### Test 4: Manual Question Input - Multiple Choice

**Objective**: Verify manual input for multiple choice questions

**Steps**:

1. Go to Upload page
2. Click "Create Manually"
3. Fill in first question:
   - Prompt: "What is the largest planet?"
   - Option A: "Earth"
   - Option B: "Jupiter"
   - Option C: "Saturn"
   - Option D: "Neptune"
   - Select "Jupiter" as correct answer
4. Click "Add Another Question"
5. Add 2-3 more questions
6. Click "Create Questionnaire"
7. Verify all questions appear in the bank

**Expected Result**: ✅ Questions saved with correct answers marked

---

### Test 5: Manual Question Input - True/False

**Objective**: Verify True/False question type

**Steps**:

1. Go to Upload page → Create Manually
2. Add a new question
3. Change type to "True/False"
4. Observe options change to "True" and "False"
5. Enter prompt: "Python is a programming language"
6. Select "True" as answer
7. Create questionnaire

**Expected Result**: ✅ True/False options preset and work correctly

---

### Test 6: Manual Question Input - Open-Ended

**Objective**: Verify open-ended question type

**Steps**:

1. Go to Upload page → Create Manually
2. Add a question
3. Change type to "Open-ended"
4. Observe: Options field disappears, no correct answer needed
5. Enter prompt: "Describe the water cycle"
6. Create questionnaire

**Expected Result**: ✅ Open-ended questions saved without answer options

---

### Test 7: Mixed Format Upload

**Objective**: Test edge cases and mixed formats

**Steps**:

1. Create a file with mixed content:

```
1. First question with numbering?
A) Option A
B) Option B
C) Option C

Second question without number - just text with options
A) Option A
B) Option B

3. Third question back to numbering
A) Option A
B) Option B
```

2. Upload and verify parsing
3. Check what happens with mixed formats

**Expected Result**: ✅ Parser attempts to extract what it can

---

### Test 8: Storage Integration

**Objective**: Verify uploaded questions integrate with storage system

**Steps**:

1. Repeat Test 1 (CSV upload)
2. Verify storage stats shown
3. If storage > 80%, verify warning appears
4. Navigate away and back to verify data persists
5. Check question bank displays correctly

**Expected Result**: ✅ Questions saved and retrievable

---

### Test 9: Large File Upload

**Objective**: Test with 100+ questions

**Steps**:

1. Generate CSV with 100+ questions
2. Upload file
3. Check console logs to verify parsing progress
4. Verify all questions appear (use pagination if available)
5. Check storage usage

**Expected Result**: ✅ All questions uploaded successfully

---

### Test 10: Error Handling

**Objective**: Verify error messages appear when needed

**Steps**:

a) Empty file:

- Upload a file with no questions
- Verify error message: "Couldn't detect any questions"

b) Storage full:

- Create multiple banks until storage > 90%
- Try to upload another
- Verify error: "Storage quota exceeded"

c) Invalid manual input:

- Go to manual input
- Don't fill in any questions
- Try to create
- Verify validation message

**Expected Result**: ✅ Appropriate error messages shown

---

### Test 11: Application Feature Integration

**Objective**: Verify all app features work with created questionnaires

**Steps**:

1. Create a questionnaire (upload or manual)
2. Open the bank
3. Test "Easy" mode - answer questions
4. Test "GOAT" mode - progressive difficulty
5. Check attempts are saved
6. View analytics/statistics
7. Delete the bank

**Expected Result**: ✅ All modes and features work correctly

---

### Test 12: Data Persistence

**Objective**: Verify data survives page refresh

**Steps**:

1. Create a questionnaire
2. Note the question count
3. Refresh page (F5)
4. Navigate back to bank
5. Verify all questions still present

**Expected Result**: ✅ Data persists after refresh

---

### Test 13: Multiple Banks

**Objective**: Verify multiple questionnaires can coexist

**Steps**:

1. Create Bank 1 (upload method, 20 questions)
2. Create Bank 2 (manual method, 15 questions)
3. Create Bank 3 (upload method, 25 questions)
4. Navigate between all three
5. Verify each shows correct questions

**Expected Result**: ✅ Multiple banks maintained independently

---

### Test 14: Console Logging

**Objective**: Verify detailed logs for debugging

**Steps**:

1. Open DevTools Console (F12)
2. Upload a file
3. Check for `[Parser]`, `[Upload]`, `[Storage]` logs
4. Verify logs show:
   - File type detected
   - Questions parsed count
   - Storage stats
   - Save success/failure

**Expected Result**: ✅ Complete audit trail in console

---

### Test 15: Question Preview

**Objective**: Verify manual input shows preview correctly

**Steps**:

1. Go to Manual input
2. Add several questions with varying lengths
3. Collapse and expand each question
4. Verify prompt preview shows first 60 characters
5. Click to expand and see full content

**Expected Result**: ✅ Preview works, full content accessible

---

## Regression Testing

### Existing Features to Verify

- [ ] Question bank display/viewing
- [ ] Easy mode (sequential questions)
- [ ] GOAT mode (progressive difficulty)
- [ ] Answer recording
- [ ] Attempts history
- [ ] Settings/bank management
- [ ] Delete functionality
- [ ] Navigation between pages
- [ ] Storage warnings
- [ ] Error handling

---

## Performance Testing

### Large Dataset Tests

**100 Questions**:

- Upload time: < 2 seconds
- Parse time: < 1 second
- Display: Smooth, no lag
- Storage: Check logs for size

**500 Questions**:

- Monitor memory usage
- Verify no crashes
- Check storage warnings

**Near Quota (90%+)**:

- Upload should be blocked
- Clear error message
- Can still view existing banks

---

## Browser Compatibility

Test on:

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Verify:

- [ ] File upload works
- [ ] Drag & drop works
- [ ] Manual input displays correctly
- [ ] All buttons functional
- [ ] Responsive on mobile

---

## Command Line Testing

### In Browser Console:

```javascript
// Test parser
testearDebug.testParser();

// Test large upload simulation
testearDebug.testLargeUpload(100);

// Check storage
testearDebug.analyzeStorage();

// Run full diagnostics
testearDebug.runDiagnostics();
```

---

## Success Criteria Checklist

- [ ] CSV files parse correctly with all columns
- [ ] TXT files with numbered questions parse correctly
- [ ] Paragraph-formatted text parses as separate questions
- [ ] Manual input creates questions with correct options
- [ ] True/False questions work properly
- [ ] Open-ended questions work properly
- [ ] All created questions save to storage
- [ ] Questions persist after page refresh
- [ ] Multiple banks can coexist
- [ ] All app modes (Easy, GOAT) work with created banks
- [ ] Storage warnings appear at 80%+
- [ ] Storage errors appear at 90%+
- [ ] Detailed logs show in console
- [ ] Error messages are clear and actionable
- [ ] No data loss during operations

---

## Troubleshooting Common Issues

### Issue: Questions Parse as Single Paragraph

**Solution**:

1. Check file format (should have blank lines between Q's or numbered format)
2. Check console logs for parser output
3. Try manual input as alternative
4. Review file tips in UI

### Issue: Some Questions Missing

**Solution**:

1. Check storage logs: `testearDebug.analyzeStorage()`
2. If > 80% storage, delete old banks
3. Re-upload smaller file
4. Check console for parse errors

### Issue: Storage Full Error

**Solution**:

1. Run: `testearDebug.analyzeStorage()`
2. Identify large banks
3. Delete through UI
4. Try upload again

### Issue: Manual Input Not Saving

**Solution**:

1. Ensure all questions have text prompt
2. Check validation errors
3. Verify storage has space: `testearDebug.analyzeStorage()`
4. Check console for error details

---

## Documentation

- [Parser Enhancement Details](../parser.ts)
- [Manual Input Component](../components/manual-question-input.tsx)
- [Upload Page Updates](../routes/_app/upload.tsx)
- [Storage Module](../lib/testear/storage.ts)

---

## Sign-Off

**Tested By**: ********\_********  
**Date**: ********\_********  
**Result**: ✅ PASS / ❌ FAIL  
**Notes**:

---

**Version**: 1.0  
**Last Updated**: 2026-05-07
