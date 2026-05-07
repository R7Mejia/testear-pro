# Question Upload & Manual Input - Quick Start Guide

## 🎯 What's New?

The questionnaire creation has been improved with:

- ✅ **Better parsing** - Handles various question formats
- ✅ **Manual input option** - Create questions without uploading
- ✅ **Better UI** - Choose your preferred method

---

## 🚀 Quick Start

### Method 1: Upload a File

1. Go to **Create Questionnaire**
2. Click **"Upload File"** (or drag & drop)
3. Select your file (PDF, Word, Excel, CSV, or TXT)
4. Click **"Create Questionnaire"**
5. Your questions appear automatically

**Supported formats**:

- PDF files
- Word documents (.docx)
- Excel spreadsheets (.xlsx)
- CSV files
- Text files (.txt)
- Markdown (.md)

---

### Method 2: Create Questions Manually

1. Go to **Create Questionnaire**
2. Click **"Create Manually"**
3. Fill in the first question:
   - **Question text** (required)
   - **Answer options** (for multiple choice/true-false)
   - **Select the correct answer**
4. Click **"Add Another Question"** for more
5. Click **"Create Questionnaire"** when done

**Question types**:

- **Multiple Choice** - Up to 6 options with one correct answer
- **True/False** - Simple yes/no questions
- **Open-Ended** - Free text responses

---

## 📋 File Format Tips

### For CSV Files

**Best format** (with headers):

```csv
question,optionA,optionB,optionC,optionD,answer
What is 2+2?,3,4,5,6,B
What is the capital of France?,London,Paris,Berlin,Madrid,B
```

**Works without headers too**:

```csv
What is 2+2?,3,4,5,6,B
What is the capital of France?,London,Paris,Berlin,Madrid,B
```

### For Text Files

**Numbered format** (numbered questions with lettered options):

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

**Paragraph format** (questions separated by blank lines):

```
What is 2+2? The answer options are: A) 3 B) 4 C) 5 D) 6

What is the capital of France? The correct answer is Paris. Options: A) London B) Paris C) Berlin D) Madrid
```

**Either style works!** The system will automatically detect and parse it.

---

## ❓ Common Questions

**Q: What if some questions aren't recognized?**  
A: Use the manual input method to add them individually. It's actually faster for 5-10 questions.

**Q: Can I mix question types?**  
A: Yes! You can have multiple choice, true/false, and open-ended questions in the same bank.

**Q: Can I edit questions after uploading?**  
A: Currently you can recreate banks. In the future, we'll add inline editing.

**Q: What file size limit is there?**  
A: No hard limit, but very large files (1000+ questions) might be slow. Keep it under 500 questions for best performance.

**Q: Do I have to mark correct answers?**  
A: For multiple choice & true/false, yes. For open-ended questions, students provide their own answers.

**Q: Can I delete questions?**  
A: Yes! In manual input, click the trash icon. To delete a full bank, use the bank settings.

---

## 🎓 Examples

### Example 1: Upload Math Questions

**File: math-quiz.csv**

```csv
question,optionA,optionB,optionC,optionD,answer
2 + 2 = ?,3,4,5,6,B
10 - 3 = ?,5,6,7,8,C
5 × 3 = ?,12,15,18,20,B
```

**Result**: 3 multiple choice questions

### Example 2: Create True/False Questions

**Manually**:

1. Question Type: True/False
2. Prompt: "The Earth orbits the Sun"
3. Correct: True
4. Click "Add Another"
5. Prompt: "Bananas are vegetables"
6. Correct: False

**Result**: 2 true/false questions

### Example 3: Mix Everything

**Combination**:

- Upload a CSV with 20 multiple choice questions
- Then use manual input to add 5 true/false questions
- Then add 2 open-ended essay questions

**Result**: 27 questions of different types

---

## ⚙️ Settings

### Bank Settings

**Name** (optional):

- Default: Your file name or "Manual Questions"
- Use a descriptive name: "AWS SAA Exam Prep"

**Storage**:

- Questions stored locally in your browser
- No internet connection needed after upload
- Data persists after closing and reopening

---

## ⚠️ Troubleshooting

### Issue: "Couldn't detect any questions"

**Cause**: File format not recognized  
**Solution**:

1. Check file has actual content (not empty)
2. Ensure proper formatting (blank lines between questions)
3. Try manual input instead
4. Contact support with file example

### Issue: Storage limit warning

**Cause**: You're using a lot of storage  
**Solution**:

1. Delete old question banks you don't need
2. Create smaller banks (split topics)
3. Use manual input (more efficient encoding)

### Issue: Questions appear as one large blob

**Cause**: Format not recognized  
**Solution**:

1. Check console (F12 → Console)
2. Look for `[Parser]` messages
3. Try manual input
4. Or reformat file with clear question separators

---

## 📊 Best Practices

1. **Use consistent formatting**
   - If using numbered, use "1." or "1)" consistently
   - If using paragraphs, ensure blank lines separate questions
   - Match option letters: all "A)" or all "A."

2. **Keep questions concise**
   - Long questions can be hard to work with
   - Break complex questions into parts
   - Keep options at reasonable length

3. **Test with small batches first**
   - Upload 5-10 questions first
   - Verify they look correct
   - Then upload more if satisfied

4. **Use descriptive bank names**
   - "AWS-SAA-2026" not "Questions"
   - Helps you find banks later
   - Easier to organize

5. **Mark correct answers clearly**
   - In CSV: Use "A", "B", "C", "D" exactly
   - In manual: Use radio button to select
   - Ambiguous answers cause issues

---

## 🎯 Next Steps

1. **Upload a test file** or **create a test question**
2. **Review the questions** - Do they look correct?
3. **Practice mode** - Take the easy mode quiz
4. **Challenge mode** - Try the GOAT mode for progression
5. **Track progress** - Check your attempts and scores

---

## 📞 Need Help?

If something isn't working:

1. **Check the error message** - It usually explains what to do
2. **Open browser console** (F12) and look for `[Parser]` or `[Upload]` messages
3. **Try manual input** as an alternative
4. **Contact support** with:
   - Description of what you tried
   - Screenshot or file example
   - Browser and OS info

---

## 🚀 Pro Tips

- **Keyboard**: Use Tab to move between fields in manual input
- **Drag & Drop**: Works in file upload - just drag file onto box
- **Multiple Banks**: Create different banks for different topics
- **Reuse**: Answers are saved - don't worry about forgetting them
- **Statistics**: After taking tests, see your progress in stats page

---

**Happy studying! 🎓**

For detailed information, see:

- [PARSER_FIX_REPORT.md](PARSER_FIX_REPORT.md) - Technical details
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Complete test cases
