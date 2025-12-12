# Design Document

## Overview

This design addresses the workspace job filtering bug by modifying the `fetchJobs` function in `StudioContext.tsx` to include the `workspaceId` query parameter when calling the jobs API. The backend API already supports workspace filtering through the `workspaceId` parameter, so no backend changes are required. This is a minimal, surgical fix that leverages existing infrastructure.

## Architecture

The fix involves a single-file change to the frontend context layer:

```
┌─────────────────────────────────────┐
│      StudioContext.tsx              │
│  ┌───────────────────────────────┐  │
│  │   fetchJobs()                 │  │
│  │   - Add workspaceId param     │  │
│  │   - Pass to API call          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                 │
                 │ GET /api/jobs?workspaceId=xxx
                 ▼
┌─────────────────────────────────────┐
│      /api/jobs/route.ts             │
│  ┌───────────────────────────────┐  │
│  │   GET handler                 │  │
│  │   - Already supports filter   │  │
│  │   - No changes needed         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│         Prisma Database             │
│   WHERE workspaceId = xxx           │
└─────────────────────────────────────┘
```

## Components and Interfaces

### Modified Component: StudioContext.tsx

**Function: `fetchJobs`**

Current implementation (line ~378):
```typescript
const response = await fetch(`/api/jobs?userId=user-with-settings&limit=50`);
```

Updated implementation:
```typescript
const response = await fetch(`/api/jobs?userId=user-with-settings&workspaceId=${activeWorkspaceId}&limit=50`);
```

**No interface changes required** - the API already accepts and handles the `workspaceId` parameter.

## Data Models

No data model changes required. The existing schema already supports workspace relationships:

```typescript
interface Job {
  id: string;
  workspaceId?: string;  // Already exists
  // ... other fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework:

1.1 WHEN a user switches to a workspace THEN the system SHALL fetch and display only jobs where the workspaceId matches the active workspace ID
Thoughts: This is a property that should hold for all workspaces and all job sets. We can test this by creating random workspaces with random jobs, switching to a workspace, and verifying that all returned jobs have the matching workspaceId.
Testable: yes - property

1.2 WHEN the jobs API is called THEN the system SHALL include the workspaceId query parameter in the request
Thoughts: This is about verifying that the API call is constructed correctly. We can mock the fetch call and verify the URL contains the workspaceId parameter for any workspace.
Testable: yes - property

1.3 WHEN jobs are displayed in the UI THEN the system SHALL show only jobs belonging to the active workspace
Thoughts: This is the same as 1.1 - if the fetch returns filtered jobs, the UI will display filtered jobs. This is redundant with 1.1.
Testable: redundant with 1.1

1.4 WHEN a user creates a new job THEN the system SHALL associate it with the currently active workspace
Thoughts: This is a property that should hold for all jobs created. We can test by creating random jobs and verifying they all have the activeWorkspaceId.
Testable: yes - property

1.5 WHEN no workspace is active THEN the system SHALL not display any jobs
Thoughts: This is an edge case - when activeWorkspaceId is null. We can test this specific scenario.
Testable: yes - edge case

2.1 WHEN the fetchJobs function executes THEN the system SHALL pass the activeWorkspaceId as a query parameter to the API
Thoughts: This is the same as 1.2 - verifying the API call construction.
Testable: redundant with 1.2

2.2 WHEN the API receives a workspaceId parameter THEN the system SHALL filter jobs by that workspace ID
Thoughts: This is backend behavior that already works. We're not changing the backend, so this is out of scope.
Testable: no - out of scope

2.3 WHEN the workspace changes THEN the system SHALL trigger a new fetch with the updated workspace ID
Thoughts: This is a property about the useEffect dependency. For any workspace change, a fetch should be triggered with the new ID.
Testable: yes - property

2.4 WHEN debugging workspace filtering THEN the system SHALL log the workspace ID being used in the API request
Thoughts: This is about logging behavior, which is helpful but not a functional requirement we need to test.
Testable: no

### Property Reflection:

Reviewing all testable properties:
- **1.1**: Verifies jobs returned match workspace ID
- **1.2**: Verifies API call includes workspaceId parameter  
- **1.4**: Verifies new jobs get workspace ID
- **1.5**: Edge case for null workspace
- **2.3**: Verifies refetch on workspace change

**Redundancy analysis:**
- Property 1.1 and 1.2 are related but distinct: 1.2 verifies the request is correct, 1.1 verifies the response is correct
- Property 2.3 is about the trigger mechanism (useEffect), while 1.1 and 1.2 are about the fetch behavior itself
- All properties provide unique validation value

**No properties need to be removed or consolidated.**

### Correctness Properties:

Property 1: Workspace job filtering
*For any* active workspace and any set of jobs in the database, when jobs are fetched, all returned jobs should have a workspaceId that matches the active workspace ID
**Validates: Requirements 1.1**

Property 2: API request includes workspace parameter
*For any* active workspace, when the fetchJobs function is called, the API request URL should include the workspaceId query parameter with the correct workspace ID
**Validates: Requirements 1.2**

Property 3: New jobs inherit workspace
*For any* job created while a workspace is active, the job's workspaceId should equal the active workspace ID
**Validates: Requirements 1.4**

Property 4: Workspace change triggers refetch
*For any* workspace change event, the system should trigger a new fetchJobs call with the updated workspace ID
**Validates: Requirements 2.3**

## Error Handling

### Edge Cases

1. **No active workspace**: The existing code already handles this with an early return:
   ```typescript
   if (!activeWorkspaceId) {
     console.log('⚠️ fetchJobs: No active workspace ID');
     return;
   }
   ```

2. **API failure**: Existing error handling in try-catch block is sufficient

3. **Empty workspace**: API will return empty array, which is correct behavior

## Testing Strategy

### Unit Tests

We will write unit tests for the StudioContext to verify:
- The fetchJobs function constructs the correct API URL with workspaceId
- Jobs are filtered correctly when workspace changes
- New jobs are created with the active workspaceId

### Property-Based Tests

We will use **fast-check** (JavaScript/TypeScript property-based testing library) to implement the correctness properties.

**Configuration**: Each property-based test will run a minimum of 100 iterations.

**Test annotations**: Each property-based test will include a comment in this format:
```typescript
// **Feature: workspace-job-filtering, Property 1: Workspace job filtering**
```

### Integration Tests

Manual testing will verify:
- Switching workspaces updates the job list correctly
- Creating jobs in different workspaces keeps them isolated
- Console logs show correct workspace IDs in API calls
