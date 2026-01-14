# Product Requirements Document: Sweet Dreams Bakery Order Management System

**Project Name:** Sweet Dreams Bakery Order Management System
**Version:** 1.0
**Date:** 2026-01-11
**Prepared For:** Sarah (Sweet Dreams Bakery Owner)
**Decision Learning ID:** BAKERY-PLAN-20260111-001

---

## Executive Summary

Sweet Dreams Bakery needs a simple, affordable order management system to eliminate lost orders, reduce customer status calls, and provide real-time business visibility. The owner (Sarah) has moderate tech comfort (6-7/10) and a budget of $50-100/month. The solution must work on phones and computers for 15 employees.

---

## Business Context

### Current Situation
- **Business:** Local bakery with 15 employees
- **Volume:** 8-20 custom orders/day + 40-100 walk-in customers/day
- **Current Tools:** Phone orders → notebook tracking → Excel accounting
- **Owner Tech Comfort:** 6-7/10 (can use smartphone, no coding knowledge)
- **Budget:** $50-100/month acceptable, $500/month = deal-breaker

### Core Problems (Business Outcomes)
1. **Lost Orders:** Manual notebook tracking causes forgotten orders and angry customers
2. **Customer Status Calls:** Sarah constantly interrupted with "Is my order ready?" calls (80% reduction target)
3. **No Profitability Visibility:** Sarah doesn't know weekly/daily revenue until end-of-week Excel session
4. **Losing Customers:** No online ordering option → customers go to competitors
5. **After-Hours Orders:** Bakery can't capture orders when closed (11 PM cake emergency orders)
6. **Time Drain:** Sarah spends time on admin instead of baking (her passion)

---

## Business Outcomes (Success Criteria)

### Primary Outcomes
1. **Zero Lost Orders** - System captures 100% of orders automatically (no notebook)
2. **80% Reduction in Status Calls** - Customers self-serve order status online
3. **Real-Time Profitability** - Sarah can check daily/weekly revenue on her phone anytime
4. **24/7 Order Placement** - Customers can place orders when bakery is closed
5. **Time Savings for Sarah** - Free up 10-15 hours/week for baking

### Secondary Outcomes
6. **Employee Visibility** - All 15 employees can see order list for their role
7. **Professional Image** - Modern online presence attracts younger customers
8. **Data-Driven Decisions** - Know which products are popular, customer trends

---

## Solution Approach

### Recommended Strategy: Hybrid (Quick Win + Long-Term)

**Phase 1 (Immediate - 2 weeks):** Start with **Square for Retail** ($29-50/month)
- **Why:** Fits budget, owner likely familiar with Square, immediate value
- **What:** Basic POS + simple online ordering + customer database
- **Limitations:** Not bakery-specific, limited custom order workflows

**Phase 2 (3-6 months later):** Evaluate custom solution if needed
- **Why:** Operational data from Phase 1 informs better custom requirements
- **What:** Next.js + Supabase custom app tailored to bakery workflows
- **Cost:** $15K-35K one-time development, $40-80/month hosting

**Justification:** This minimizes upfront investment risk while providing immediate ROI. If Square meets 80% of needs, custom development may not be necessary.

---

## Functional Requirements

### Must-Have Features (MVP)

#### 1. Custom Order Intake
- Capture customer details (name, phone, email)
- Order specifications (size, flavor, icing, message, dietary notes, decorations)
- Pickup/delivery date and time
- Price quote and deposit collection
- Photo upload (Pinterest inspiration)

#### 2. Order Dashboard
- View all orders organized by pickup time
- Filter by date, status (pending/in-progress/ready/completed)
- Search by customer name or order number
- Visual indicators for urgent orders (pickup today/tomorrow)

#### 3. Customer Self-Service Portal
- Unique order tracking link sent via SMS/email
- Check order status without calling bakery
- View order details and pickup time

#### 4. Walk-In POS Integration
- Quick checkout for counter customers
- Inventory sync between custom orders and walk-ins
- Receipt printing

#### 5. Real-Time Revenue Dashboard
- Daily/weekly/monthly sales totals
- Revenue by product type (custom cakes vs pastries)
- Outstanding deposits vs final payments
- Accessible on Sarah's phone

#### 6. Staff Access Control
- Role-based permissions (counter staff vs bakers vs Sarah)
- Bakers see production queue only
- Counter staff see customer-facing details
- Sarah sees everything + financials

#### 7. Notifications
- SMS/email order confirmations to customers
- SMS when order is ready for pickup
- Daily summary for Sarah (morning order list)

### Nice-to-Have Features (Future)
- Inventory tracking (flour, sugar, butter stock levels)
- Customer loyalty program (10th cake free)
- Delivery routing optimization
- QuickBooks/Xero integration
- Marketing campaigns (birthday reminders)

---

## Technical Specifications

### Recommended Tech Stack (Phase 2 Custom Solution)

