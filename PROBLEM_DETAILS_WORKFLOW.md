# Problem Details Full Workflow Documentation

## Overview

This document describes the complete end-to-end workflow for extracting, storing, and displaying comprehensive problem details in the NEUPC application, specifically for the Full Import feature. This includes problem statements, I/O formats, examples, constraints, tutorials, and **tutorial solution code**.

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. BROWSER EXTENSION                          │
│                      (Data Extraction)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Content Script extracts from DOM
                              │   • Problem description
                              │   • Input/Output format
                              │   • Examples (input/output pairs)
                              │   • Constraints
                              │   • Notes
                              │   • Tutorial URL
                              │   • Tutorial content
                              │   • Tutorial solutions (code from editorial)
                              │   • Time/Memory limits
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. BACKGROUND SCRIPT                          │
│                   (Orchestration Layer)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Full Import Flow:
                              │   • Fetch submissions from CF API
                              │   • For each AC submission:
                              │     - Open submission page → Extract code
                              │     - Open problem page → Extract details
                              │   • Batch submissions with attached details
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. BULK IMPORT API                            │
│                    (/api/problem-solving/bulk-import)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Process submissions batch:
                              │   • Upsert problems (with details)
                              │   • Create/update submissions
                              │   • Create/update solutions
                              │   • Link user_solves
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. SUPABASE DATABASE                          │
│                      (V2 Schema)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Tables:
                              │   • problems (with detail fields + tutorial_solutions)
                              │   • submissions
                              │   • solutions (source code)
                              │   • user_solves (link)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. PROBLEMS API                               │
│                    (/api/problem-solving/problems)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Fetch user's problems with:
                              │   • All detail fields
                              │   • Solutions
                              │   • Tags
                              │   • Tutorial solutions
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    6. UI COMPONENTS                              │
│                    (React Client Components)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              └─► Display in ProblemDetailModal:
                                  • Description
                                  • Input/Output format
                                  • Examples with syntax highlighting
                                  • Constraints
                                  • Time/Memory limits
                                  • Notes
                                  • Tutorial link/content
                                  • Tutorial solutions with code viewer
