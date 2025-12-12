# Implementation Plan

- [x] 1. Fix fetchJobs to include workspaceId parameter
  - Modify the fetchJobs function in StudioContext.tsx to include workspaceId in the API query string
  - Update the console log to show the workspaceId being used
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 1.1 Write property test for workspace job filtering
  - **Property 1: Workspace job filtering**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write property test for API request construction
  - **Property 2: API request includes workspace parameter**
  - **Validates: Requirements 1.2**

- [x] 2. Verify job creation includes workspaceId
  - Review the addJob function to ensure it correctly assigns activeWorkspaceId to new jobs
  - Add console logging to confirm workspace assignment
  - _Requirements: 1.4_

- [x] 2.1 Write property test for job workspace assignment
  - **Property 3: New jobs inherit workspace**
  - **Validates: Requirements 1.4**

- [x] 3. Verify workspace change triggers refetch
  - Review the useEffect dependency array to ensure activeWorkspaceId changes trigger fetchJobs
  - Confirm the existing implementation is correct
  - _Requirements: 2.3_

- [x] 3.1 Write property test for workspace change refetch
  - **Property 4: Workspace change triggers refetch**
  - **Validates: Requirements 2.3**

- [x] 4. Write unit tests for StudioContext job filtering
  - Test fetchJobs constructs correct URL with workspaceId
  - Test jobs state updates when workspace changes
  - Test edge case: no active workspace
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 5. Manual testing and verification
  - Test switching between workspaces shows correct jobs
  - Test creating jobs in different workspaces
  - Verify console logs show correct workspace IDs
  - _Requirements: 1.1, 1.3, 1.4_
