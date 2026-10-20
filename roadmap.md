# Delivery exception platform

- [x] Add typed customer access, complaint services, mock data and rule tests.
- [x] Build dedicated customer support portal and post-delivery complaints.
- [x] Add operations complaint review, activity history and customer portal entry points.
- [x] Remove fake sign-in and polish navigation across desktop/mobile.
- [x] Verify customer-to-staff flows, existing tests and page metadata.
- [x] Add standalone no-login customer complaint app at /customer/complaint.
- [x] Remove customer address change requests and package tracking; customer experience is complaints-only.
- [x] Replace manual incident date/time with an automatic submission timestamp and verify the confirmation.
- [x] Show the report timestamp as 12-hour AM/PM with no timezone suffix.
- [x] Add customer account forms and managed phone/password integration before standalone order reporting, with owner-only saved profiles.
- [ ] Activate phone authentication and SMS verification in hosted Phone settings (requires user setup).
- [x] Remove the failing account-settings preflight and verify account request handling (real registration now returns the disabled-phone-provider response).
- [x] Show Log In first with Sign Up below; test session-bearing signup/login and sessionless phone-verification outcomes leading to reporting. Live signed-in verification remains blocked below.
- [ ] Verify account creation, saved profiles, sign-in, sign-out and signed-in complaint flow after phone activation; form validation and signed-out gating already verified.
