# Operational Runbook: Data Protection Compliance & Citizen Takedowns
## Republic of Ghana — Data Protection Act, 2012 (Act 843)

---

## 1. Automated Privacy Filter Audit

### Daily Verification Checklist:
- [ ] Confirm all bystander faces in public feeds have active Gaussian blur ($51\times51$ kernel).
- [ ] Confirm all civilian vehicle license plates are masked.
- [ ] Verify that zero cases categorized under `DOMESTIC_ABUSE`, `CHILD_ABUSE`, or `UNVERIFIED_ACCUSATION` are accessible on the public web API.

---

## 2. Handling Citizen Takedown Appeals (Sections 32–43)

1. **SLA Requirement:** All statutory citizen appeals submitted via the public portal must be acknowledged within **4 hours** and resolved within **24 hours**.
2. **Review Procedure:**
   - The Data Protection Officer (DPO) and Legal Officer review the appeal payload.
   - If the claim involves mistaken identity or private rights infringement, click **"Grant Takedown & Purge from Public Cache"** in the Moderator Console.
   - System unpublishes the item immediately, flushes edge CDN cache, and sends an SMS confirmation to the applicant.
