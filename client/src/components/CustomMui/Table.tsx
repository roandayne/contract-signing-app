import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export default function Table({
  columns,
  rows,
}: {
  columns: GridColDef[];
  rows: any[];
}) {
  return (
    <Box sx={{ height: '100%', width: 'calc(100vw - 300px - 20px)' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 10,
            },
          },
        }}
        pageSizeOptions={[10]}
        disableRowSelectionOnClick
      />
    </Box>
  );
}
