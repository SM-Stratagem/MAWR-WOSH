# Settings User Flow Checklist

- [ ] 1. While authenticated, navigate to Settings / Account page.
- [ ] 2. Confirm "Profile" section is visible with current name/email/username.
- [ ] 3. Edit name field and save.
- [ ] 4. Confirm the update reflects on the profile/display name in the UI (e.g., dashboard, nav).
- [ ] 5. Edit username/other profile fields and save; confirm updates.
- [ ] 6. Navigate to "Security" or "Password" section.
- [ ] 7. Change password: enter current password, new password, confirm new password.
- [ ] 8. Save password change.
- [ ] 9. Confirm success message and ability to log in with new password.
- [ ] 10. Navigate to "Notifications" or "Preferences" section.
- [ ] 11. Toggle email/push notifications on or off as appropriate.
- [ ] 12. Save notification preferences.
- [ ] 13. Confirm settings persistence: reload the settings page and verify values.
- [ ] 14. Confirm edit input validation (e.g., invalid email, weak password) shows helpful errors.
- [ ] 15. Confirm any destructive actions (e.g., deactivate account) have confirmation prompts.

Acceptance criteria: Users can review and update profile, change password, and manage notification settings with clear success/error messaging and persisted changes.