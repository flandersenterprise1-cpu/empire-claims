# Empire Claims Group — TODO

## Public Website
- [x] Home page with all sections (hero, trust strip, why ECG, services, claims, process, who we help, testimonials, CTA)
- [x] About page
- [x] Services page
- [x] Claims We Handle page
- [x] FAQ page with accordion
- [x] Contact page with full claim review form
- [x] Sticky header with navigation
- [x] Mobile floating CTA bar
- [x] Dark luxury design system (Cormorant Garamond, Syne, Inter fonts)
- [x] Framer Motion scroll animations
- [x] Contact form wired to back-end (saves to DB, notifies owner)

## Back Office CRM
- [x] Database schema: users, agents, leads, lead_notes, tasks, form_submissions, activity_feed
- [x] tRPC API: all CRUD procedures for leads, agents, tasks, form submissions, settings
- [x] Admin login page (/admin)
- [x] Role-based access: admin, agent, user
- [x] AdminLayout with sidebar navigation
- [x] Dashboard with stats cards, status chart, vertical chart, activity feed, quick actions
- [x] Leads list with search, status/vertical filters, create lead modal
- [x] Lead detail page with edit form, notes, status management
- [x] Pipeline Kanban board with drag-and-drop
- [x] Tasks page with create, complete, filter
- [x] Form Submissions page with convert-to-lead
- [x] Analytics page with bar chart, pie chart, breakdown table
- [x] Agents management page (admin only)
- [x] Settings page with user role management (admin only)

## Back Office CRM v2 (Claims Management System)
- [x] New DB schema: claims, inspections, documents, claim_notes, tasks, adjusters tables
- [x] tRPC API: claims CRUD, inspections, documents (S3), tasks, adjuster procedures
- [x] Rebuild AdminLayout with new sidebar nav (Dashboard, Claims, Inspections, Adjusters, Documents, Tasks, Analytics, Settings)
- [x] Dashboard: stats cards (total, new today, active, inspections, negotiation, settlements, revenue), charts, activity feed
- [x] Claims list page: full table with filters (state, type, adjuster, status, date), create modal
- [x] Claim Detail page: client info, claim details, status timeline, notes, documents, tasks
- [x] Inspections page: schedule/track inspections, mark complete, add notes
- [x] Documents page: central file storage per claim, categorized upload/view/download
- [x] Tasks page: per-claim follow-ups, due dates, overdue/today filters
- [x] Adjusters page: list, stats, licensed states, performance
- [x] Analytics page: claims by month, by state, by type, settlement value, revenue, adjuster performance
- [x] Settings page: manage users, claim statuses, damage types, states
- [x] Role-based access: admin vs adjuster (adjuster sees only assigned claims)
- [x] Mobile-responsive layout for field adjusters

## Username/Password Auth for Back Office
- [ ] Add admin_credentials table to schema (username, passwordHash, userId)
- [ ] Add bcrypt password hashing utility
- [ ] Build credentialAuth tRPC procedures: login, logout, me
- [ ] Build custom AdminLogin page with username/password form
- [ ] Update AdminLayout to use credential-based session (not Manus OAuth)
- [ ] Seed default admin account (admin / changeme123)
- [ ] Write tests for credential auth procedures
