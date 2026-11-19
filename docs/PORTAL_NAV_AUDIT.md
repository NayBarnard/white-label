# Portal navigation audit

Scope: `/portal`, `/advisor`, `/admin`, and `/studio`, including their shared
header, footer, and conditional floating controls. Width findings below are
from the current layout rules and component structure; authenticated browser
screenshots were not available for this static audit.

The findings table records the pre-Task-2 baseline.

## Elements found

| Route | Element and source | 360 px | 768 px | 1440 px | Overlap / failure |
| --- | --- | --- | --- | --- | --- |
| All four routes | Sticky site header, `Navbar.tsx` (`top-0`, `z-40`). Workspace routes show Home, theme, and account/sign-out controls rather than portal sections. | Fits; no section menu. | Fits; no section menu. | Fits; no section menu. | Sticky positioning reserves its height, so it does not cover the page. It does not let users move between portal sections. |
| `/portal` (signed in) | Client section tab strip in `AuthenticatedClientPortal.tsx` (`w-screen`, `overflow-x-auto`). It has Overview, Holdings & Simulator, Document Vault, Requests & Adviser, optional feature tabs, and disabled Soon tabs. | Horizontal scrolling is required; later sections are off-screen until scrolled. | Horizontal scrolling is still required for the full set of tabs. | The strip can display the set on one row, but remains a viewport-wide scrolling strip rather than a portal menu. | The strip itself is viewport-wide and does not create page-width overflow. Tab reachability depends on discovering horizontal scrolling. |
| `/portal` and signed-out `/portal/dashboard` | `ConditionalTabBar.tsx` renders a fixed floating island via `IOSKit.tsx`. Signed out it includes Home, Funds, Insights and chat; signed in it renders only the standalone chat launcher. | The island spans the lower viewport; it overlays the page edge and consumes bottom space. | Same bottom overlay and reserved body padding. | Fixed chat pill at bottom-right. | The chat panel opens above the fixed launcher and covers page content at all widths. |
| `/advisor` | Adviser section navigation in `AdvisorPortalContent.tsx` (`overflow-x-auto`): Dashboard, Fund Centre, LISP Availability, Document Centre, Investment Tools, Client Management, Advisor Resources. | Horizontal scrolling is needed; sections beyond the visible links are easy to miss. | It may fit with compressed/wrapped labels; the overflow container remains and can scroll if its contents exceed the row. | The links fit in the content width. | No fixed overlap from this row. Its small, in-page scroll affordance reduces section discoverability on narrow screens. |
| `/advisor` | Fixed standalone chat launcher and chat panel from `ConditionalTabBar.tsx` / `FloatingChatbot.tsx`. | Button at bottom-right; panel is nearly viewport width. | Button and panel remain fixed at bottom-right. | Button and panel remain fixed at bottom-right. | Panel overlays page content when open; launcher covers the lower-right corner when closed. |
| `/admin` | Shared workspace header and fixed standalone chat launcher. Admin pages have no shared section navigation menu. | Header controls fit; no menu for navigating admin sections. | Same. | Same. | Chat has the same bottom-right overlap as `/advisor`. Admin sections are not reachable through a portal menu. |
| `/studio` | `TabBar` remains fixed but switches to chat-only; `HomePageStudio.tsx` renders a full-screen fixed editor (`inset-0`, `z-[200]`). | Editor covers the floating island and site header. Its own Home/Sign out controls are in the editor toolbar. | Same. | Same. | The editor intentionally covers the site chrome; the lower chat control is behind the editor. The toolbar/Puck editor is the studio's own navigation surface. |

## Other requested controls

- The install control is a normal control in the public footer (`Footer.tsx` /
  `InstallAppControl.tsx`), not a floating or fixed portal navigation element.
  Workspace routes render the compact workspace footer instead.
- No scroll-to-top or back-to-top navigation control was found in the four
  route trees or their shared portal components.
- Fixed dialogs in the client portal and studio are modal content, not
  navigation.

## Interactive experience files identified from Git history

The history contains the commit `ed10b02 Add protected Puck homepage studio`.
The studio experience is implemented by `src/app/studio/page.tsx`,
`src/components/home/HomePageStudio.tsx`, and
`src/components/home/HomePageEditorConfig.tsx`, with `supabase/puck-studio.sql`
supporting persistence. The current commit history also tracks `FundComparison`
and `src/app/page.tsx` as the interactive public fund-comparison experience;
the homepage mounts it through `DeferredFundComparison.tsx`. No available
history entry indicates that either candidate was removed. Task 5 verified
both experiences and added a browser input-response check to the fund chart.

## Task 2 resolution

- Authenticated client, adviser, and admin routes now use one role-aware header
  menu. Its section links precede assistant, install, theme, account, and sign
  out controls.
- The client tab strip and adviser horizontal section row were removed. The
  admin menu covers the admin sections and links to the manager-update, setup,
  and platform pages.
- Portal routes no longer show a floating chat launcher. The assistant opens
  from the menu and retains an in-panel close control.
- The existing `Sheet` provides the full-height mobile menu, focus trapping,
  Escape handling, focus restoration, safe-area padding, and background scroll
  locking. Desktop uses a dropdown.
- Playwright viewport checks passed for `/`, `/portal/dashboard`,
  `/advisor/login`, and the signed-out `/admin` redirect at 360, 768, and
  1440 px. Authenticated browser screenshots were unavailable; role-specific
  menus are covered by Vitest.
