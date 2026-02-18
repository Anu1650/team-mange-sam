# Casablanca AI - Specification Document

## 1. Project Overview
- **Project Name**: Casablanca AI
- **Type**: Desktop Application (Electron)
- **Company**: Sam's Zerobytes Corporation
- **Core Features**: Task Management, Decision Making, Chat, Video Meetings, Announcements, Project Tracking
- **Target Users**: Small team of 6 members

## 2. UI/UX Specification

### Layout Structure
- **Window**: Single main window with sidebar navigation
- **Sidebar**: 220px fixed width, dark theme (#1a1a2e)
- **Main Content**: Flexible width, light background (#f5f5f5)
- **Header**: 60px height with app title and user profile

### Visual Design
- **Color Palette**:
  - Primary: #4361ee (blue)
  - Secondary: #3f37c9 (deep blue)
  - Accent: #4cc9f0 (cyan)
  - Background: #f5f5f5
  - Sidebar: #1a1a2e
  - Card Background: #ffffff
  - Success: #06d6a0
  - Warning: #ffd166
  - Danger: #ef476f

- **Typography**:
  - Font Family: 'Segoe UI', sans-serif
  - Headings: 24px (h1), 20px (h2), 16px (h3)
  - Body: 14px
  - Small: 12px

- **Spacing**: 8px base unit (8, 16, 24, 32px)

### Components
1. **Sidebar Navigation**
   - Logo/App name at top
   - Navigation items with icons: Dashboard, Tasks, Decisions, Projects, Chat, Meetings, Announcements
   - User profile at bottom

2. **Dashboard**
   - Quick stats cards (tasks pending, decisions needed, active projects)
   - Recent activity feed
   - Upcoming meetings

3. **Task Management**
   - Kanban board with columns: To Do, In Progress, Review, Done
   - Task cards with title, assignee, due date, priority
   - Add/Edit task modal
   - Filter by assignee, priority

4. **Decision Making**
   - List of decisions to make
   - Vote feature (approve/reject)
   - Comments thread
   - Decision status: Pending, Approved, Rejected

5. **Project Tracking**
   - Project cards with progress bars
   - Milestones timeline
   - Team member assignment

6. **Chat App**
   - Team chat channel
   - Direct messages
   - Message input with send button
   - Online/offline status indicators

7. **Video Meetings**
   - Meeting list with scheduled meetings
   - Join meeting button
   - In-meeting: video grid, mute audio/video controls, screen share, leave meeting
   - WebRTC peer-to-peer connection

8. **Announcements**
   - Create new announcement
   - Announcement list with dates
   - Pin important announcements

## 3. Functionality Specification

### Core Features
1. **Authentication**: Simple local login (username based, no passwords for demo)
2. **Task Management**: CRUD operations for tasks, drag-drop status changes
3. **Decision Making**: Create decisions, vote, comment, track outcomes
4. **Project Tracking**: Create projects, add milestones, track progress
5. **Chat**: Real-time messaging within team
6. **Video Meetings**: WebRTC-based peer video calls
7. **Announcements**: Post and view team announcements

### Data Storage
- SQLite database for persistence
- Tables: users, tasks, decisions, projects, milestones, messages, announcements, meetings

### User Interactions
- Click to navigate between sections
- Click task to view/edit details
- Drag tasks between columns
- Click vote buttons for decisions
- Type and send chat messages
- Join/create video meetings

## 4. Acceptance Criteria
- [ ] Application launches without errors
- [ ] All 7 navigation sections accessible
- [ ] Tasks can be created, edited, and status changed
- [ ] Decisions can be voted on
- [ ] Projects show progress
- [ ] Chat messages can be sent and received
- [ ] Video meetings can be started and joined
- [ ] Announcements can be created and viewed
- [ ] Data persists between app restarts
