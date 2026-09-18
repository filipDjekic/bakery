# Sentry production verification

Run this only after the production deployment has the final release and source
maps. Do not introduce a public permanent error endpoint.

1. Record the deployment commit SHA and expected Sentry release/environment.
2. From an authenticated, controlled admin operation in a maintenance window,
   temporarily trigger a harmless exception before any database mutation, then
   immediately remove/revert the trigger.
3. Confirm one event arrives with `environment=production`, matching release,
   route/event tags and request ID.
4. Confirm the stack resolves to application source through uploaded source
   maps.
5. Inspect event request/user/context fields: no phone, email, customer note,
   cookie, authorization header, token or raw IP may be present.
6. Confirm the customer flow and server continue if Sentry is unreachable.

Record the Sentry event ID, release, operator and timestamp. Do not copy event
payloads containing customer data into this repository. Delete the temporary
trigger and redeploy before marking this check complete.