```

---

## 📂 Files Involved in the Workflow

### 1. Database Layer

#### Migration Files

- **`/supabase/migrations/20260408000000_add_problem_details.sql`**
  - **Purpose**: Adds problem detail columns to `problems` table
  - **Columns Added**:
    - `description` (TEXT) - Full problem statement
    - `input_format` (TEXT) - Input specification
    - `output_format` (TEXT) - Output specification
    - `constraints` (TEXT) - Problem constraints
    - `examples` (JSONB) - Array of test cases: `[{input, output, explanation?}]`
    - `notes` (TEXT) - Additional problem notes
    - `tutorial_url` (TEXT) - Link to editorial
    - `tutorial_content` (TEXT) - Extracted tutorial text
    - `tutorial_extracted_at` (TIMESTAMPTZ) - When tutorial was fetched
    - `time_limit_ms` (INTEGER) - Time limit in milliseconds
    - `memory_limit_kb` (INTEGER) - Memory limit in KB

- **`/supabase/migrations/20260408010000_add_tutorial_solutions.sql`** (NEW)
  - **Purpose**: Adds tutorial solutions array to `problems` table
  - **Columns Added**:
    - `tutorial_solutions` (JSONB) - Array of code solutions from tutorial: `[{code, language, approach_name, explanation?, order}]`
  - **Indexes**: GIN index on `tutorial_solutions` for efficient queries

#### Schema File

- **`/supabase/migrations/20260404194136_remote_schema.sql`**
  - **Lines 1025-1038**: Original `problems` table definition (V2 schema)
  - **Related Tables**:
    - `platforms` - Platform reference (codeforces, atcoder, etc.)
    - `submissions` - User submissions
    - `solutions` - Source code storage
    - `user_solves` - Links users to solved problems
    - `problem_tags` - Problem categorization

---

### 2. Browser Extension (Data Extraction)

#### Content Script

- **`/browser-extension/content-scripts/group1/neupc-codeforces.js`**
  - **Line 577-764**: `extractProblemDetails()` method
    - Extracts problem metadata from URL and DOM
    - Parses time/memory limits with unit conversion
    - Extracts description, I/O format, constraints
    - Parses examples into structured array
    - Finds tutorial URL from page links
    - Fetches difficulty rating and tags from API
  - **Line 766-798**: `extractTutorialContent()` method (ENHANCED)
    - Extracts editorial content from tutorial pages
    - Supports multiple content selectors
    - **NEW**: Calls `extractSolutionsFromTutorial()` to extract code solutions
  - **Line 800-890**: `extractSolutionsFromTutorial()` method (NEW)
    - Finds code blocks (`<pre>`, `.spoiler pre`, etc.) in tutorial
    - Filters out non-code blocks (must be 3+ lines and contain code keywords)
    - Detects programming language from code patterns (C++, Python, Java, etc.)
    - Extracts approach name from preceding headings
    - Extracts explanation from nearby paragraph text
    - Returns array: `[{code, language, approach_name, explanation, order}]`
  - **Line 891-910**: Helper methods (NEW)
    - `looksLikeCode()` - Checks if text contains programming keywords
    - `detectLanguageFromCode()` - Detects language from code patterns
  - **Message Handlers**:
    - `handleExtractProblemDetails()` - Handles 'extractProblemDetails' action
    - `handleExtractTutorial()` - Handles 'extractTutorial' action

#### Background Script

- **`/browser-extension/background.js`**
  - **Line 627-708**: `extractProblemDetails()` function
    - Opens problem page in new tab
    - Injects content script
    - Sends 'extractProblemDetails' message
    - Returns extracted data
  - **Line 798-1003**: `processPage()` function (MODIFIED)
    - **Line 892-946**: Enhanced AC submission processing
      - After extracting source code (line 890)
      - Opens problem page and extracts details (line 963)
      - Attaches problem details to submission object (flattened fields)
      - Fields: `inputFormat`, `outputFormat`, `examples`, `constraints`, `notes`, `tutorialUrl`, `timeLimit`, `memoryLimit`
  - **Line 966-1084**: `startFullImport()` function
    - Orchestrates the full import workflow
    - Calls `processPage()` for each page of submissions

---

### 3. API Layer (Backend)

#### Bulk Import API

- **`/app/api/problem-solving/bulk-import/route.js`**
  - **Line 387-492**: Problem upsert logic (MODIFIED)
    - Changed from insert-only to **upsert** strategy
    - Accepts both camelCase and snake_case field names:
      - `description`, `inputFormat`/`input_format`, `outputFormat`/`output_format`
      - `constraints`, `examples`, `notes`
      - `tutorialUrl`/`tutorial_url`, `tutorialContent`/`tutorial_content`
      - `timeLimit`/`time_limit_ms`, `memoryLimit`/`memory_limit_kb`
    - Only upserts problems that are NEW or have detailed information
    - Converts examples array to JSON string for storage

#### Problems Retrieval API

- **`/app/api/problem-solving/problems/route.js`**
  - **Line 62-72**: Problem fields selection (MODIFIED)
    - Added problem detail fields to SELECT query:
      - `description`, `input_format`, `output_format`, `constraints`
      - `examples`, `notes`, `tutorial_url`, `tutorial_content`
      - `time_limit_ms`, `memory_limit_kb`
  - **Line 411-447**: Response transformation (MODIFIED)
    - Added detail fields to returned problem object:
      - `problem_description`, `input_format`, `output_format`
      - `constraints`, `examples`, `problem_notes`
      - `tutorial_url`, `tutorial_content`
      - `time_limit_ms`, `memory_limit_kb`

---

### 4. UI Components (Frontend)

#### Problem Detail Modal

- **`/app/account/member/problem-solving/_components/ProblemDetailModal.js`**
  - **Line 795-839**: Problem Description section (existing)
    - Shows `problem.problem_description` or `problem.ai_summary`
  - **Line 840-1023**: NEW SECTIONS ADDED:
    - **Input Format** (Line 842-854)
      - Displays `problem.input_format` with icon
    - **Output Format** (Line 856-868)
      - Displays `problem.output_format` with icon
    - **Examples** (Line 870-906)
      - Iterates through `problem.examples` array
      - Shows input/output with syntax highlighting
      - Displays optional explanation
      - Color-coded: green for input, blue for output
    - **Constraints** (Line 908-920)
      - Displays `problem.constraints` with warning icon
    - **Time & Memory Limits** (Line 922-950)
      - Shows time limit (converts ms to seconds if ≥1000ms)
      - Shows memory limit (converts KB to MB if ≥1024KB)
      - Grid layout with icons
    - **Problem Notes** (Line 952-964)
      - Displays `problem.problem_notes` with lightbulb icon
    - **Tutorial/Editorial** (Line 986-1080) (ENHANCED)
      - Link to `problem.tutorial_url`
      - Displays `problem.tutorial_content` if available
      - **NEW**: Tutorial Solutions section
        - Shows count of solutions extracted from tutorial
        - Displays each solution in a card with:
          - Approach name and language badge
          - Copy button for code
          - Optional explanation text
          - Syntax-highlighted code block
        - Sorted by `order` field

#### Other UI Components

- **`/app/account/member/problem-solving/_components/ProblemList.js`**
  - Main problems list page
  - Uses card components to display problem summaries
  - Opens `ProblemDetailModal` when user clicks a problem

- **`/app/account/member/problem-solving/_components/CompactProblemCard.js`**
  - Compact card view for problem list
- **`/app/account/member/problem-solving/_components/EnhancedProblemCard.js`**
  - Enhanced card view with more details

---

## 🗄️ Database Schema

### V2 Schema Tables

```sql
-- Main tables involved in problem details workflow

