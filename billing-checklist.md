# Billing User Flow Checklist

- [ ] 1. While authenticated, navigate to Billing / Subscription page.
- [ ] 2. Confirm current plan and billing cycle are displayed.
- [ ] 3. Select a new plan (trial or paid) from available options.
- [ ] 4. Confirm plan details (price, features, proration) before proceeding.
- [ ] 5. Click "Upgrade" or "Subscribe".
- [ ] 6. Enter payment details (card number, expiry, CVC) if required.
- [ ] 7. Confirm billing address if applicable.
- [ ] 8. Submit payment form.
- [ ] 9. Confirm success: redirect to confirmation/invoice or display success banner.
- [ ] 10. Verify the subscription status updates to active/renewing.
- [ ] 11. Check that access-level/entitlements update appropriately (if applicable).
- [ ] 12. View/download invoice/receipt and confirm amounts and plan details.
- [ ] 13. Optionally test downgrade/cancellation flow and confirm relevant UI and messaging.
- [ ] 14. Confirm saved payment methods list (if storing cards) and ability to update/remove.
- [ ] 15. Edge cases: declined card shows clear error; retry flow works; validation prevents empty submissions.

Acceptance criteria: A user can select a plan, submit payment, see confirmation/invoice, and have their subscription status reflect the change.