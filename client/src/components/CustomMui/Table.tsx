import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';

export default function Table({
  columns,
  rows,
  page,
  onPageChange,
  totalRows,
  pageSize = 10,
}: {
  columns: GridColDef[];
  rows: any[];
  page: number;
  onPageChange: (model: GridPaginationModel) => void;
  totalRows?: number;
  pageSize?: number;
}) {
  return (
    <Box sx={{ height: '100%', width: 'calc(100vw - 300px - 20px)' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        paginationModel={{
          page: page - 1,
          pageSize: pageSize,
        }}
        onPaginationModelChange={onPageChange}
        pageSizeOptions={[pageSize]}
        disableRowSelectionOnClick
        rowCount={totalRows || 0}
        paginationMode="server"
        getRowId={(row) => row.uuid || row.id}
        loading={rows.length === 0}
      />
    </Box>
  );
}
