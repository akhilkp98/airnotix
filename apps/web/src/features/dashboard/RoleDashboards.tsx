import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import {
  AlertTriangle,
  CirclePause,
  Clock,
  FileText,
  GraduationCap,
  Plane,
  Shield,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { EmptyState } from '../../components/data/EmptyState';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate, inr } from '../../domain/calculations';
import { DEMO_TODAY } from '../../domain/fixtures';
import { tokens } from '../../theme/tokens';
import { qualificationBeforeDemoDay } from '../staff/staffRules';
import { useAuth } from '../auth/AuthProvider';
import { PendingApprovals } from './PendingApprovals';
import {
  useAcademyDashboard,
  useCfiDashboard,
  useFinanceDashboard,
  useHrDashboard,
  useInstructorDashboard,
  useMaintenanceDashboard,
  useOperationsDashboard,
  useSuperAdminDashboard,
} from './dashboardQueries';
import { countLabels, notificationPath, statusBreakdown, unreadNotifications } from './dashboardRules';
import {
  AmountBars,
  DashboardColumns,
  DashboardHeader,
  DashboardSection,
  EmptyLine,
  FlightList,
  MetricGrid,
  MetricTile,
  ProgressList,
  ScheduleBoard,
  ShareBars,
} from './dashboardWidgets';

function loading(label: string) {
  return <CircularProgress aria-label={label} sx={{ color: 'primary.main' }} />;
}

function failed(title: string, refetch: () => void) {
  return (
    <EmptyState
      title={title}
      body="The workspace records could not be read. You can try again."
      action={<Button variant="contained" color="accent" onClick={refetch}>Try again</Button>}
    />
  );
}

function place(academy?: { name: string; branchName: string }) {
  const day = formatDate(DEMO_TODAY);
  if (!academy) return `Demo day ${day}`;
  return `${academy.name} · ${academy.branchName} · ${day}`;
}

function NotificationList({ notes }: { notes: { id: string; title: string; body: string; href: string; read: boolean }[] }) {
  const { can } = useAuth();
  const unread = unreadNotifications(notes);
  if (unread.length === 0) return <EmptyLine>No unread notifications for this role.</EmptyLine>;
  return (
    <Box>
      {unread.map((note) => {
        const path = notificationPath(note.href, can);
        return (
          <Box key={note.id} sx={{ py: 1, borderTop: `1px solid ${tokens.line}`, '&:first-of-type': { borderTop: 0 } }}>
            <Typography sx={{ fontWeight: 600 }}>{note.title}</Typography>
            <Typography variant="body2" color="text.secondary">{note.body}</Typography>
            {path ? <RouterLink to={path}>Open</RouterLink> : null}
          </Box>
        );
      })}
    </Box>
  );
}

