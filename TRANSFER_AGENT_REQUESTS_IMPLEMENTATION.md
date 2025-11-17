# Transfer Agent Request Module - Implementation Guide

## Overview
The Transfer Agent Request module enables brokers to submit and track transfer agent requests (DWAC deposits, withdrawals, unit splits, etc.) and allows admins to review and process these requests.

## 📦 What's Been Implemented

### 1. Database Schema
**Location**: `supabase/migrations/create_transfer_agent_requests.sql`

**Tables Created**:
- `transfer_agent_requests` - Main requests table
- `transfer_request_documents` - Document attachments for requests
- `transfer_request_communications` - Comments/messages between brokers and admins
- `transfer_request_processing_steps` - Admin workflow tracking (for future use)

**Key Features**:
- Auto-generated request numbers (TR-2025-0001 format)
- Status tracking: Pending → Under Review → Approved → Processing → Completed
- Priority levels: Normal, High, Urgent
- Automatic timestamps for status changes

### 2. API Routes

#### `/api/transfer-requests` (route.js)
- **GET**: Fetch requests (filtered by issuer, status, or single request)
- **POST**: Create new request
- **PATCH**: Update request (status, assignment, etc.)

#### `/api/transfer-requests/documents` (documents/route.js)
- **GET**: Fetch documents for a request
- **POST**: Upload document
- **PATCH**: Mark document as reviewed (admin only)
- **DELETE**: Remove document

#### `/api/transfer-requests/communications` (communications/route.js)
- **GET**: Fetch communications/comments
- **POST**: Add comment

### 3. React Components

#### `components/transfer-requests/NewRequestForm.jsx`
**Multi-step wizard for brokers to create requests**

**Step 1 - Request Type**:
- Select request type (DWAC Deposit, Withdrawal, Unit Split, etc.)
- Specify purpose for DWAC deposits

**Step 2 - Request Details**:
- Shareholder information (name, account number, DTC number)
- Securities details (type, quantity, CUSIP)
- Requested completion date
- Special instructions
- Priority level

**Step 3 - Document Upload**:
- Upload required documents (Authorization Letter, Transfer Form, etc.)
- Upload optional supporting documents
- 10MB file size limit
- Supports PDF, DOC, DOCX, PNG, JPG

#### `components/transfer-requests/TransferRequestsTab.jsx`
**Main dashboard for viewing requests**

**Features**:
- List all requests with status badges
- Search by request number, type, or shareholder name
- Filter by status (All, Pending, Under Review, Completed, Rejected)
- Summary stats (total, pending, completed, in progress)
- Click to view details

#### `components/transfer-requests/RequestDetailView.jsx`
**Detailed view of a single request**

**Features**:
- Visual status timeline
- Complete request information
- Document list with download links
- Communication thread
- Add comments/messages
- Broker and assignment information

### 4. Page Integration

**Modified**: `app/information/[issuerId]/page.jsx`
- Added `TransferRequestsTab` component to Tab 3
- Replaces the "Coming Soon" placeholder
- Works for both brokers and admins

## 🚀 Installation Steps

### Step 1: Run Database Migration

Copy the entire contents of `supabase/migrations/create_transfer_agent_requests.sql` and paste it into your Supabase SQL Editor, then execute.

This will create:
- 4 tables
- 10 indexes
- 2 functions
- 2 triggers

### Step 2: Install Dependencies

All required dependencies should already be in your project:
- `sonner` (for toast notifications)
- UI components from shadcn/ui
- Icons from lucide-react

If any are missing, install them:
```bash
npm install sonner
```

### Step 3: Verify File Structure

Ensure these files exist:
```
/app/api/transfer-requests/
  ├── route.js
  ├── documents/route.js
  └── communications/route.js

/components/transfer-requests/
  ├── NewRequestForm.jsx
  ├── TransferRequestsTab.jsx
  └── RequestDetailView.jsx

/supabase/migrations/
  └── create_transfer_agent_requests.sql
```

