import { mount } from "./ui";
import { setRenderer } from "./screen-kit";
import { renderCadets, renderTraining } from "./screen-people";
import { renderFlights } from "./screen-flights";
import {
  renderApprovals,
  renderAudit,
  renderDashboard,
  renderDocuments,
  renderFinance,
  renderFleet,
  renderFuel,
  renderMaintenance,
  renderPortal,
  renderPortalNotes,
  renderPortalProfile,
  renderPortalSchedule,
  renderPortalTraining,
  renderReports,
  renderSettings,
  renderStaff,
  renderUsers
} from "./screen-ops";

const pages = {
  dashboard: renderDashboard,
  cadets: renderCadets,
  training: renderTraining,
  operations: renderFlights,
  fleet: renderFleet,
  maintenance: renderMaintenance,
  fuel: renderFuel,
  finance: renderFinance,
  staff: renderStaff,
  documents: renderDocuments,
  approvals: renderApprovals,
  reports: renderReports,
  settings: renderSettings,
  users: renderUsers,
  audit: renderAudit,
  portal: renderPortal,
  "portal-schedule": renderPortalSchedule,
  "portal-training": renderPortalTraining,
  "portal-notifications": renderPortalNotes,
  "portal-profile": renderPortalProfile
};

setRenderer((state) => {
  const render = pages[document.body.dataset.page];
  if (render) {
    render(state);
    return;
  }
  mount(`<section class="card"><div class="card-body"><p>This screen is not part of the demo workspace.</p></div></section>`);
});
