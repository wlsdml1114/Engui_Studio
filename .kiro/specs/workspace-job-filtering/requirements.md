# Requirements Document

## Introduction

This feature addresses a critical bug where jobs are not properly filtered by workspace. Currently, when users switch between workspaces, all jobs from all workspaces are displayed instead of only showing jobs belonging to the active workspace. The console logs show that jobs are being fetched for the correct workspace ID, but the API call is not including the workspace filter parameter, resulting in all 22 jobs being returned regardless of which workspace is active.

## Glossary

- **Workspace**: A container that organizes and isolates user content, jobs, and media
- **Job**: A generation task (image, video, or audio) that can be associated with a workspace
- **Active Workspace**: The currently selected workspace in the UI
- **StudioContext**: The React context that manages application state including workspaces and jobs
- **Jobs API**: The backend API endpoint at `/api/jobs` that retrieves job records from the database

## Requirements

### Requirement 1

**User Story:** As a user, I want to see only the jobs that belong to my currently active workspace, so that I can focus on relevant work without clutter from other workspaces.

#### Acceptance Criteria

1. WHEN a user switches to a workspace THEN the system SHALL fetch and display only jobs where the workspaceId matches the active workspace ID
2. WHEN the jobs API is called THEN the system SHALL include the workspaceId query parameter in the request
3. WHEN jobs are displayed in the UI THEN the system SHALL show only jobs belonging to the active workspace
4. WHEN a user creates a new job THEN the system SHALL associate it with the currently active workspace
5. WHEN no workspace is active THEN the system SHALL not display any jobs

### Requirement 2

**User Story:** As a developer, I want the frontend to properly utilize the existing workspace filtering capability in the API, so that the system correctly filters jobs by workspace without requiring backend changes.

#### Acceptance Criteria

1. WHEN the fetchJobs function executes THEN the system SHALL pass the activeWorkspaceId as a query parameter to the API
2. WHEN the API receives a workspaceId parameter THEN the system SHALL filter jobs by that workspace ID
3. WHEN the workspace changes THEN the system SHALL trigger a new fetch with the updated workspace ID
4. WHEN debugging workspace filtering THEN the system SHALL log the workspace ID being used in the API request
