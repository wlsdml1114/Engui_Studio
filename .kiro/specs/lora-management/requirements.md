# Requirements Document

## Introduction

이 기능은 사용자가 LoRA(Low-Rank Adaptation) 모델을 S3에 업로드하고 관리하며, WAN 2.2 비디오 생성 시 업로드된 LoRA를 선택하여 사용할 수 있도록 하는 시스템입니다. 사용자는 LoRA 파일을 업로드하고, 업로드된 LoRA 목록을 확인하며, 비디오 생성 폼에서 원하는 LoRA를 선택할 수 있습니다.

## Glossary

- **LoRA**: Low-Rank Adaptation의 약자로, 사전 학습된 모델을 효율적으로 미세 조정하기 위한 파일
- **S3**: Amazon Simple Storage Service, 클라우드 객체 스토리지 서비스
- **WAN 2.2**: 비디오 생성 모델
- **System**: LoRA 관리 및 비디오 생성 시스템
- **User**: 시스템을 사용하는 사용자
- **LoRA Dialog**: LoRA 업로드 및 관리를 위한 대화상자 컴포넌트
- **Generation Form**: WAN 2.2 비디오 생성을 위한 폼 컴포넌트

## Requirements

### Requirement 1

**User Story:** As a user, I want to upload LoRA files to S3, so that I can use custom models for video generation.

#### Acceptance Criteria

1. WHEN a user clicks the LoRA upload button THEN the System SHALL display a dialog for LoRA file upload
2. WHEN a user selects a LoRA file (with .safetensors or .ckpt extension) THEN the System SHALL validate the file format and size
3. WHEN a user submits a valid LoRA file THEN the System SHALL upload the file to S3 and store metadata in the database
4. WHEN the upload completes successfully THEN the System SHALL display a success message and close the dialog
5. IF the upload fails THEN the System SHALL display an error message with the failure reason

### Requirement 2

**User Story:** As a user, I want to view all my uploaded LoRA files, so that I can manage and select them for video generation.

#### Acceptance Criteria

1. WHEN a user opens the LoRA management dialog THEN the System SHALL display a list of all uploaded LoRA files with their names, upload dates, and file sizes
2. WHEN the LoRA list is empty THEN the System SHALL display a message indicating no LoRAs are available
3. WHEN a user refreshes the LoRA list THEN the System SHALL fetch the latest data from the database
4. WHEN displaying LoRA items THEN the System SHALL show a thumbnail or icon, name, and metadata for each LoRA

### Requirement 3

**User Story:** As a user, I want to delete uploaded LoRA files, so that I can manage my storage and remove unused models.

#### Acceptance Criteria

1. WHEN a user clicks the delete button on a LoRA item THEN the System SHALL display a confirmation dialog
2. WHEN a user confirms deletion THEN the System SHALL remove the file from S3 and delete the database record
3. WHEN deletion completes successfully THEN the System SHALL update the LoRA list and display a success message
4. IF deletion fails THEN the System SHALL display an error message and maintain the current state

### Requirement 4

**User Story:** As a user, I want to select a LoRA when generating WAN 2.2 videos, so that I can customize the video generation with my trained models.

#### Acceptance Criteria

1. WHEN a user opens the WAN 2.2 generation form THEN the System SHALL display a LoRA selection dropdown or list
2. WHEN the LoRA selection is displayed THEN the System SHALL show all available LoRAs with their names
3. WHEN a user selects a LoRA THEN the System SHALL update the form state with the selected LoRA identifier
4. WHEN a user submits the generation form with a selected LoRA THEN the System SHALL include the LoRA S3 path in the generation request
5. WHERE no LoRA is selected, the System SHALL proceed with default WAN 2.2 generation without LoRA

### Requirement 5

**User Story:** As a user, I want to access LoRA management from the video generation interface, so that I can quickly upload new LoRAs without leaving the generation workflow.

#### Acceptance Criteria

1. WHEN a user is on the WAN 2.2 generation page THEN the System SHALL display a button to open LoRA management
2. WHEN a user clicks the LoRA management button THEN the System SHALL open the LoRA management dialog
3. WHEN a user uploads a new LoRA from the dialog THEN the System SHALL update the LoRA selection list in the generation form
4. WHEN the LoRA management dialog is closed THEN the System SHALL return focus to the generation form

### Requirement 6

**User Story:** As a system administrator, I want LoRA uploads to be validated and secured, so that only valid files are stored and system resources are protected.

#### Acceptance Criteria

1. WHEN a user attempts to upload a file THEN the System SHALL validate the file extension is .safetensors or .ckpt
2. WHEN a user attempts to upload a file THEN the System SHALL validate the file size does not exceed 5GB
3. WHEN uploading to S3 THEN the System SHALL use secure, authenticated connections
4. WHEN storing LoRA metadata THEN the System SHALL associate the LoRA with the user's workspace or account
5. WHEN generating a presigned URL for S3 access THEN the System SHALL set an appropriate expiration time