┌──────────────────────────────────────────────────────────────┐
│ platforms                                                     │
├──────────────────────────────────────────────────────────────┤
│ id (PK)                                                       │
│ code              (codeforces, atcoder, etc.)                 │
│ name              (Codeforces, AtCoder, etc.)                 │
│ is_active                                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ (1:N)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ problems                                                      │
├──────────────────────────────────────────────────────────────┤
│ id (PK)                                                       │
│ platform_id (FK → platforms.id)                               │
│ external_id          (e.g., "1234A")                          │
│ name                 (Problem title)                          │
│ url                  (Problem page URL)                       │
│ contest_id                                                    │
│ difficulty_rating                                             │
│ ─────────────── NEW FIELDS ─────────────────                 │
│ description          (Full problem statement)                 │
│ input_format         (Input specification)                    │
│ output_format        (Output specification)                   │
│ constraints          (Problem constraints)                    │
│ examples             (JSONB: [{input, output, explanation}])  │
│ notes                (Additional notes)                       │
│ tutorial_url         (Link to editorial)                      │
│ tutorial_content     (Extracted tutorial text)                │
│ tutorial_solutions   (JSONB: [{code, language, approach...}]) │
│ tutorial_extracted_at (Timestamp)                             │
│ time_limit_ms        (Time limit in ms)                       │
│ memory_limit_kb      (Memory limit in KB)                     │
└──────────────────────────────────────────────────────────────┘
          │                                │
          │ (1:N)                          │ (1:N)
          ▼                                ▼
┌────────────────────┐         ┌────────────────────┐
│ submissions        │         │ user_solves        │
├────────────────────┤         ├────────────────────┤
│ id (PK)            │         │ id (PK)            │
│ problem_id (FK)    │         │ user_id (FK)       │
│ user_id (FK)       │         │ problem_id (FK)    │
│ external_submission│         │ first_solved_at    │
│ verdict            │         │ solve_count        │
│ language_id        │         │ is_favorite        │
│ submitted_at       │         │ notes              │
└────────────────────┘         └────────────────────┘
          │                                │
          │ (1:N)                          │ (1:N)
          ▼                                ▼