export function SuperAdminDashboard() {
  const query = useSuperAdminDashboard();
  if (query.isLoading) return loading('Loading administration dashboard');
  if (query.isError || !query.data) return failed('The administration dashboard did not load', () => { void query.refetch(); });
  const { users, roles, audit, academy, notifications } = query.data;
  const rolesInUse = roles.filter((role) => role.count > 0).length;
  return (
    <>
      <DashboardHeader
        title="Administration dashboard"
        subtitle="Demonstration accounts and stored audit events for this workspace."
        context={place(academy)}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          { label: 'Users & Roles', to: '/users', primary: true },
          { label: 'Academy Settings', to: '/settings' },
          { label: 'Audit Log', to: '/audit' },
          { label: 'Reports', to: '/reports' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Demonstration accounts" value={String(users.length)} hint="Sign-in rows in this workspace. Not a production user directory." icon={Users} tone="navy" to="/users" />
        <MetricTile label="Roles in use" value={String(rolesInUse)} hint="Roles that have at least one demonstration account." icon={Shield} tone="sky" to="/users" />
        <MetricTile label="Recent audit events" value={String(audit.length)} hint="Newest stored events. Not a tamper-proof log." icon={FileText} tone="teal" to="/audit" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Accounts by role" hint="Counts of demonstration accounts. Adding an account does not provision access outside this browser.">
          <ShareBars items={roles.map((role) => ({ label: role.label, count: role.count, href: '/users' }))} />
        </DashboardSection>
        <DashboardSection title="Recent audit events" hint="The same events as the audit log. They are not a regulatory record.">
          <ShareBars items={countLabels(audit.map((event) => event.action)).map((item) => ({ ...item, href: '/audit' }))} />
          <Box sx={{ mt: 1.5 }}>
            {audit.length === 0 ? <EmptyLine>No audit events are stored.</EmptyLine> : audit.map((event) => (
              <Box key={event.id} sx={{ py: 0.9, borderTop: `1px solid ${tokens.line}` }}>
                <Typography sx={{ fontWeight: 600 }}>{event.summary}</Typography>
                <Typography variant="body2" color="text.secondary">{`${event.actor} · ${formatDate(event.at)} · ${event.action}`}</Typography>
              </Box>
            ))}
          </Box>
        </DashboardSection>
        <DashboardSection title="Notifications" wide>
          <NotificationList notes={notifications} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

export function AcademyDashboard() {
  const query = useAcademyDashboard();
  if (query.isLoading) return loading('Loading academy dashboard');
  if (query.isError || !query.data) return failed('The academy dashboard did not load', () => { void query.refetch(); });
  const data = query.data;
  const aircraftStatus = [
    { label: 'Available', count: data.availableAircraft, href: '/fleet?status=Available' },
    ...statusBreakdown(data.unavailableAircraft).map((item) => ({ ...item, href: `/fleet?status=${encodeURIComponent(item.label)}` })),
  ];
  return (
    <>
      <DashboardHeader
        title="Academy dashboard"
        subtitle="Academy-wide records for the demo day."
        context={place(data.academy)}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          { label: 'Cadets', to: '/cadets', primary: true },
          { label: 'Flight Operations', to: '/flight-operations' },
          { label: 'Approvals', to: '/approvals' },
          { label: 'Finance', to: '/finance' },
          { label: 'Fleet', to: '/fleet' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Active cadets" value={String(data.activeCadets)} hint="Cadets whose status is Active." icon={Users} tone="teal" to="/cadets?status=Active" />
        <MetricTile label="On hold" value={String(data.onHoldCadets)} hint="Cadets whose status is On Hold." icon={CirclePause} tone="amber" to="/cadets?status=On%20Hold" />
        <MetricTile label="Flights today" value={String(data.flightsToday.length)} hint="Demo day, excluding cancelled flights." icon={Plane} tone="sky" to={`/flight-operations?view=day&date=${DEMO_TODAY}`} />
        <MetricTile label="Aircraft available" value={String(data.availableAircraft)} hint="Planning status Available. Not an airworthiness decision." icon={Plane} tone="lime" to="/fleet?status=Available" />
        <MetricTile label="Aircraft not available" value={String(data.unavailableAircraft.length)} hint="Any planning status other than Available." icon={Wrench} tone="rose" to="/fleet" />
        <MetricTile label="Pending approvals" value={String(data.pending.length)} hint="Flights awaiting approval. Not a flight release." icon={AlertTriangle} tone="amber" to="/approvals" />
        <MetricTile label="Outstanding fees" value={inr(data.finance.outstanding)} hint="Illustrative accounts. Not an accounting ledger." icon={Wallet} tone="navy" to="/finance" />
        <MetricTile label="Overdue accounts" value={String(data.finance.overdueAccounts)} hint="Outstanding balance with a due date before the demo day." icon={Clock} tone="rose" to="/finance" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Today's flights">
          <ScheduleBoard flights={data.flightsToday} aircraftHref />
        </DashboardSection>
        <DashboardSection title="Pending approvals" tone="attention" hint="Approve and reject use the same comment and blocker rules as the flight record.">
          <PendingApprovals flights={data.pending} cadetName={data.cadetName} />
        </DashboardSection>
        <DashboardSection title="Cadet status" hint="Stored cadet status. Not a course-completion decision.">
          <ShareBars items={data.cadetStatus.map((item) => ({ ...item, href: `/cadets?status=${encodeURIComponent(item.label)}` }))} />
        </DashboardSection>
        <DashboardSection title="Aircraft planning status" hint="Planning labels only. Not an airworthiness decision.">
          <ShareBars items={aircraftStatus} />
        </DashboardSection>
        <DashboardSection title="Open defects" hint="A defect record is not a decision that an aircraft is unfit to fly.">
          {data.defects.length === 0 ? <EmptyLine>No open defects.</EmptyLine> : data.defects.map((defect) => (
            <Typography key={defect.id} sx={{ py: 0.5 }}>
              <RouterLink to={`/fleet/${defect.aircraftId}`}>{data.aircraftCode(defect.aircraftId)}</RouterLink>
              {` · ${defect.severity} · ${defect.description}`}
            </Typography>
          ))}
        </DashboardSection>
        <DashboardSection title="Open work orders" hint="Excludes Completed and Release recorded. A release note is not an authorisation to fly.">
          {data.workOrders.length === 0 ? <EmptyLine>No open work orders.</EmptyLine> : data.workOrders.map((order) => (
            <Box key={order.id} sx={{ py: 0.75 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 600 }}>{order.reference}</Typography>
                <StatusChip status={order.status} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                <RouterLink to={`/fleet/${order.aircraftId}`}>{data.aircraftCode(order.aircraftId)}</RouterLink>
                {` · ${data.staffName(order.assigneeId)} · ${order.description}`}
              </Typography>
            </Box>
          ))}
        </DashboardSection>
        <DashboardSection title="Pending documents" hint="Stored review label Pending. Not a regulator check.">
          <DocumentLinks documents={data.pendingDocuments} />
        </DashboardSection>
        <DashboardSection title="Low fuel" tone="attention" hint="Calculated stock below the tank threshold. No unit conversion is applied.">
          <FuelLines tanks={data.lowFuel} />
        </DashboardSection>
        <DashboardSection title="Notifications" wide>
          <NotificationList notes={data.notifications} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

export function OperationsDashboard() {
  const { can } = useAuth();
  const query = useOperationsDashboard();
  if (query.isLoading) return loading('Loading operations dashboard');
  if (query.isError || !query.data) return failed('The operations dashboard did not load', () => { void query.refetch(); });
  const data = query.data;
  const blockers = data.issues.filter((issue) => issue.level === 'blocker');
  const warnings = data.issues.filter((issue) => issue.level === 'warning');
  const aircraftStatus = [
    { label: 'Available', count: data.availableAircraft, href: '/fleet?status=Available' },
    ...statusBreakdown(data.unavailableAircraft).map((item) => ({ ...item, href: `/fleet?status=${encodeURIComponent(item.label)}` })),
  ];
  return (
    <>
      <DashboardHeader
        title="Operations dashboard"
        subtitle="Today’s flying programme. Planning blockers are not a dispatch release."
        context={place(data.academy)}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          ...(can('flights.create') ? [{ label: 'Schedule flight', to: '/flight-operations/new', primary: true }] : []),
          { label: 'Flight Operations', to: '/flight-operations' },
          { label: 'Fleet', to: '/fleet' },
          { label: 'Fuel', to: '/fuel' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Active cadets" value={String(data.activeCadets)} hint="Cadets whose status is Active." icon={Users} tone="teal" to="/cadets?status=Active" />
        <MetricTile label="Flights today" value={String(data.flightsToday.length)} hint="Demo day, excluding cancelled flights." icon={Plane} tone="sky" to={`/flight-operations?view=day&date=${DEMO_TODAY}`} />
        <MetricTile label="Aircraft available" value={String(data.availableAircraft)} hint="Planning status Available. Not an airworthiness decision." icon={Plane} tone="lime" to="/fleet?status=Available" />
        <MetricTile label="Pending approvals" value={String(data.pending.length)} hint="Visible here as read-only. This role cannot approve or reject." icon={AlertTriangle} tone="amber" to="/approvals" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Today's flights">
          <ScheduleBoard flights={data.flightsToday} aircraftHref />
        </DashboardSection>
        <DashboardSection title="Planning blockers" tone="critical" hint="Blockers from draft flights and today's flights. Approval is still refused while a blocker remains. This is not a flight release.">
          <IssueLines issues={blockers} empty="No planning blockers on drafts or today's flights." />
        </DashboardSection>
        <DashboardSection title="Draft flights">
          <FlightList flights={data.drafts} aircraftHref />
        </DashboardSection>
        <DashboardSection title="Planning warnings" tone="attention" hint="Informational only. A qualification date before the flight does not ground anyone.">
          <IssueLines issues={warnings} empty="No planning warnings on drafts or today's flights." />
        </DashboardSection>
        <DashboardSection title="Aircraft not available" hint="Planning status other than Available, with any stored restriction. Not a serviceability decision.">
          <ShareBars items={aircraftStatus} />
          <Box sx={{ mt: 1.5 }}>
            {data.unavailableAircraft.length === 0 ? <EmptyLine>Every aircraft is recorded as Available.</EmptyLine> : data.unavailableAircraft.map((aircraft) => (
              <Box key={aircraft.id} sx={{ py: 0.75 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <RouterLink to={`/fleet/${aircraft.id}`}>{aircraft.code}</RouterLink>
                  <StatusChip status={aircraft.status} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {aircraft.restriction ? `${formatDate(aircraft.restriction.from)}–${formatDate(aircraft.restriction.until)} · ${aircraft.restriction.reason}` : 'No restriction window is stored.'}
                </Typography>
              </Box>
            ))}
          </Box>
        </DashboardSection>
        <DashboardSection title="Pending approvals" hint="Read only. Opening a flight does not grant approval authority.">
          <PendingApprovals flights={data.pending} cadetName={data.cadetName} />
        </DashboardSection>
        <DashboardSection title="Leave blocks" hint="Leave is a stored availability block. It is separate from the staff availability label.">
          <BlockLines blocks={data.leave} staffName={data.staffName} empty="No upcoming leave blocks." />
        </DashboardSection>
        <DashboardSection title="Unavailable blocks" hint="Unavailable is a stored availability block, not the staff availability label.">
          <BlockLines blocks={data.unavailableBlocks} staffName={data.staffName} empty="No upcoming unavailable blocks." />
        </DashboardSection>
        <DashboardSection title="Low fuel" tone="attention" hint="Calculated stock below the tank threshold." wide>
          <FuelLines tanks={data.lowFuel} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

export function CfiDashboard() {
  const query = useCfiDashboard();
  if (query.isLoading) return loading('Loading training dashboard');
  if (query.isError || !query.data) return failed('The training dashboard did not load', () => { void query.refetch(); });
  const data = query.data;
  return (
    <>
      <DashboardHeader
        title="Training dashboard"
        subtitle="Cadet progress and flights awaiting a decision. Progress is illustrative."
        context={place()}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          { label: 'Approvals', to: '/approvals', primary: true },
          { label: 'Training progress', to: '/training/progress' },
          { label: 'Cadets', to: '/cadets' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Active cadets" value={String(data.activeCadets)} hint="Cadets whose status is Active." icon={Users} tone="teal" to="/cadets?status=Active" />
        <MetricTile label="Flights today" value={String(data.flightsToday)} hint="Demo day, excluding cancelled flights." icon={Plane} tone="sky" to={`/flight-operations?view=day&date=${DEMO_TODAY}`} />
        <MetricTile label="Pending approvals" value={String(data.pending.length)} hint="Flights awaiting approval. Not a flight release." icon={AlertTriangle} tone="amber" to="/approvals" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Pending approvals" tone="attention" hint="A comment is required. Approval is refused while a planning blocker remains.">
          <PendingApprovals flights={data.pending} cadetName={data.cadetName} />
        </DashboardSection>
        <DashboardSection title="Illustrative progress" hint="Completed required items against the course count. Not a licence or course certificate.">
          <ProgressList
            empty="No cadets are in this workspace."
            rows={data.progress.map((cadet) => ({
              id: cadet.id,
              href: `/cadets/${cadet.id}`,
              name: cadet.name,
              percent: cadet.progress,
              detail: `${cadet.progress}% · ${cadet.status}`,
            }))}
          />
        </DashboardSection>
        <DashboardSection title="Pending documents" hint="This role can review Pending rows on the document register. The label is not a regulator check.">
          <DocumentLinks documents={data.pendingDocuments} />
        </DashboardSection>
        <DashboardSection title="Upcoming approved flights" hint="Approved flights on or after the demo day.">
          <FlightList flights={data.upcoming} />
        </DashboardSection>
        <DashboardSection title="Saved assessments" hint="Assessments already stored. This is not a queue of assessments still to be done." wide>
          {data.assessments.length === 0 ? <EmptyLine>No assessments are saved.</EmptyLine> : data.assessments.map((item) => (
            <Typography key={item.id} variant="body2" sx={{ py: 0.5 }}>
              {`${formatDate(item.date)} · ${item.cadetName} · ${item.itemName} · ${item.outcome} · ${item.assessor}`}
            </Typography>
          ))}
        </DashboardSection>
        <DashboardSection title="Notifications" wide>
          <NotificationList notes={data.notifications} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

export function InstructorDashboard() {
  const query = useInstructorDashboard();
  if (query.isLoading) return loading('Loading instructor dashboard');
  if (query.isError || !query.data) return failed('The instructor dashboard did not load', () => { void query.refetch(); });
  const data = query.data;
  if (!data.linked) {
    return (
      <>
        <DashboardHeader
          title="Instructor dashboard"
          subtitle="This demonstration account is not linked to a staff record, so assigned cadets and flights cannot be listed."
          context={place()}
          onRefresh={() => { void query.refetch(); }}
          actions={[]}
        />
        <EmptyState title="No staff record is linked" body="Assigned cadets and flights stay hidden until the account has a staff id." />
      </>
    );
  }
  const qualification = data.qualification;
  const expired = qualification ? qualificationBeforeDemoDay(qualification.expires) : false;
  return (
    <>
      <DashboardHeader
        title="Instructor dashboard"
        subtitle={`${data.staffName || 'This instructor'}. Assigned cadets and assigned flights only.`}
        context={place(data.academy)}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          { label: 'My cadets', to: '/cadets', primary: true },
          { label: 'Flight Operations', to: '/flight-operations' },
          { label: 'Training progress', to: '/training/progress' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Assigned active cadets" value={String(data.active.length)} hint="Cadets assigned to this instructor whose status is Active." icon={UserRound} tone="teal" to="/cadets" />
        <MetricTile label="Upcoming flights" value={String(data.upcoming.length)} hint="Assigned flights on or after the demo day that are not completed, cancelled, or rejected." icon={Plane} tone="sky" to="/flight-operations" />
        <MetricTile label="Follow-up flights" value={String(data.followUps.length)} hint="Completed assigned flights stored with follow-up required." icon={AlertTriangle} tone="amber" to="/flight-operations" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Assigned cadets" hint="Recorded hours are opening hours plus completed flights. Not a regulatory hour total.">
          <ProgressList
            empty="No active cadets are assigned to this instructor."
            rows={data.active.map((cadet) => ({
              id: cadet.id,
              href: `/cadets/${cadet.id}`,
              name: cadet.name,
              percent: cadet.progress,
              detail: `${cadet.progress}% illustrative · ${cadet.hours} h recorded`,
            }))}
          />
        </DashboardSection>
        <DashboardSection title="Upcoming assigned flights">
          <ScheduleBoard flights={data.upcoming} />
        </DashboardSection>
        <DashboardSection title="Qualification" hint="Informational only. This label is fictional and is not an authorisation to fly or to instruct.">
          {qualification ? (
            <Typography>
              {`${qualification.name} · ${formatDate(qualification.expires)}`}
              {expired ? ' · Dated before the demo day. Informational only.' : ''}
            </Typography>
          ) : <EmptyLine>No qualification label is stored for this instructor.</EmptyLine>}
        </DashboardSection>
        <DashboardSection title="Follow-up on completed flights" hint="Shown only when the completed flight stores follow-up required. This is not an assessment inbox.">
          <FlightList flights={data.followUps} />
        </DashboardSection>
        <DashboardSection title="Notifications" wide>
          <NotificationList notes={data.notifications} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

export function MaintenanceDashboard() {
  const query = useMaintenanceDashboard();
  if (query.isLoading) return loading('Loading maintenance dashboard');
  if (query.isError || !query.data) return failed('The maintenance dashboard did not load', () => { void query.refetch(); });
  const data = query.data;
  const aircraftStatus = [
    { label: 'Available', count: data.available, href: '/fleet?status=Available' },
    ...statusBreakdown(data.unavailable).map((item) => ({ ...item, href: `/fleet?status=${encodeURIComponent(item.label)}` })),
  ];
  return (
    <>
      <DashboardHeader
        title="Maintenance dashboard"
        subtitle="Planning status, open defects, and open work orders."
        context={place()}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          { label: 'Maintenance', to: '/maintenance', primary: true },
          { label: 'Fleet', to: '/fleet' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Aircraft available" value={String(data.available)} hint="Planning status Available. Not an airworthiness decision." icon={Plane} tone="lime" to="/fleet?status=Available" />
        <MetricTile label="Open defects" value={String(data.defects.length)} hint="Defects whose status is Open." icon={AlertTriangle} tone="rose" to="/maintenance" />
        <MetricTile label="Open work orders" value={String(data.workOrders.length)} hint="Excludes Completed and Release recorded." icon={Wrench} tone="amber" to="/maintenance" />
        <MetricTile label="Aircraft not available" value={String(data.unavailable.length)} hint="Planning status other than Available." icon={Wrench} tone="navy" to="/fleet" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Open defects" tone="attention">
          {data.defects.length === 0 ? <EmptyLine>No open defects.</EmptyLine> : data.defects.map((defect) => (
            <Typography key={defect.id} sx={{ py: 0.5 }}>
              <RouterLink to={`/fleet/${defect.aircraftId}`}>{data.aircraftCode(defect.aircraftId)}</RouterLink>
              {` · ${defect.severity} · ${defect.status} · ${defect.description}`}
            </Typography>
          ))}
        </DashboardSection>
        <DashboardSection title="Work orders by status" hint="Open orders only. A release note is not an authorisation to fly.">
          <ShareBars items={statusBreakdown(data.workOrders).map((item) => ({ ...item, href: '/maintenance' }))} />
        </DashboardSection>
        <DashboardSection title="Assigned to me" hint="Open work orders whose assignee is the signed-in staff record. This is separate from all open orders.">
          <WorkOrderLines orders={data.assignedOrders} aircraftCode={data.aircraftCode} staffName={data.staffName} empty="No open work orders are assigned to this officer." />
        </DashboardSection>
        <DashboardSection title="All open work orders">
          <WorkOrderLines orders={data.workOrders} aircraftCode={data.aircraftCode} staffName={data.staffName} empty="No open work orders." />
        </DashboardSection>
        <DashboardSection title="Aircraft planning status" hint="Not an airworthiness decision." wide>
          <ShareBars items={aircraftStatus} />
          <Box sx={{ mt: 1.5 }}>
            {data.unavailable.length === 0 ? <EmptyLine>Every aircraft is recorded as Available.</EmptyLine> : data.unavailable.map((aircraft) => (
              <Box key={aircraft.id} sx={{ py: 0.75 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <RouterLink to={`/fleet/${aircraft.id}`}>{aircraft.code}</RouterLink>
                  <StatusChip status={aircraft.status} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {aircraft.restriction ? aircraft.restriction.reason : 'No restriction window is stored.'}
                </Typography>
              </Box>
            ))}
          </Box>
        </DashboardSection>
        <DashboardSection title="Aircraft documents" hint="Documents stored with aircraft as the owner. A review label is not a regulator check.">
          {data.aircraftDocuments.length === 0 ? <EmptyLine>No aircraft documents are stored.</EmptyLine> : data.aircraftDocuments.map((document) => (
            <Typography key={document.id} sx={{ py: 0.5 }}>
              <RouterLink to={`/fleet/${document.ownerId}`}>{document.title}</RouterLink>
              {` · ${document.review}`}
            </Typography>
          ))}
        </DashboardSection>
        <DashboardSection title="Notifications">
          <NotificationList notes={data.notifications} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

export function FinanceDashboard() {
  const query = useFinanceDashboard();
  if (query.isLoading) return loading('Loading finance dashboard');
  if (query.isError || !query.data) return failed('The finance dashboard did not load', () => { void query.refetch(); });
  const { snapshot, accounts, payments, expenses, notifications } = query.data;
  const balances = accounts.filter((account) => account.outstanding > 0);
  return (
    <>
      <DashboardHeader
        title="Finance dashboard"
        subtitle="Illustrative fee accounts and recorded expenses."
        context={place()}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          { label: 'Finance', to: '/finance', primary: true },
          { label: 'Cadets', to: '/cadets' },
          { label: 'Reports', to: '/reports' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Billed" value={inr(snapshot.billed)} hint="Sum of illustrative plan totals." icon={Wallet} tone="navy" to="/finance" />
        <MetricTile label="Collected" value={inr(snapshot.collected)} hint="Sum of recorded payments. Not a confirmed settlement." icon={Wallet} tone="teal" to="/finance" />
        <MetricTile label="Outstanding" value={inr(snapshot.outstanding)} hint="Plan total minus that cadet’s payments." icon={Clock} tone="amber" to="/finance" />
        <MetricTile label="Overdue accounts" value={String(snapshot.overdueAccounts)} hint="Outstanding balance with a due date before the demo day." icon={AlertTriangle} tone="rose" to="/finance" />
        <MetricTile label="Expenses" value={inr(snapshot.expenses)} hint="Recorded expense rows. Not a ledger." icon={FileText} tone="sky" to="/finance" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Outstanding by cadet" hint="Overdue accounts are listed first. Illustrative only. A recorded payment is not a confirmed settlement.">
          <AmountBars
            empty="No fee accounts are in this workspace."
            rows={balances.map((account) => ({
              id: account.cadetId,
              href: `/cadets/${account.cadetId}`,
              label: account.name,
              detail: `${inr(account.outstanding)} outstanding${account.overdue ? ' · Overdue' : ''}`,
              amount: account.outstanding,
              tone: account.overdue ? tokens.danger : tokens.sky,
            }))}
          />
        </DashboardSection>
        <DashboardSection title="Recent payments">
          {payments.length === 0 ? <EmptyLine>No payments are recorded.</EmptyLine> : payments.map((payment) => (
            <Typography key={payment.id} variant="body2" sx={{ py: 0.55 }}>{`${formatDate(payment.date)} · ${inr(payment.amount)} · ${payment.method} · ${payment.reference}`}</Typography>
          ))}
        </DashboardSection>
        <DashboardSection title="Recent expenses" wide>
          {expenses.length === 0 ? <EmptyLine>No expenses are recorded.</EmptyLine> : expenses.map((expense) => (
            <Typography key={expense.id} variant="body2" sx={{ py: 0.55 }}>{`${formatDate(expense.date)} · ${expense.category} · ${inr(expense.amount)} · ${expense.description}`}</Typography>
          ))}
        </DashboardSection>
        <DashboardSection title="Notifications" wide>
          <NotificationList notes={notifications} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

export function HrDashboard() {
  const query = useHrDashboard();
  if (query.isLoading) return loading('Loading staff dashboard');
  if (query.isError || !query.data) return failed('The staff dashboard did not load', () => { void query.refetch(); });
  const data = query.data;
  return (
    <>
      <DashboardHeader
        title="Staff dashboard"
        subtitle="Staff records, availability labels, and availability blocks."
        context={place()}
        onRefresh={() => { void query.refetch(); }}
        actions={[
          { label: 'HR & Staff', to: '/hr', primary: true },
          { label: 'Documents', to: '/documents' },
        ]}
      />
      <MetricGrid>
        <MetricTile label="Staff" value={String(data.staff.length)} hint="People stored on the staff register." icon={Users} tone="navy" to="/hr" />
        <MetricTile label="Qualification dates before the demo day" value={String(data.attention.length)} hint="Informational only. Not a legal or licensing check." icon={GraduationCap} tone="amber" to="/hr" />
      </MetricGrid>
      <DashboardColumns>
        <DashboardSection title="Availability labels" hint="The label stored on the staff record. It is not a leave block.">
          <ShareBars items={countLabels(data.staff.map((member) => member.availability))} />
          <Box sx={{ mt: 1.5 }}>
            {data.staff.map((member) => (
              <Box key={member.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.7, flexWrap: 'wrap', alignItems: 'center' }}>
                <RouterLink to={`/hr/${member.id}`}>{member.name}</RouterLink>
                <StatusChip status={member.availability} />
              </Box>
            ))}
          </Box>
        </DashboardSection>
        <DashboardSection title="Leave blocks" hint="Upcoming blocks whose kind is Leave.">
          <BlockLines blocks={data.leave} staffName={data.staffName} empty="No upcoming leave blocks." />
        </DashboardSection>
        <DashboardSection title="Unavailable blocks" hint="Upcoming blocks whose kind is Unavailable. Kept separate from Leave and from the availability label.">
          <BlockLines blocks={data.unavailableBlocks} staffName={data.staffName} empty="No upcoming unavailable blocks." />
        </DashboardSection>
        <DashboardSection title="Qualification labels before the demo day" hint="Informational only. These labels are fictional.">
          {data.attention.length === 0 ? <EmptyLine>No stored qualification date is before the demo day.</EmptyLine> : data.attention.map((member) => (
            <Typography key={member.id} sx={{ py: 0.5 }}>
              <RouterLink to={`/hr/${member.id}`}>{member.name}</RouterLink>
              {` · ${member.qualifications[0]?.name ?? 'Qualification'} · ${formatDate(member.qualifications[0]?.expires)}`}
            </Typography>
          ))}
        </DashboardSection>
        <DashboardSection title="Pending staff documents" hint="Documents stored with staff as the owner and review Pending." wide>
          <DocumentLinks documents={data.staffDocuments} />
        </DashboardSection>
        <DashboardSection title="Notifications" wide>
          <NotificationList notes={data.notifications} />
        </DashboardSection>
      </DashboardColumns>
    </>
  );
}

function DocumentLinks({ documents }: { documents: { id: string; title: string }[] }) {
  if (documents.length === 0) return <EmptyLine>No documents are pending review.</EmptyLine>;
  return (
    <Box>
      {documents.map((document) => (
        <Typography key={document.id} sx={{ py: 0.45 }}>
          <RouterLink to="/documents?review=Pending">{document.title}</RouterLink>
        </Typography>
      ))}
    </Box>
  );
}

function FuelLines({ tanks }: { tanks: { id: string; name: string; balance: number; unit: string; threshold: number }[] }) {
  if (tanks.length === 0) return <EmptyLine>No tank is below its threshold.</EmptyLine>;
  return (
    <Box>
      {tanks.map((tank) => {
        const scale = Math.max(tank.threshold, tank.balance, 1);
        return (
          <Box key={tank.id} sx={{ py: 0.7 }}>
            <Typography sx={{ py: 0.2 }}>{`${tank.name} · ${tank.balance} ${tank.unit} · threshold ${tank.threshold}`}</Typography>
            <Box sx={{ mt: 0.6, height: 8, borderRadius: 99, bgcolor: tokens.neutralSoft, overflow: 'hidden' }} aria-hidden>
              <Box sx={{ width: `${(tank.balance / scale) * 100}%`, height: '100%', bgcolor: tokens.warning }} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function IssueLines({ issues, empty }: { issues: { id: string; reference: string; message: string; level: string }[]; empty: string }) {
  if (issues.length === 0) return <EmptyLine>{empty}</EmptyLine>;
  return (
    <Box>
      {issues.map((issue, index) => (
        <Typography key={`${issue.id}-${issue.level}-${index}`} variant="body2" sx={{ py: 0.45 }}>
          <RouterLink to={`/flight-operations/${issue.id}`}>{issue.reference}</RouterLink>
          {` · ${issue.message}`}
        </Typography>
      ))}
    </Box>
  );
}

function BlockLines({
  blocks,
  staffName,
  empty,
}: {
  blocks: { id: string; staffId: string; date: string; start: string; end: string; kind: string; reason: string }[];
  staffName: (id: string) => string;
  empty: string;
}) {
  if (blocks.length === 0) return <EmptyLine>{empty}</EmptyLine>;
  return (
    <Box>
      {blocks.map((block) => (
        <Box key={block.id} sx={{ py: 0.8, borderLeft: `3px solid ${block.kind === 'Leave' ? tokens.sky : tokens.warning}`, pl: 1.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{staffName(block.staffId)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {`${block.kind} · ${formatDate(block.date)} ${block.start}–${block.end} · ${block.reason}`}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function WorkOrderLines({
  orders,
  aircraftCode,
  staffName,
  empty,
}: {
  orders: { id: string; reference: string; status: string; aircraftId: string; assigneeId: string; description: string }[];
  aircraftCode: (id: string) => string;
  staffName: (id: string) => string;
  empty: string;
}) {
  if (orders.length === 0) return <EmptyLine>{empty}</EmptyLine>;
  return (
    <Box>
      {orders.map((order) => (
        <Box key={order.id} sx={{ py: 0.75 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 600 }}>{order.reference}</Typography>
            <StatusChip status={order.status} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            <RouterLink to={`/fleet/${order.aircraftId}`}>{aircraftCode(order.aircraftId)}</RouterLink>
            {` · ${staffName(order.assigneeId) || 'Unassigned'} · ${order.description}`}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
