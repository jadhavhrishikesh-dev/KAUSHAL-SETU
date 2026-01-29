# Kaushal-Setu: Project Overview & Dashboard Specification

## 1. Project Overview
**Kaushal-Setu** is a comprehensive evaluation, training, and utility system for the Indian Army. It is designed to manage the lifecycle, performance tracking, and administrative needs of Agniveers, Officers, and Units.

## 2. User Roles
The system supports distinct user roles, each with a tailored dashboard:
1.  **Admin (Superuser)**: System-wide control.
2.  **Company Commander (COY_CDR)**: Analytics and management of a specific Company.
3.  **Company Clerk (COY_CLK)**: Administrative tasks (Leave/Medical) for a Company.
4.  **Training Officer (TRG_OFFICER)**: Scheduling and scoring of training tests.
5.  **Agniveer**: Individual profile, performance view, and requests.

---

## 3. Dashboard Specifications

### 3.1 Admin Dashboard
**Purpose**: Central hub for system administration, user management, and policy distribution.

**Key Modules**:
*   **User Management**:
    *   **Create/Manage Users**: Add Commanders, Training Officers, Clerks.
    *   **Bulk Import**: Upload `.csv` files to batch-create Agniveer profiles.
    *   **Role Assignment**: Assign specific Companies or Units to officers.
*   **System Controls**:
    *   **Audit Logs**: View security logs (logins, edits, exports).
    *   **Policies**: Upload and manage PDF regulations/documents visible to all users.
    *   **Backup**: Trigger database backups.
*   **Agniveer Directory**:
    *   **Global Search**: Find any Agniveer by Service ID or Name.
    *   **Edit Profile**: Correction of basic details (Rank, Unit, DOB).

### 3.2 Company Commander Dashboard
**Purpose**: High-level a# Kaushal-Setu: Project Overview & Dashboard Specification

## 1. Project Overview
**Kaushal-Setu** is a comprehensive evaluation, training, and utility system for the Indian Army. It is designed to manage the lifecycle, performance tracking, and administrative needs of Agniveers, Officers, and Units.

## 2. User Roles
The system supports distinct user roles, each with a tailored dashboard:
1.  **Admin (Superuser)**: System-wide control.
2.  **Company Commander (COY_CDR)**: Analytics and management of a specific Company.
3.  **Company Clerk (COY_CLK)**: Administrative tasks (Leave/Medical) for a Company.
4.  **Training Officer (TRG_OFFICER)**: Scheduling and scoring of training tests.
5.  **Agniveer**: Individual profile, performance view, and requests.

---

## 3. Dashboard Specifications

### 3.1 Admin Dashboard
**Purpose**: Central hub for system administration, user management, and policy distribution.

**Key Modules**:
*   **User Management**:
    *   **Create/Manage Users**: Add Commanders, Training Officers, Clerks.
    *   **Bulk Import**: Upload `.csv` files to batch-create Agniveer profiles.
    *   **Role Assignment**: Assign specific Companies or Units to officers.
*   **System Controls**:
    *   **Audit Logs**: View security logs (logins, edits, exports).
    *   **Policies**: Upload and manage PDF regulations/documents visible to all users.
    *   **Backup**: Trigger database backups.
*   **Agniveer Directory**:
    *   **Global Search**: Find any Agniveer by Service ID or Name.
    *   **Edit Profile**: Correction of basic details (Rank, Unit, DOB).

### 3.2 Company Commander Dashboard
**Purpose**: High-level analytics and retention risk management for a Company Unit (e.g., Alpha Coy).

**Key Modules**:
*   **Command Hub (Analytics)**:
    *   **Readiness Score**: Aggregate metric of unit performance.
    *   **RRI (Retention Risk Index)**: AI-driven score predicting retention probability.
    *   **Trend Charts**: Line charts showing RRI, Technical, and Behavioral trends over months/quarters.
*   **Action Center**:
    *   **Smart Alerts**: "Agniveer X performance dropped", "High Risk Identified".
    *   **AI Insights**: On-demand AI report generation for specific soldiers.
*   **Management**:
    *   **Agniveer Roster**: List view with filtering/search.
    *   **Assessments**: Entry forms for Behavioral traits (Q1/Q2...) and Achievements (Sports/Valor).
    *   **Approvals**: Review and Approve/Reject Leave requests and Grievances.
*   **Honor Board**:
    *   **Top Performers**: Sidebar highlighting best soldiers.
    *   **Champions**: Recognition for specific achievements.

### 3.3 Training Officer Dashboard
**Purpose**: Management of technical and physical testing.

**Key Modules**:
*   **Test Management**:
    *   **Scheduler**: Create new tests (Firing, Drills, PFT) with dates and max marks.
    *   **Batch Assignment**: Assign tests to specific Batches or Companies.
*   **Result Entry**:
    *   **Bulk Entry**: Table view to rapidly enter scores for a list of soldiers.
    *   **Auto-Calculation**: System updates the Agniveer's "Technical Score" automatically upon submission.
*   **Stats**:
    *   **Pass/Fail Ratio**: Visual breakdown of test results.

### 3.4 Agniveer Dashboard
**Purpose**: Self-service portal for the individual soldier.

**Key Modules**:
*   **Profile Center**:
    *   **Digital Dossier**: View Personal Details, NOK (Next of Kin), Bank Stats.
    *   **QR Code**: Digital Identity Card.