| Component | Technology | Rationale | Cost |
|-----------|-----------|-----------|------|
| Frontend | Next.js 15 + Tailwind CSS | Modern, fast, great mobile UX | Included in dev cost |
| Backend | Supabase (PostgreSQL) | Backend-as-a-service, no custom backend code needed | $25/month (Pro plan) |
| Auth | Supabase Auth | Built-in, secure, easy setup | Included |
| Database | PostgreSQL (via Supabase) | Robust, scalable, open-source | Included |
| Hosting | Vercel | Optimized for Next.js, 1TB bandwidth | $20/month (Pro plan) |
| Payments | Square or Stripe | Square: familiar to owner, Stripe: better developer experience | 2.6-2.9% + 10¢ per transaction |
| SMS | Twilio | Industry standard, pay-per-SMS | ~$0.01/SMS (~$20-50/month) |
| Email | Resend or SendGrid | Reliable, free tier available | $0-20/month |

**Total Monthly Cost (Phase 2):** $40-80/month + transaction fees

### Evidence-Based Justification
- Next.js + Supabase is the "golden standard" for 2026 small business apps ([Source](https://writerdock.in/blog/the-ultimate-guide-to-the-best-tech-stack-for-saas-in-2026))
- Supabase saves 40-50% development time vs custom backend ([Source](https://blog.logrocket.com/build-full-stack-app-next-js-supabase/))
- Vercel Pro provides 1TB bandwidth supporting 1M+ users for $20/month ([Source](https://vercel.com/pricing))

---

## User Stories

### Sarah (Owner)
1. As Sarah, I want to see all today's orders on my phone when I wake up, so I know what to bake
2. As Sarah, I want to check weekly revenue in 10 seconds, so I know if we're profitable
3. As Sarah, I want to stop answering "Is my order ready?" calls, so I can focus on baking
4. As Sarah, I want to capture orders at 11 PM, so I don't lose late-night customers

### Customer
5. As a customer, I want to place an order online, so I don't have to call during business hours
6. As a customer, I want to check my order status online, so I don't have to call the bakery
7. As a customer, I want to upload a Pinterest photo, so the baker knows what design I want

### Counter Staff
8. As counter staff, I want to enter orders directly into the system, so nothing gets lost in the notebook
9. As counter staff, I want to collect deposits automatically, so I don't make math errors

### Baker
10. As a baker, I want to see today's production list, so I know what to bake first

---

## Non-Functional Requirements

### Usability
- **Owner can navigate 90% of features without training** (must be intuitive)
- **Order intake form completable in < 2 minutes**
- **Mobile-first design** (Sarah primarily uses phone)

### Performance
- **Page load time < 2 seconds** on 4G connection
- **Dashboard updates in real-time** (no refresh needed)

### Security
- **Customer data encrypted at rest and in transit**
- **PCI DSS compliant payment processing**
- **Role-based access control** (staff can't see financials)

### Reliability
- **99.5% uptime** (3.6 hours downtime/month acceptable)
- **Data backup daily** (if one order is lost, that's a problem)

### Accessibility
- **WCAG 2.1 AA compliance** (for customers with disabilities)
- **Works on phones from 2020+** (not everyone has latest iPhone)

---

## Out of Scope (Explicitly NOT Included)

- ❌ Recipe management system
- ❌ Employee scheduling software (use existing tools)
- ❌ Payroll integration
- ❌ Ingredient supplier ordering
- ❌ Marketing automation (future phase)
- ❌ Multi-location support (single bakery only)
- ❌ Franchise management

---

## Success Metrics (How We'll Measure Success)

| Metric | Baseline (Now) | Target (6 Months) | Measurement Method |
|--------|---------------|-------------------|-------------------|
| Lost Orders | ~2-3/week (estimated) | 0/week | Track reported issues |
| Customer Status Calls | ~30-40/day (estimated) | <6-8/day (80% reduction) | Call log count |
| Time to Check Revenue | ~1 hour (end of week Excel) | <10 seconds | User observation |
| After-Hours Orders Captured | 0 | 5-10/week | System logs |
| Sarah's Admin Time | ~15 hours/week | <5 hours/week | Time tracking |
| Customer Satisfaction | Unknown | NPS score >40 | Post-order survey |

---

## Implementation Timeline (Phase 2 - Custom Solution)

### MVP Timeline: 8-12 Weeks

**Week 1-2:** Requirements Gathering & Design
- Detailed workflow mapping with Sarah and staff
- UI/UX design mockups for approval
- Database schema design

**Week 3-6:** Core Development
- Order intake form
- Customer database
- Order dashboard
- Basic POS integration

**Week 7-8:** Integrations
- Square/Stripe payment processing
- Twilio SMS notifications
- Email confirmations

**Week 9-10:** Staff Features
- Role-based access
- Production dashboard for bakers
- Staff training

**Week 11-12:** Testing & Deployment
- User acceptance testing with Sarah and staff
- Bug fixes
- Production deployment
- Go-live support

### Phase 1 Timeline: 2 Weeks (Square Setup)
- Week 1: Square account setup, configure products, staff training
- Week 2: Soft launch, collect feedback, optimize

---

## Budget & Cost Estimate

### Phase 1 (Square) - Immediate
- **Setup Cost:** $0
- **Monthly Cost:** $29-50/month (Square plan)
- **Transaction Fees:** 2.6% + 10¢ per transaction
- **Total Investment:** <$100/month (fits budget perfectly)

### Phase 2 (Custom) - If Needed (3-6 Months Later)
- **Development Cost:** $15,000-$35,000 (one-time)
  - Low end: Eastern Europe/Latin America developers at $50/hour × 300 hours
  - High end: North America developers at $100/hour × 350 hours
  - Using Supabase saves $5K-10K vs custom backend
- **Ongoing Hosting:** $40-80/month
- **Transaction Fees:** 2.6-2.9% + 10¢ per transaction

### ROI Calculation
**Sarah's Time Savings:**
- Current: 15 hours/week on admin × $25/hour opportunity cost = $375/week = $1,500/month
- Target: 5 hours/week = $500/month
- **Savings: $1,000/month**

**Recovered Lost Orders:**
- Current: ~2-3 lost orders/week × $50 average order = $100-150/week = $400-600/month lost revenue
- Target: 0 lost orders
- **Recovered Revenue: $400-600/month**

**Total Monthly Benefit: $1,400-1,600/month**

**Payback Period (Phase 2):**
- $25,000 development cost ÷ $1,400 monthly benefit = **18 months**
- Plus ongoing $40-80/month hosting (already budgeted)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Sarah finds system too complex | Medium | High | Extensive training, simple UI design, ongoing support |
| Staff resist change | Medium | Medium | Involve staff in design, show benefits, gradual rollout |
| Development over budget | Medium | High | Fixed-price contract, milestone-based payments, use Supabase to reduce costs |
| Internet outage breaks system | Low | High | Offline mode for order intake, daily backups |
| Custom solution is overkill | Medium | High | Start with Square (Phase 1) to validate need first |
| Square doesn't meet needs | Medium | Medium | Evaluate after 3 months, move to Phase 2 if needed |

---

## Decision Rationale (Evidence-Based)

### Why Hybrid Approach?
- **Evidence:** 78.2% of mobile app companies charge $5K-$50K for MVPs ([Source](https://www.goodfirms.co/resources/custom-software-development-cost-survey))
- **Risk Mitigation:** Starting with Square ($29-50/month) validates needs before $15K-35K investment
- **Precedent:** BakeSmart ($99/month), Toast POS ($69/month), Craftybase ($24/month) show SaaS solutions exist but none perfectly fit budget + needs

### Why Next.js + Supabase (Phase 2)?
- **Evidence:** "Golden standard" for 2026 small business apps ([Source](https://writerdock.in/blog/the-ultimate-guide-to-the-best-tech-stack-for-saas-in-2026))
- **Cost Efficiency:** Supabase reduces backend development by 40-50% ([Source](https://hackceleration.com/supabase-review/))
- **Maintenance:** Backend-as-a-service requires no DevOps expertise
- **Hiring:** Next.js/React developers abundant in 2026

### Why Not Existing SaaS?
- **BakeSmart ($99/month):** Above budget, more features than needed
- **Toast POS ($69/month):** Requires hardware investment, POS-focused vs custom orders
- **Craftybase ($24/month):** Inventory-focused, weak on customer-facing features
- **None perfectly match:** Small bakery + custom orders + budget + tech comfort level

---

## Appendix: Research Sources

1. [Bakery Management Software Guide 2026](https://www.joinhomebase.com/blog/bakery-management-software)
2. [BakeSmart](https://bakesmart.com/)
3. [Toast POS for Cafe & Bakery](https://pos.toasttab.com/restaurant-pos/cafe-bakery)
4. [Craftybase Bakery Management](https://craftybase.com/bakery-management-software)
5. [MVP Development Guide 2026](https://www.ksofttechnologies.com/blogs/mvp-development-services-timeline-features-process-2026-guide)
6. [Custom Software Cost Survey](https://www.goodfirms.co/resources/custom-software-development-cost-survey)
7. [Ultimate Tech Stack for SaaS 2026](https://writerdock.in/blog/the-ultimate-guide-to-the-best-tech-stack-for-saas-in-2026)
8. [Supabase Review](https://hackceleration.com/supabase-review/)
9. [Next.js + Supabase Tutorial](https://blog.logrocket.com/build-full-stack-app-next-js-supabase/)
10. [Vercel Pricing](https://vercel.com/pricing)
11. [Twilio Pricing](https://www.twilio.com/en-us/pricing/messaging)
12. [Best Payment APIs 2026](https://blog.postman.com/best-payment-apis-for-developers/)

---

**Status:** Draft - Awaiting Sarah's Approval
**Next Steps:** Present to Sarah, gather feedback, proceed to Phase 1 or Phase 2 based on her decision
