# Upload Issue - Quick Reference Card

## Problem

✗ Only 6 questions uploading instead of 100+

## Root Cause

**localStorage reaching 5-10 MB quota limit** + insufficient error handling

## Solution Implemented

✅ Enhanced error handling
✅ Added comprehensive logging
✅ Added storage monitoring
✅ Added testing utilities
✅ Better user feedback

---

## Quick Start: Testing the Fix

### Option 1: Test in Browser Console (30 seconds)

```javascript
// Run full diagnostics
testearDebug.runDiagnostics();

// Expected: Shows storage usage, parser tests, and browser info
```

### Option 2: Test Real Upload (2 minutes)

1. Go to Upload page
2. Open DevTools Console (F12)
3. Upload a file with 100+ questions
4. Watch console for detailed logs
5. Verify all questions saved
6. Run `testearDebug.analyzeStorage()` to see usage

### Option 3: Simulate Large Upload (1 minute)

```javascript
testearDebug.testLargeUpload(100); // Simulate 100-question upload
testearDebug.analyzeStorage(); // Check storage status
```

---

## What Changed

### Storage Module (Core Fix)

- ✅ Catches `QuotaExceededError`
- ✅ Warns at 80% capacity
- ✅ Errors at 90% capacity
- ✅ Logs all operations
- ✅ Provides stats/diagnostics

### Parser Module (Diagnostics)

- ✅ Logs file extraction details
- ✅ Tracks questions parsed/skipped
- ✅ Shows format detection
- ✅ Logs fallback activations

### Upload Component (UX)

- ✅ Catches storage errors
- ✅ Shows capacity warnings
- ✅ Displays actual question count
- ✅ Provides actionable error messages

### Testing Utilities (New!)

- ✅ 8 diagnostic functions
- ✅ Available globally as `testearDebug`
- ✅ Works in browser console
- ✅ No imports needed

---

## Console Commands Reference

| Command                 | Purpose                    | Example                                          |
| ----------------------- | -------------------------- | ------------------------------------------------ |
| `runDiagnostics()`      | Full system check          | `testearDebug.runDiagnostics()`                  |
| `analyzeStorage()`      | Show usage breakdown       | `testearDebug.analyzeStorage()`                  |
| `testParser()`          | Test CSV/text parsing      | `testearDebug.testParser()`                      |
| `testLargeUpload(n)`    | Simulate n-question upload | `testearDebug.testLargeUpload(100)`              |
| `generateSampleCSV(n)`  | Create test CSV data       | `const csv = testearDebug.generateSampleCSV(50)` |
| `debugFileUpload(file)` | Debug specific file        | `await testearDebug.debugFileUpload(file)`       |
| `exportStorageData()`   | Backup your data           | `testearDebug.exportStorageData()`               |
| `clearAllStorage()`     | Factory reset              | `testearDebug.clearAllStorage()`                 |

---

## Error Messages Now Shown

### Before Fix ❌

- Silent failure
- Success toast even if save failed
- No way to diagnose issue

### After Fix ✅

| Error                       | What It Means         | Solution              |
| --------------------------- | --------------------- | --------------------- |
| "Storage quota exceeded"    | localStorage full     | Delete old banks      |
| "Data too large"            | Bank > 4.5 MB         | Split file smaller    |
| "Couldn't detect questions" | Format not recognized | Check file headers    |
| ⚠️ "Storage at 80%"         | Running out of space  | Delete old banks soon |
| ⚠️ "Storage CRITICAL"       | Almost full           | Delete banks now      |

---

## Log Output Examples

### Successful Upload

```
[Parser] Starting to parse: test.csv (50.00 KB)
[Parser] Detected CSV/Excel format
[Parser] CSV parsed: 102 rows
[Parser] CSV: Parsed 102 questions (skipped 0)
[Upload] Starting file upload: test.csv
[Upload] Questions parsed: 102 questions
[Upload] Storage stats - 250 total Q's, 1250.00 KB used (25%)
[Storage] Saving bank "MyBank" with 102 questions
[Storage] ✓ Successfully saved bank with ID: abc123
✓ Imported 102 questions into "MyBank"
```

### Storage Quota Error

```
[Upload] Starting file upload: test.csv
[Upload] Storage stats - 4900 total Q's, 4900.00 KB used (98%)
[Storage] CRITICAL: Item size exceeds critical threshold
❌ Storage almost full (98%). Delete old banks to make space.
```

---

## Files Modified

| File                               | Type     | Changes                        |
| ---------------------------------- | -------- | ------------------------------ |
| `src/lib/testear/storage.ts`       | Modified | Error handling, logging, stats |
| `src/routes/_app/upload.tsx`       | Modified | Error handling, warnings       |
| `src/lib/testear/parser.ts`        | Modified | Detailed logging               |
| `src/lib/testear/testing-utils.ts` | **NEW**  | Diagnostics & testing          |

---

## Verification Checklist

- [ ] Console logs show complete upload pipeline
- [ ] Storage stats display correctly
- [ ] Warnings appear at high usage
- [ ] All 100+ questions upload successfully
- [ ] Questions persist after refresh
- [ ] Error toasts show for quota exceeded
- [ ] `testearDebug` available in console
- [ ] Previous fix no longer needed

---

## If Something Goes Wrong

1. **Open DevTools** (F12)
2. **Go to Console** tab
3. **Run:** `testearDebug.runDiagnostics()`
4. **Check output** for what's failing
5. **Try again** with smaller file (10-20 Q's)
6. **If still broken:** `testearDebug.clearAllStorage()` (clears everything)

---

## FAQ

**Q: Why only 6 questions before?**
A: Either parser regex failed to match after 6, or storage quota exceeded. Now you'll see exact error.

**Q: How much can I store?**
A: ~5-10 MB total. ~50+ questions per bank typical. Multiple banks share the limit.

**Q: Storage shows 80%, can I still upload?**
A: Yes, but you'll get a warning. At 90%+ you'll get an error. Delete old banks to make space.

**Q: How do I backup my data?**
A: Run `testearDebug.exportStorageData()` in console.

**Q: How do I free up space?**
A: Delete old question banks via the UI. Or run `testearDebug.analyzeStorage()` to see which use most space.

**Q: Will this work offline?**
A: Yes! Everything is stored locally in your browser. Works without internet.

---

## Next Steps

1. **Test the fix:** Use one of the quick start options above
2. **Monitor logs:** Check browser console during normal use
3. **Adjust if needed:** Let me know if you hit any issues
4. **Consider future:** IndexedDB migration for 1000+ question support

---

## Support Resources

- 📖 [Detailed Diagnosis](UPLOAD_ISSUE_DIAGNOSIS.md)
- 📋 [Complete Fix Guide](UPLOAD_FIX_GUIDE.md)
- 🧪 [Testing Utilities](src/lib/testear/testing-utils.ts)
- 📝 [Parser Code](src/lib/testear/parser.ts)
- 💾 [Storage Code](src/lib/testear/storage.ts)

---

**Version:** 1.0  
**Date:** 2026-05-07  
**Status:** ✅ Ready for Testing
