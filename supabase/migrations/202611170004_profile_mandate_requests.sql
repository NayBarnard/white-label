alter table public.client_portal_requests
  drop constraint if exists client_portal_requests_request_type_check;

alter table public.client_portal_requests
  add constraint client_portal_requests_request_type_check
  check (
    request_type in (
      'Lump Sum Top-Up',
      'Strategy Switch',
      'Debit Order Update',
      'Withdrawal',
      'Portfolio Review',
      'Personal Data Deletion',
      'Contact Details Update',
      'Banking Details Change'
    )
  );