## 🧪 Testing Guide

### Test as Broker

1. **Navigate to Information Page**
   - Go to `/information`
   - Select an issuer
   - Click "Transfer Agent Requests" tab

2. **Create New Request**
   - Click "+ New Request" button
   - Step 1: Select "DWAC Deposit" → Choose "For Resale"
   - Step 2: Fill in details:
     - Shareholder Name: "Test Shareholder"
     - Account Number: "ACC-12345"
     - DTC Number: "0001"
     - Security Type: "Class A Common Stock"
     - Quantity: 50000
     - Requested Date: [any future date]
   - Step 3: Upload documents:
     - Upload an Authorization Letter (PDF)
     - Upload a Transfer Form (PDF)
   - Click "Submit Request"

3. **View Request Details**
   - Click on the newly created request in the list
   - Verify all information is displayed correctly
   - Add a comment: "Please expedite this request"
   - Verify comment appears in communication history

4. **Test Filters**
   - Use status filters: All, Pending, Completed
   - Use search: Search by request number (TR-2025-0001)
   - Verify summary stats update correctly

### Test as Admin

1. **Access Same View**
   - Navigate to `/information/[issuerId]`
   - Click "Transfer Agent Requests" tab
   - See all broker requests

2. **Review Request**
   - Click on a pending request
   - View all documents uploaded by broker
   - Add internal comment (not visible to broker)
   - Update request status (future enhancement)

3. **Verify Data**
   - Check that broker information is displayed
   - Verify timeline shows correct dates
   - Test document downloads

## 📊 Database Schema Reference

