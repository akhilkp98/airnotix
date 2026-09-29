import { DataGrid, type GridColDef, type GridValidRowModel } from '@mui/x-data-grid';
import { tokens } from '../../theme/tokens';
import { EmptyState } from './EmptyState';

export function RecordGrid<T extends GridValidRowModel>({
  rows,
  columns,
  loading = false,
  emptyTitle,
  emptyBody,
}: {
  rows: T[];
  columns: GridColDef<T>[];
  loading?: boolean;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      autoHeight
      disableRowSelectionOnClick
      disableColumnMenu
      hideFooter={rows.length <= 10}
      sx={{
        width: '100%',
        border: `1px solid ${tokens.line}`,
        borderRadius: 3,
        bgcolor: tokens.surface,
        '& .MuiDataGrid-columnHeaders': { bgcolor: tokens.page },
        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: tokens.navy },
        '& .MuiDataGrid-cell': { borderColor: tokens.line },
        '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
          outline: 'none',
        },
        '& .MuiDataGrid-row:hover': { bgcolor: tokens.page },
      }}
    />
  );
}
