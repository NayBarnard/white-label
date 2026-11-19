# Website admin guide

Use an individual administrator account. Do not share passwords or include
client passwords, identity numbers, or bank details in support messages.

## Staff access and administrator role

Advisers and administrators use the same **Staff sign-in** page at
`https://staff.placeholder-am.co.za/advisor/login` (use the firm's approved staff
hostname). Adviser accounts land in `/advisor`; administrator accounts land
in `/admin`. Client accounts are not accepted by staff sign-in and should
continue using the public client portal.

An authorised Supabase project operator must assign the administrator role
manually in the user's **app_metadata**, setting `role` to exactly `admin`.
Never assign this role through editable user metadata or a browser-facing
workflow. Adviser access uses the `adviser` app-metadata role. Review role
assignments with the firm's access-control process, and enable multi-factor
authentication (MFA) for every administrator account.

## Monthly routine

1. **Upload approved fact sheets.** Replace the relevant real PDF in
   `public/documents/` with the firm's approved, current version and publish
   the change through the normal code review and deployment process. Check the
   resource page afterward. A generated request copy is not an official policy
   or fact sheet.
2. **Update published strategy information.** Compliance or the investment
   team should verify each value and its source date before updating the
   relevant strategy in `src/data/firmData.ts`. Use `fundFacts` for minimums,
   costs, allocation, holdings, identifiers, and management-company details.
   Keep unknown information blank.
3. **Update client valuations and performance.** In `/admin`, select the
   client and create or update the portfolio assignment. Enter the approved
   valuation, valuation date, reported performance, and performance period.
   Leave any unconfirmed value empty. This action changes a client's account
   record; it does not update the public NAV history.
4. **Check the NAV chart.** Review the public portfolio comparison and confirm
   that its observations, benchmark, source, and as-at dates are current and
   approved. The chart data is maintained in the `fund_metrics` source using
   the controlled fund-data import process. Do not replace missing data with
   estimates. If there are no observations, the chart displays
   “Chart data will appear here soon.”
5. **Publish a manager update, if enabled.** Open `/admin/manager-updates`.
   Save the text, audio, or video update as a draft. Have the required
   compliance reviewer check it, tick **Compliance approved**, then publish.
   Check the portal display and the standard past-performance disclaimer.
6. **Review setup and privacy.** Open `/admin/setup` and resolve new missing
   items. Confirm staff access, email delivery, private document storage, and
   request handling remain operational.

## Maintain platform availability and fund codes

The matrix intentionally starts empty. Before entering records, obtain the
firm's verified platform/share-class spreadsheet and confirm the named owner
responsible for quarterly re-verification. Do not infer platform relationships,
availability, JSE codes, ISINs, or platform codes.

1. Open `/admin/platforms` and add the supplied platform names.
2. Add each supplied fund share class and its JSE code/ISIN. Check every
   identifier against the source document; the form warns and requires explicit
   confirmation when an ISIN check digit fails.
3. For each share-class/platform cell, choose **Verified available**,
   **Verified not available**, or **Not verified**. A verified status requires
   a source, the verifier's name, and a verification date. Attach a source URL
   when available. Choose **Not verified** when the evidence does not establish
   availability; never represent it as unavailable.
4. Review the per-cell history after changes. Deactivate a platform or share
   class when it should no longer appear; do not hard-delete records.
5. Review the **Re-verification queue** at least quarterly. Entries older than
   180 days are flagged **Re-verify**. Record the new evidence, verifier, and
   date when rechecking an entry.
6. Advisers can search the read-only **Platform Matrix** at
   `/advisor/platforms`. It is restricted to adviser/admin roles and is not
   public, sitemap, or chatbot content.

The adviser matrix displays this disclaimer: “Information for authorised
financial advisers. Always confirm codes and availability with the platform
before placing a transaction.”

## Add a client and assign a portfolio

The `/admin` screen does not create a sign-in account. An authorized staff
member must create or invite the person through the firm's trusted account
onboarding process and confirm the email address. Never create a shared account
or send a password.

After the client account exists:

1. Open `/admin` and refresh the client list.
2. In **Assign a portfolio**, choose the client.
3. Choose an existing assignment to update, or leave that field blank to make a
   new assignment.
4. Enter the approved portfolio label. Add valuation, date, and performance
   details only when they are confirmed.
5. Save and check that the assignment appears under the client's account.
6. Upload official account documents using **Upload a client document**. Check
   the title, document type, issue date, client, and PDF before uploading.
   Documents are stored privately for that client.

## Reply to clients and update requests

- Read messages in **Support messages** on `/admin`. Select the client, write a
  reply, and send it. Keep sensitive personal or banking information out of
  the message.
- Review **Client requests** on `/admin`. Select the appropriate status and
  save it. A status change records progress; it does not make the requested
  investment or personal-data change.
- Profile and banking-detail requests require staff verification with the
  client by phone before anything is changed. Follow the firm's verification
  process and update source records only through the firm's approved workflow.
- For a portfolio review request, contact the client to confirm the proposed
  appointment. Do not treat the requested time as a confirmed booking.
- If a request cannot be completed, contact the client using an approved
  channel and record the status accurately.

## Reset a client's access

Ask the client to use **Set or reset password by email** on the portal sign-in
page. The reset link is sent to the address on the account. If it does not
arrive, check the configured Auth email delivery and the account's verified
email address. An authorized administrator may resend an invitation using the
firm's trusted account-management process. Never set or send a temporary
password, and do not ask the client to share their reset link.

## Adviser relationships and reviews

- Create or remove an adviser-client relationship only through a trusted
  administrative process. Never create relationship rows from browser code.
- An adviser may open `/advisor/clients` and see only active relationships.
  An unassigned client profile API call must fail closed.
- Use the client profile's private notes and tasks for adviser-only workflow.
  Never place sensitive client advice or identity numbers in a shared/internal
  note field unless the firm's approved process permits it.
- Schedule reviews only from the client profile. Use the resulting review date
  and status; do not present a scheduled request as a completed meeting.