### transfer_agent_requests
```sql
- id (UUID, PK)
- request_number (TEXT, unique, auto-generated)
- issuer_id (UUID)
- broker_id (UUID)
- request_type (TEXT)
- request_purpose (TEXT)
- shareholder_name (TEXT)
- account_number (TEXT)
- dtc_number (TEXT)
- security_type (TEXT)
- quantity (NUMERIC)
- cusip (TEXT)
- requested_completion_date (DATE)
- special_instructions (TEXT)
- status (TEXT) - Default: 'Pending'
- priority (TEXT) - Default: 'Normal'
- assigned_to (UUID)
- assigned_at (TIMESTAMP)
- submitted_at (TIMESTAMP)
- review_started_at (TIMESTAMP)
- approved_at (TIMESTAMP)
- completed_at (TIMESTAMP)
- rejected_at (TIMESTAMP)
- internal_notes (TEXT)
- rejection_reason (TEXT)
- completion_notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🎨 User Flow Summary

### Broker Flow
1. Navigate to issuer → Transfer Agent Requests tab
2. Click "+ New Request"
3. Fill out 3-step form
4. Upload required documents
5. Submit request → Generates TR-2025-XXXX number
6. View request in list → Status: "Pending"
7. Click to view details
8. Add comments/questions
9. Receive notifications when status changes (future)

### Admin Flow
1. Navigate to issuer → Transfer Agent Requests tab
2. See all broker requests with filters
3. Click pending request to review
4. View all documents and details
5. Add comments visible to broker
6. Update status to "Under Review" → "Approved" → "Processing" → "Completed"
7. Or reject with reason

## 🔧 Configuration

### Request Types
Defined in `NewRequestForm.jsx`:
```javascript
const REQUEST_TYPES = [
  "DWAC Deposit (for resale)",
  "DWAC Withdrawal",
  "Unit Split",
  "Transfer of Ownership",
  "Certificate Issuance",
  "Other"
];
```

### Required Documents by Type
```javascript
const REQUIRED_DOCUMENTS = {
  "DWAC Deposit": ["Authorization Letter", "Transfer Form"],
  "DWAC Withdrawal": ["Authorization Letter", "Withdrawal Form"],
  "Unit Split": ["Authorization Letter", "Split Instructions"],
  // ...
};
```

### Status Configuration
```javascript
const STATUS_CONFIG = {
  "Pending": { color: "bg-gray-100 text-gray-800", icon: Clock },
  "Under Review": { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  "Approved": { color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  "Processing": { color: "bg-purple-100 text-purple-800", icon: Clock },
  "Completed": { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  "Rejected": { color: "bg-red-100 text-red-800", icon: XCircle },
  "More Info Needed": { color: "bg-orange-100 text-orange-800", icon: AlertCircle }
};
```

## 🚧 Future Enhancements

### Planned Features
1. **Admin Review Interface**
   - Dedicated admin page at `/issuer/[issuerId]/transfer-requests`
   - Review checklist with checkboxes
   - Document preview (inline PDF viewer)
   - Approve/Reject buttons with reason
   - Assignment to team members

2. **Email Notifications**
   - Notify broker when status changes
   - Notify admin when new request submitted
   - Notify broker when comments added

3. **DocuSign Integration**
   - Sign documents electronically
   - Track signature status
   - Auto-attach signed documents

4. **Analytics Dashboard**
   - Request volume trends
   - Average processing time
   - Requests by type/broker
   - Performance metrics

5. **Bulk Actions**
   - Approve multiple requests
   - Export to CSV/Excel
   - Print multiple requests

6. **Processing Steps Tracking**
   - Use `transfer_request_processing_steps` table
   - Track DTC communication, share transfer, etc.
   - Attach confirmation documents

## 🐛 Troubleshooting

### Issue: Request number not generating
**Solution**: Verify the `generate_request_number()` function and trigger were created successfully in the database.

### Issue: Documents not uploading
**Solution**:
- Check that `/api/upload` endpoint exists and is working
- Verify file size is under 10MB
- Check file format is supported (PDF, DOC, DOCX, PNG, JPG)

### Issue: Status filters not working
**Solution**: Check that request status values match exactly (case-sensitive): "Pending", "Under Review", etc.

### Issue: Comments not appearing
**Solution**: Verify user authentication and check that `user_id` is being passed correctly to the API.

## 📝 API Usage Examples

### Create Request
```javascript
const response = await fetch("/api/transfer-requests", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    issuerId: "uuid-here",
    requestType: "DWAC Deposit",
    requestPurpose: "For Resale",
    shareholderName: "John Smith",
    accountNumber: "ACC-12345",
    securityType: "Class A Common Stock",
    quantity: 50000,
    requestedCompletionDate: "2025-02-01",
    priority: "High"
  })
});
const request = await response.json();
```

### Update Request Status
```javascript
const response = await fetch("/api/transfer-requests", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    requestId: "request-uuid",
    updates: {
      status: "Under Review",
      assigned_to: "admin-uuid"
    }
  })
});
```

### Add Comment
```javascript
const response = await fetch("/api/transfer-requests/communications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    requestId: "request-uuid",
    message: "Please provide additional documentation",
    isInternal: false // visible to broker
  })
});
```

## ✅ Checklist

- [x] Database migration script created
- [x] API routes implemented (GET, POST, PATCH)
- [x] Multi-step request form component
- [x] Request list/dashboard component
- [x] Request detail view component
- [x] Document upload functionality
- [x] Communication/comments system
- [x] Status badges and timeline
- [x] Search and filter functionality
- [x] Integration with information page
- [ ] Database migration executed (manual step)
- [ ] End-to-end testing completed
- [ ] Admin review interface (future)
- [ ] Email notifications (future)

## 📞 Support

If you encounter any issues during implementation or testing:
1. Check the browser console for JavaScript errors
2. Check the network tab for API call failures
3. Verify database tables were created correctly
4. Ensure all files are in the correct locations
5. Check that user roles are set correctly in the database

---

**Version**: 1.0.0
**Last Updated**: January 2025
**Status**: Ready for testing