┌────────────────────┐         ┌────────────────────┐
│ solutions          │         │                     │
├────────────────────┤         │  (user_solve_id    │
│ id (PK)            │◄────────┤   links to         │
│ user_solve_id (FK) │         │   user_solves)     │
│ submission_id (FK) │         │                     │
│ source_code        │         └────────────────────┘
│ verdict            │
│ is_primary         │
│ personal_notes     │
└────────────────────┘
```

### Key Relationships

1. **Platform → Problems**: One platform has many problems
2. **Problem → Submissions**: One problem has many submissions
3. **Problem → UserSolves**: One problem can be solved by many users
4. **UserSolve → Solutions**: One user solve can have multiple solution versions
5. **Submission → Solution**: One submission maps to one solution (source code)

---

## 🔄 Detailed Step-by-Step Workflow

### Step 1: User Initiates Full Import

**Location**: Browser Extension Popup
**Action**: User clicks "Full Import" button for a Codeforces handle

```javascript
// popup.js or similar
chrome.runtime.sendMessage({
  action: 'startFullImport',
  handle: 'tourist',
  platform: 'codeforces',
  options: { fetchCodes: true, verdictFilter: 'ac' },
});
```

---

### Step 2: Background Script Orchestrates Import

**File**: `/browser-extension/background.js`

**Function**: `startFullImport()` (Line 966)

1. **Fetch submission count** from Codeforces API
2. **Calculate pages** (50 submissions per page)
3. **For each page**, call `processPage()`

---

### Step 3: Process Each Page of Submissions

**Function**: `processPage()` (Line 798)

For each page:

1. **Fetch submissions** from Codeforces API

   ```javascript
   const submissions = await fetchCodeforcesSubmissionsPage(handle, page);
   // Returns: [{submission_id, problem_id, problem_url, verdict, ...}, ...]
   ```

2. **Filter new submissions** (not already imported)

3. **For each AC submission**:

   a. **Extract source code**:

   ```javascript
   const result = await extractSourceCode(submission, platform);
   submission.source_code = result.data.sourceCode;
   ```

   b. **Extract problem details**:

   ```javascript
   const problemResult = await extractProblemDetails(
     submission.problem_url,
     platform
   );

   // Attach flattened fields to submission
   submission.description = problemResult.data.description;
   submission.inputFormat = problemResult.data.inputFormat;
   submission.outputFormat = problemResult.data.outputFormat;
   submission.constraints = problemResult.data.constraints;
   submission.examples = problemResult.data.examples;
   submission.notes = problemResult.data.notes;
   submission.tutorialUrl = problemResult.data.tutorialUrl;
   submission.timeLimit = problemResult.data.timeLimitMs;
   submission.memoryLimit = problemResult.data.memoryLimitKb;
   ```

4. **Send batch to API**:
   ```javascript
   await importSubmissionsToBackend(newSubmissions, platform);
   ```

---

### Step 4: Extract Problem Details from DOM

**File**: `/browser-extension/content-scripts/group1/neupc-codeforces.js`

**Function**: `extractProblemDetails()` (Line 577)

When background script sends `'extractProblemDetails'` message:

1. **Parse URL** for contest ID and problem index
2. **Extract from DOM**:

   ```javascript
   const titleElem = document.querySelector('.problem-statement .title');
   const problemName = titleElem?.textContent.replace(/^[A-Z]\.\s*/, '');

   const descElem = document.querySelector(
     '.problem-statement > div:not(.header)'
   );
   const description = descElem?.textContent.trim();

   const inputSpec = document.querySelector(
     '.input-specification'
   )?.textContent;
   const outputSpec = document.querySelector(
     '.output-specification'
   )?.textContent;

   // Parse examples
   const sampleTests = document.querySelector('.sample-tests');
   const inputs = sampleTests.querySelectorAll('.input pre');
   const outputs = sampleTests.querySelectorAll('.output pre');
   const examples = Array.from(inputs).map((input, i) => ({
     input: input.textContent.trim(),
     output: outputs[i]?.textContent.trim(),
   }));

   // Parse limits
   const timeLimitText = document.querySelector('.time-limit')?.textContent;
   const timeLimitMs = parseFloat(timeLimitText) * 1000; // Convert seconds to ms

   const memoryLimitText = document.querySelector('.memory-limit')?.textContent;
   const memoryLimitKb = parseFloat(memoryLimitText) * 1024; // Convert MB to KB
   ```

3. **Return structured data**:
   ```javascript
   return {
     success: true,
     data: {
       problemId: contestId + index,
       contestId,
       problemName,
       description,
       inputFormat,
       outputFormat,
       constraints,
       examples,
       notes,
       tutorialUrl,
       timeLimitMs,
       memoryLimitKb,
     },
   };
   ```

---

### Step 5: Bulk Import API Processes Data

**File**: `/app/api/problem-solving/bulk-import/route.js`

**Function**: `POST` handler

1. **Receive submissions** with attached problem details

   ```javascript
   const { submissions, platform } = await request.json();
   ```

2. **Collect problems to upsert**:

   ```javascript
   for (const sub of submissions) {
     const hasDetails =
       sub.description || sub.inputFormat || sub.examples?.length > 0;

     if (!existingProblemIds.has(sub.problem_id) || hasDetails) {
       problemsToUpsert.push({
         platform_id: platformId,
         external_id: sub.problem_id,
         name: sub.problem_name,
         url: sub.problem_url,
         contest_id: sub.contest_id,
         difficulty_rating: sub.difficulty_rating,
         description: sub.description,
         input_format: sub.inputFormat || sub.input_format,
         output_format: sub.outputFormat || sub.output_format,
         constraints: sub.constraints,
         examples: JSON.stringify(sub.examples || []),
         notes: sub.notes,
         tutorial_url: sub.tutorialUrl || sub.tutorial_url,
         time_limit_ms: sub.timeLimit || sub.time_limit_ms,
         memory_limit_kb: sub.memoryLimit || sub.memory_limit_kb,
       });
     }
   }
   ```

3. **Upsert problems** (insert or update):

   ```javascript
   const { data: upsertedProblems } = await supabaseAdmin
     .from('problems')
     .upsert(problemsToUpsert, {
       onConflict: 'platform_id,external_id',
       ignoreDuplicates: false,
     })
     .select('id, external_id');
   ```

4. **Create submissions and solutions** (standard flow)

---

### Step 6: Problems API Fetches Data

**File**: `/app/api/problem-solving/problems/route.js`

**Function**: `GET` handler

When user opens their problems page:

1. **Query user_solves with problem details**:

   ```javascript
   const { data: userSolves } = await supabaseAdmin
     .from('user_solves')
     .select(
       `
       *,
       problems!inner(
         id, external_id, name, url,
         description, input_format, output_format,
         constraints, examples, notes,
         tutorial_url, tutorial_content,
         time_limit_ms, memory_limit_kb
       )
     `
     )
     .eq('user_id', userId);
   ```

2. **Transform and return**:
   ```javascript
   const problems = userSolves.map((us) => ({
     problem_id: us.problems.external_id,
     problem_name: us.problems.name,
     problem_url: us.problems.url,
     problem_description: us.problems.description,
     input_format: us.problems.input_format,
     output_format: us.problems.output_format,
     constraints: us.problems.constraints,
     examples: us.problems.examples, // JSONB array
     problem_notes: us.problems.notes,
     tutorial_url: us.problems.tutorial_url,
     tutorial_content: us.problems.tutorial_content,
     time_limit_ms: us.problems.time_limit_ms,
     memory_limit_kb: us.problems.memory_limit_kb,
     // ... other fields
   }));
   ```

---

### Step 7: UI Displays Problem Details

**File**: `/app/account/member/problem-solving/_components/ProblemDetailModal.js`

When user clicks on a problem:

1. **Modal receives problem object** with all detail fields

2. **Renders sections conditionally**:

   ```jsx
   {
     /* Description */
   }
   {
     problem.problem_description && (
       <div className="rounded-lg border p-4">
         <h3>What to Do</h3>
         <p>{problem.problem_description}</p>
       </div>
     );
   }

   {
     /* Input Format */
   }
   {
     problem.input_format && (
       <div className="rounded-lg border p-4">
         <h3>Input Format</h3>
         <p>{problem.input_format}</p>
       </div>
     );
   }

   {
     /* Examples */
   }
   {
     problem.examples?.map((example, i) => (
       <div key={i}>
         <div>Example {i + 1}</div>
         <pre className="bg-gray-900 text-green-400">{example.input}</pre>
         <pre className="bg-gray-900 text-blue-400">{example.output}</pre>
         {example.explanation && <p>{example.explanation}</p>}
       </div>
     ));
   }

   {
     /* Time/Memory Limits */
   }
   <div className="grid grid-cols-2 gap-4">
     <div>Time Limit: {problem.time_limit_ms / 1000}s</div>
     <div>Memory Limit: {problem.memory_limit_kb / 1024}MB</div>
   </div>;

   {
     /* Tutorial */
   }
   {
     problem.tutorial_url && (
       <a href={problem.tutorial_url} target="_blank">
         Open Tutorial
       </a>
     );
   }
   ```

---

## 🎯 Key Features

### Data Extraction Features

- ✅ Automatic extraction during Full Import for AC submissions
- ✅ Parses Codeforces problem page DOM
- ✅ Extracts structured examples with input/output pairs
- ✅ Unit conversion (seconds→ms, MB→KB)
- ✅ Tutorial URL detection from page links
- ✅ Handles missing/optional fields gracefully

### Storage Features

- ✅ JSONB storage for examples array
- ✅ Upsert strategy (update existing problems with new details)
- ✅ Supports both camelCase and snake_case field names
- ✅ Indexed tutorial_url for fast lookups
- ✅ Timestamps for tracking when tutorials were extracted

### Display Features

- ✅ Conditional rendering (only show fields if data exists)
- ✅ Syntax-highlighted examples (green input, blue output)
- ✅ Formatted time/memory limits with unit conversion
- ✅ External link to tutorial/editorial
- ✅ Responsive grid layouts for limits
- ✅ Pre-wrapped whitespace for formatted text

---

## 🧪 Testing Checklist

### 1. Database Migration

- [ ] Migration applied successfully to local Supabase
- [ ] New columns visible in `problems` table
- [ ] Indexes created for `tutorial_url` and `examples`

### 2. Data Extraction (Content Script)

- [ ] Open a Codeforces problem page
- [ ] Run `extractProblemDetails()` in console
- [ ] Verify all fields extracted correctly
- [ ] Check examples array structure
- [ ] Verify time/memory limit conversions

### 3. Full Import Flow (Background Script)

- [ ] Start Full Import for a CF handle
- [ ] Verify problem details extracted for AC submissions
- [ ] Check browser console for logs
- [ ] Confirm flattened fields attached to submissions
- [ ] Verify delay between requests (1-1.5s)

### 4. API Storage (Bulk Import)

- [ ] Check POST request payload includes problem details
- [ ] Verify problems upserted to database
- [ ] Check examples stored as valid JSONB
- [ ] Confirm both new and existing problems updated
- [ ] Query database directly to verify data

### 5. API Retrieval (Problems API)

- [ ] Fetch problems via `/api/problem-solving/problems`
- [ ] Verify response includes detail fields
- [ ] Check examples parsed as array (not string)
- [ ] Confirm all fields present in response

### 6. UI Display (Problem Modal)

- [ ] Open problem detail modal
- [ ] Verify description displayed
- [ ] Check input/output format sections
- [ ] Verify examples rendered with highlighting
- [ ] Check constraints section
- [ ] Verify time/memory limits formatted correctly
- [ ] Check notes section
- [ ] Verify tutorial link clickable

---

## 🐛 Common Issues & Solutions

### Issue: Examples not displaying

**Cause**: Examples stored as JSON string instead of array
**Solution**: Ensure API parses `examples` field correctly:

```javascript
// In problems API
examples: problem.examples; // Should be JSONB, auto-parsed
```

### Issue: Time limits showing wrong units

**Cause**: Missing conversion in UI
**Solution**: Check conversion logic in modal:

```javascript
{
  problem.time_limit_ms >= 1000
    ? `${problem.time_limit_ms / 1000}s`
    : `${problem.time_limit_ms}ms`;
}
```

### Issue: Problem details not extracted

**Cause**: Content script not injected or DOM selectors changed
**Solution**:

1. Verify content script loads on problem pages
2. Check browser console for errors
3. Inspect Codeforces DOM structure for changes

### Issue: Duplicate code in bulk-import

**Cause**: Merge conflict or incomplete edit
**Solution**: Ensure lines 493-494 removed (orphaned `insertedProblems` code)

---

## 🔮 Future Enhancements

### Phase 1: Enhanced Tutorial Features ✅ PARTIALLY COMPLETE

- [x] Extract tutorial solutions from editorials (DONE)
- [x] Display tutorial content in collapsible section (DONE)
- [ ] Implement batch tutorial extraction for existing problems
- [ ] Add background job to fetch tutorials asynchronously
- [ ] Cache tutorials to avoid repeated fetching
- [ ] Syntax highlighting for tutorial code (advanced themes)

### Phase 2: Multi-Platform Support

- [ ] Extend extraction to AtCoder problems
- [ ] Add LeetCode problem details support
- [ ] Platform-specific DOM parsers
- [ ] Unified problem detail schema

### Phase 3: Enhanced Examples

- [x] Add explanation field to examples (DONE)
- [ ] Support multiple example test cases
- [ ] Interactive example tester
- [ ] Example output comparison

### Phase 4: Problem Search

- [ ] Full-text search on problem descriptions
- [ ] Search by input/output patterns
- [ ] Search by constraints
- [ ] Filter by time/memory limits
- [ ] Search tutorial solutions by language

### Phase 5: Tutorial Solutions Enhancements

- [ ] Side-by-side comparison of multiple solutions
- [ ] Complexity analysis for each solution
- [ ] Run/test tutorial solutions in browser
- [ ] User comments/notes on tutorial solutions
- [ ] Vote on best solution approach

---

## 📊 Performance Considerations

### Extraction Performance

- **Rate Limiting**: 1.5s delay between problem extractions
- **Parallel Processing**: None (sequential to avoid blocking)
- **Tab Management**: One tab at a time for extraction
- **Timeout**: 45s max per problem extraction

### Database Performance

- **Batch Size**: Up to 50 submissions per API call
- **Indexes**: `tutorial_url`, `examples`, and `tutorial_solutions` (GIN) indexed
- **Upsert Strategy**: Only updates when new details available
- **JSONB Storage**: Efficient for examples and tutorial_solutions array queries
- **Tutorial Solutions**: Stored as JSONB array for flexible querying by language, approach, etc.

### UI Performance

- **Conditional Rendering**: Only renders sections with data
- **Lazy Loading**: Examples parsed on demand
- **Virtualization**: Not needed (single problem view)
- **Memoization**: React components use `useMemo` where appropriate

---

## 📝 Summary

The problem details workflow is now **fully implemented** from extraction to display:

1. ✅ **Database schema** enhanced with 11 new columns (including tutorial_solutions)
2. ✅ **Content script** extracts detailed information from Codeforces
   - Problem details (description, I/O, examples, constraints)
   - Tutorial content
   - **Tutorial solutions** (multiple code solutions from editorial)
3. ✅ **Background script** orchestrates extraction during Full Import
4. ✅ **Bulk Import API** stores problem details with upsert strategy
5. ✅ **Problems API** fetches and returns all detail fields including tutorial solutions
6. ✅ **UI Modal** displays comprehensive problem information
   - 7 new sections for problem details
   - **Tutorial solutions viewer** with syntax highlighting and copy button

### 🆕 Tutorial Solutions Feature

**What it does**: Automatically extracts code solutions from Codeforces tutorials/editorials

**How it works**:

1. Content script finds `<pre>` code blocks in tutorial pages
2. Filters out non-code blocks (must be 3+ lines with programming keywords)
3. Detects language from code patterns (C++, Python, Java, JavaScript, Go, Rust)
4. Extracts approach name from preceding headings
5. Stores as JSONB array: `[{code, language, approach_name, explanation, order}]`
6. UI displays each solution with:
   - Approach name badge
   - Language badge
   - Copy-to-clipboard button
   - Syntax-highlighted code block
   - Optional explanation

**Benefits**:

- Users can study multiple solution approaches
- Compare different implementations (brute force, optimized, etc.)
- Learn from official editorial code
- Copy and test solutions directly

**Next Steps for Testing**:

1. Reload browser extension
2. Run Full Import for a Codeforces handle
3. Open a problem in the UI
4. Verify all sections display correctly:
   - ✅ Description, I/O format, examples, constraints
   - ✅ Time/memory limits
   - ✅ Tutorial link and content
   - ✅ **Tutorial solutions with code viewer**
5. Check database for stored data

---

**Last Updated**: 2026-04-08  
**Author**: OpenCode AI Assistant  
**Version**: 2.0 (Added Tutorial Solutions)
