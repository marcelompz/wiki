# OmniBuy (Standalone Micro-SaaS)

## Technical Architecture & Product Development Plan

---

## 1\. Executive Summary & Product Vision

**OmniBuy** is a lightweight, mobile-first micro-SaaS designed to decentralize purchasing requisitions and approvals. It enables frontline staff (store managers, field operators, supervisors) to initiate purchase requests instantly via a mobile UI, while management approves or rejects requests on the go.

The module operates completely **standalone** with its own database, authentication, and API layer, but exposes webhooks and REST endpoints to integrate seamlessly into the main **OmniFlow** suite or third-party ERPs when needed.

---

## 2\. Core Functional Scope & User Roles

```
┌────────────────────────────────────────────────────────────────────────┐
│                              USER ROLES                                │
├──────────────────────────┬──────────────────────┬──────────────────────┤
│ 1. Requisitioner         │ 2. Approving Manager │ 3. Buyer / Admin     │
│ - Create requests        │ - Push notifications │ - Vendor management  │
│ - Photo attachments      │ - 1-Tap Approve/Reject│ - PO generation      │
│ - Track status           │ - Budget oversight   │ - Audit & Webhooks   │
└──────────────────────────┴──────────────────────┴──────────────────────┘
```

### Key Workflows:

1. **Request Creation:** Quick mobile form with item, category, urgency, estimated cost, and optional camera capture of quotes/items.  
2. **Dynamic Approval Engine:** Route requests based on spend thresholds (e.g., \< \$100 auto-approve / single level; \> \$100 requires manager sign-off).  
3. **Fulfillment & PO Generation:** Approved requests convert to structured Purchase Orders (PO) exportable as PDF or pushed via webhooks.  
4. **Receipt Verification:** Requisitioner scans/photographs final invoice or receipt upon receiving items to close out the request cycle.

---

## 3\. Recommended Tech Stack & Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (PWA)                            │
│  React / Next.js (Mobile-responsive) + Tailwind CSS + Lucide Icons   │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ REST API / WebSockets
┌──────────────────────────────────▼───────────────────────────────────┐
│                           BACKEND & STORAGE                          │
│  Node.js (Express/Fastify) OR Python (FastAPI) + PostgreSQL / Supabase│
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Outbound Push / Hooks
┌──────────────────────────────────▼───────────────────────────────────┐
│                         INTEGRATIONS & NOTIFS                        │
│  Firebase Cloud Messaging (Push) + Webhooks Engine + OmniFlow Core   │
└──────────────────────────────────────────────────────────────────────┘
```

* **Frontend:** Mobile-first Progressive Web App (PWA) for cross-platform zero-install deployment (iOS/Android/Desktop).  
* **Backend:** Microservices REST API with multi-tenant isolation (`tenant_id` pattern).  
* **Database:** PostgreSQL with Row Level Security (RLS) or Supabase for rapid multi-tenancy.  
* **Notifications:** FCM / Web Push for mobile instant alerts.

---

## 4\. Phased Development Roadmap (4-Week Sprint Plan)

```
┌──────────────────────────────────────────────────────────────────────┐
│                           ROADMAP OVERVIEW                           │
├──────────┬───────────────────────────────────────────────────────────┤
│ Phase 1  │ Core Architecture & Multi-Tenancy Setup (Week 1)          │
│ Phase 2  │ Mobile Requisition & Approval Engine (Week 2)             │
│ Phase 3  │ Purchase Order (PO) & Vendor Engine (Week 3)             │
│ Phase 4  │ Webhook System & Standalone SaaS Integration (Week 4)     │
└──────────┴───────────────────────────────────────────────────────────┘
```

### Phase 1: Core Architecture & Multi-tenancy (Week 1\)

- [ ] Database schema design (Tenants, Users, Departments, Requisitions, Items, Approvals).  
- [ ] Authentication system (JWT/OAuth2) with Tenant isolation.  
- [ ] Base API endpoints for User Management and Setup.

### Phase 2: Mobile Requisition & Approval Engine (Week 2\)

- [ ] Build mobile UI for Request Creation (Camera integration, voice notes, item tagging).  
- [ ] Build Approval Card Feed UI ("Tinder-style" or swipeable approval cards for managers).  
- [ ] Implement Push Notification pipeline (Firebase/Web Push).  
- [ ] Rule-based approval threshold engine.

### Phase 3: PO Engine & Receipt Capture (Week 3\)

- [ ] Automatic conversion of approved Requisitions to formal POs.  
- [ ] PDF generation for Purchase Orders.  
- [ ] Receipt/Invoice photo upload flow to mark orders as "Fulfilled".  
- [ ] Audit log tracking (who approved, timestamp, spent total).

### Phase 4: Webhooks, Integration & Standalone SaaS Launch (Week 4\)

- [ ] Outbound Webhook Manager (`ON_REQUISITION_CREATED`, `ON_PO_APPROVED`, `ON_RECEIPT_ATTACHED`).  
- [ ] Standalone billing/subscription module hooks (Stripe / SaaS integration ready).  
- [ ] API Key management for external ERP connection.  
- [ ] Final E2E QA, security check, and production deployment pipeline.

---

## 5\. Data Model / Entity Relationship Overview

```sql
-- Conceptual Schema Snippet

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    estimated_total DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, PURCHASED
    priority VARCHAR(20) DEFAULT 'NORMAL',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES requisitions(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- APPROVED, REJECTED
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6\. Commercialization & OmniFlow Integration Strategy

1. **Standalone Micro-SaaS Tier:**

   * Marketed as a zero-setup mobile app for teams needing decentralized purchasing without ERP overhead.  
   * Subscription pricing based on active approving managers or monthly PO volume.  
2. **OmniFlow Suite Upsell:**

   * Default inclusion for high-tier OmniFlow customers.  
   * One-click synchronization to inject approved PO financial data into OmniFlow’s accounting and inventory modules.