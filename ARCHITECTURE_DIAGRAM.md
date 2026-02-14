# Architecture Diagram: Test Generation Storage Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Generation Tab (UI)                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Form Input │  │ Image Upload │  │ Generate Button         │ │
│  │ - Story    │  │ - Multiple   │  │ - Triggers generation   │ │
│  │ - Criteria │  │ - Preview    │  │ - Passes form + images  │ │
│  │ - Component│  │ - Remove     │  │                         │ │
│  └────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              useTestGeneration Hook (Business Logic)             │
│                                                                   │
│  generate(formData, images) {                                    │
│    1. Call AI API                                                │
│    2. Get test cases response                                    │
│    3. Upload images to Cloudinary ──────────┐                   │
│    4. Save to Firestore                     │                   │
│    5. Return results                        │                   │
│  }                                          │                   │
└─────────────────────────────────────────────┼───────────────────┘
                              │               │
                              │               │
                ┌─────────────┴───────┐      │
                │                     │      │
                ▼                     ▼      ▼
    ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────┐
    │   AI API         │  │  Cloudinary Service  │  │  Firestore   │
    │   (Backend)      │  │                      │  │  Service     │
    │                  │  │  uploadImage()       │  │              │
    │  POST /generate  │  │  - Upload to cloud   │  │  setDoc()    │
    │  - User story    │  │  - Get secure URL    │  │  - Save data │
    │  - Criteria      │  │  - Return metadata   │  │  - Timestamp │
    │  - GitHub ctx    │  │                      │  │              │
    │                  │  │  Returns:            │  │              │
    │  Returns:        │  │  {                   │  │              │
    │  {               │  │    url,              │  │              │
    │    suite_id,     │  │    publicId,         │  │              │
    │    test_cases,   │  │    width,            │  │              │
    │    breakdown     │  │    height            │  │              │
    │  }               │  │  }                   │  │              │
    └──────────────────┘  └──────────────────────┘  └──────────────┘
                │                     │                      │
                └─────────────────────┴──────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────┐
                        │   Firestore Document     │
                        │   testGenerationExecutions│
                        │                          │
                        │   {                      │
                        │     suiteId,             │
                        │     projectId,           │
                        │     userId,              │
                        │     input: {...},        │
                        │     output: {...},       │
                        │     images: [            │
                        │       {                  │
                        │         url: "https://...",│
                        │         publicId,        │
                        │         width,           │
                        │         height           │
                        │       }                  │
                        │     ],                   │
                        │     createdAt,           │
                        │     status               │
                        │   }                      │
                        └──────────────────────────┘
```

## Data Flow Sequence

```
User Action                    System Response
───────────                    ───────────────

1. Fill form                   → Validate input
   Upload images               → Store in state
   Click "Generate"            → Disable button

2. handleGenerate()            → Show loading state
                               → Call generate(form, images)

3. API Call                    → POST to backend
   generateTests(payload)      → AI processes request
                               → Returns test cases

4. Upload Images               → For each image:
   uploadMultipleImages()      →   POST to Cloudinary
                               →   Get secure URL
                               → Return array of URLs

5. Save to Firestore           → Prepare document
   saveTestGenerationExecution()→ Upload to Firestore
                               → Set timestamps
                               → Return document ID

6. Update UI                   → Display test cases
                               → Clear images
                               → Enable button
                               → Show success
```

## Component Hierarchy

```
ProjectWorkspace
└── TestGenerationTab
    ├── useTestGeneration (hook)
    │   ├── generateTests (API)
    │   ├── cloudinaryService
    │   │   └── uploadMultipleImages()
    │   └── testGenerationStorageService
    │       └── saveTestGenerationExecution()
    │
    ├── Form Section
    │   ├── User Story Input
    │   ├── Acceptance Criteria
    │   ├── Component Input
    │   ├── Priority Selector
    │   └── Format Selector
    │
    ├── GitHub Context Section
    │   ├── Connect Button
    │   ├── Repo Selector
    │   └── File Selector
    │
    ├── Image Upload Section (NEW)
    │   ├── Upload Button
    │   ├── Image Preview Grid
    │   └── Remove Image Buttons
    │
    ├── Generate Button
    │
    └── Results Section
        ├── Suite Summary
        ├── Test Cases List
        └── Export Options