*   **Performance Radar**:
    *   **Skill Graph**: Spider chart comparing their skills (Firing, Physical, Discipline) vs Battalion Average.
    *   **RRI Score**: View their own current retention score (if allowed).
*   **Utilities**:
    *   **Leave Management**: Apply for leave, view status (Approved/Rejected), view Leave Ledger.
    *   **Grievance Redressal**: File complaints/requests to the Company Commander.
    *   **Payslips**: View monthly pay data (Placeholder/Integration).

### 3.5 Internal Mail System (Shared)
**Purpose**: Secure communication within the internal network (Intranet).

**Features**:
*   **Structure**: Inbox, Sent, Drafts, Trash.
*   **Composition**:
    *   **Recipient Search**: Search users by name/rank.
    *   **Broadcast**: Send to entire "Company Alpha" or "Batch 2024".
*   **Security**: End-to-end encryption (simulated) and role-based routing.

---

## 4. UI/UX Design Guidelines (For Design Tools)
If developing a new UI, adhere to these principles:

1.  **Theme**: "Indian Army Premium" - Earthy tones (Olive Green, Sand, Gold) mixed with modern Dark Mode (Stone/Slate/Teal).
2.  **Typography**: Bold, serif headings (Official feel) with clean sans-serif body text (Readability).
3.  **Interaction**:
    *   **Hover Effects**: Subtle glow/lift on cards.
    *   **Clean Data**: Use "Bento Grid" layouts for dashboards (rectangular, organized blocks).
    *   **Feedback**: Toast notifications for all actions (Save, Send, Error).
4.  **Accessibility**: High contrast for outdoor readability (field usage).
nalytics and retention risk management for a Company Unit (e.g., Alpha Coy).

**Key Modules**:
*   **Command Hub (Analytics)**:
    *   **Readiness Score**: Aggregate metric of unit performance.
    *   **RRI (Retention Risk Index)**: AI-driven score predicting retention probability.
    *   **Trend Charts**: Line charts showing RRI, Technical, and Behavioral trends over months/quarters.
*   **Action Center**:
    *   **Smart Alerts**: "Agniveer X performance dropped", "High Risk Identified".
    *   **AI Insights**: On-demand AI report generation for specific soldiers.
*   **Management**:
    *   **Agniveer Roster**: List view with filtering/search.
    *   **Assessments**: Entry forms for Behavioral traits (Q1/Q2...) and Achievements (Sports/Valor).
    *   **Approvals**: Review and Approve/Reject Leave requests and Grievances.
*   **Honor Board**:
    *   **Top Performers**: Sidebar highlighting best soldiers.
    *   **Champions**: Recognition for specific achievements.

### 3.3 Training Officer Dashboard
**Purpose**: Management of technical and physical testing.

**Key Modules**:
*   **Test Management**:
    *   **Scheduler**: Create new tests (Firing, Drills, PFT) with dates and max marks.
    *   **Batch Assignment**: Assign tests to specific Batches or Companies.
*   **Result Entry**:
    *   **Bulk Entry**: Table view to rapidly enter scores for a list of soldiers.
    *   **Auto-Calculation**: System updates the Agniveer's "Technical Score" automatically upon submission.
*   **Stats**:
    *   **Pass/Fail Ratio**: Visual breakdown of test results.

### 3.4 Agniveer Dashboard
**Purpose**: Self-service portal for the individual soldier.

**Key Modules**:
*   **Profile Center**:
    *   **Digital Dossier**: View Personal Details, NOK (Next of Kin), Bank Stats.
    *   **QR Code**: Digital Identity Card.
*   **Performance Radar**:
    *   **Skill Graph**: Spider chart comparing their skills (Firing, Physical, Discipline) vs Battalion Average.
    *   **RRI Score**: View their own current retention score (if allowed).
*   **Utilities**:
    *   **Leave Management**: Apply for leave, view status (Approved/Rejected), view Leave Ledger.
    *   **Grievance Redressal**: File complaints/requests to the Company Commander.
    *   **Payslips**: View monthly pay data (Placeholder/Integration).

### 3.5 Internal Mail System (Shared)
**Purpose**: Secure communication within the internal network (Intranet).

**Features**:
*   **Structure**: Inbox, Sent, Drafts, Trash.
*   **Composition**:
    *   **Recipient Search**: Search users by name/rank.
    *   **Broadcast**: Send to entire "Company Alpha" or "Batch 2024".
*   **Security**: End-to-end encryption (simulated) and role-based routing.

---

## 4. UI/UX Design Guidelines (For Design Tools)
If developing a new UI, adhere to these principles:

1.  **Theme**: "Indian Army Premium" - Earthy tones (Olive Green, Sand, Gold) mixed with modern Dark Mode (Stone/Slate/Teal).
2.  **Typography**: Bold, serif headings (Official feel) with clean sans-serif body text (Readability).
3.  **Interaction**:
    *   **Hover Effects**: Subtle glow/lift on cards.
    *   **Clean Data**: Use "Bento Grid" layouts for dashboards (rectangular, organized blocks).
    *   **Feedback**: Toast notifications for all actions (Save, Send, Error).
4.  **Accessibility**: High contrast for outdoor readability (field usage).
