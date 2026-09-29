import { PageHeader } from '../../components/data/PageHeader';
import { EmptyState } from '../../components/data/EmptyState';

export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <EmptyState
        title="Records are not connected yet"
        body="This screen is part of the Airnotix shell. Northstar Flight Academy records for this module will be added in the next phase."
      />
    </>
  );
}