```

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Firebase Project                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Firestore Database                     │    │
│  │                                                     │    │
│  │  Collection: testGenerationExecutions              │    │
│  │  ├── doc: suite-abc-123                            │    │
│  │  │   ├── suiteId: "suite-abc-123"                  │    │
│  │  │   ├── projectId: "proj-456"                     │    │
│  │  │   ├── userId: "user-789"                        │    │
│  │  │   ├── input: { ... }                            │    │
│  │  │   ├── output: { ... }                           │    │
│  │  │   ├── images: [                                 │    │
│  │  │   │   {                                          │    │
│  │  │   │     url: "https://cloudinary.../image.jpg", │    │
│  │  │   │     publicId: "test-gen/.../image-0",       │    │
│  │  │   │     width: 1920,                            │    │
│  │  │   │     height: 1080                            │    │
│  │  │   │   }                                          │    │
│  │  │   │ ]                                            │    │
│  │  │   ├── createdAt: Timestamp                      │    │
│  │  │   └── status: "completed"                       │    │
│  │  │                                                  │    │
│  │  ├── doc: suite-def-456                            │    │
│  │  └── doc: suite-ghi-789                            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Cloudinary Account                      │
│                                                              │
│  Media Library                                              │
│  └── test-generation/                                       │
│      ├── proj-456/                                          │
│      │   ├── suite-abc-123/                                 │
│      │   │   ├── image-0/                                   │
│      │   │   │   └── screenshot.jpg                         │
│      │   │   └── image-1/                                   │
│      │   │       └── mockup.png                             │
│      │   │                                                  │
│      │   └── suite-def-456/                                 │
│      │       └── image-0/                                   │
│      │           └── design.jpg                             │
│      │                                                      │
│      └── proj-789/                                          │
│          └── ...                                            │
└─────────────────────────────────────────────────────────────┘
```

## Query Patterns

```
┌──────────────────────────────────────────────────────────┐
│                    Query Operations                       │
└──────────────────────────────────────────────────────────┘

1. Get Project Executions
   ┌─────────────────────────────────────────┐
   │ Query: testGenerationExecutions         │
   │ Where: projectId == "proj-456"          │
   │ OrderBy: createdAt DESC                 │
   │ Limit: 50                               │
   └─────────────────────────────────────────┘
   Returns: Array of execution documents

2. Get User Executions
   ┌─────────────────────────────────────────┐
   │ Query: testGenerationExecutions         │
   │ Where: userId == "user-789"             │
   │ OrderBy: createdAt DESC                 │
   │ Limit: 50                               │
   └─────────────────────────────────────────┘
   Returns: Array of execution documents

3. Get Single Execution
   ┌─────────────────────────────────────────┐
   │ Get: testGenerationExecutions/suite-123 │
   └─────────────────────────────────────────┘
   Returns: Single execution document

4. Delete Execution
   ┌─────────────────────────────────────────┐
   │ Delete: testGenerationExecutions/suite  │
   └─────────────────────────────────────────┘
   Note: Images remain in Cloudinary
```

## Error Handling Flow

```
User Action → System Processing → Error Handling
────────────   ─────────────────   ──────────────

Generate      → API Call          → API Error
                                   ├─ Show error message
                                   ├─ Keep form data
                                   └─ Enable retry

              → Image Upload      → Upload Error
                                   ├─ Log error
                                   ├─ Continue generation
                                   └─ Save without images

              → Firestore Save    → Save Error
                                   ├─ Log error
                                   ├─ Continue (non-critical)
                                   └─ Show results anyway

Delete        → API Delete        → API Error
                                   ├─ Show error
                                   └─ Don't update UI

              → Firestore Delete  → Delete Error
                                   ├─ Log error
                                   └─ Continue (best effort)
```

## Security Model

```
┌────────────────────────────────────────────────────────┐
│                  Firestore Security Rules               │
└────────────────────────────────────────────────────────┘

testGenerationExecutions/{suiteId}
├─ Read:   if authenticated AND userId matches
├─ Create: if authenticated AND userId matches
├─ Update: if authenticated AND userId matches
└─ Delete: if authenticated AND userId matches

┌────────────────────────────────────────────────────────┐
│                  Cloudinary Security                    │
└────────────────────────────────────────────────────────┘

Upload Preset: Unsigned (public upload)
├─ Folder: Organized by project/suite
├─ Access: Public read (secure URLs)
└─ Management: Via Cloudinary dashboard
```

This architecture ensures:
- ✅ Automatic data persistence
- ✅ Organized image storage
- ✅ User-specific access control
- ✅ Graceful error handling
- ✅ Scalable query patterns
