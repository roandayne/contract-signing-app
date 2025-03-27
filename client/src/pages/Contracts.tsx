import { Box } from '@mui/material';
import React, { useState } from 'react';
import Table from '../components/CustomMui/Table';
import { GridColDef } from '@mui/x-data-grid';

const columns: GridColDef[] = [
  {
    field: 'first_name',
    headerName: 'First Name',
    width: 150,
    editable: false,
  },
  {
    field: 'last_name',
    headerName: 'Last Name',
    width: 150,
    editable: false,
  },
  {
    field: 'clae_onboarding_link',
    headerName: 'Clae Onboarding Link',
    width: 150,
    editable: false,
  },
  {
    field: 'clae_ibo',
    headerName: 'Clae IBO',
    width: 150,
    editable: false,
  },
  {
    field: 'direct_deposit',
    headerName: 'Direct Deposit',
    width: 150,
    editable: false,
  },
  {
    field: 'vistra',
    headerName: 'VISTRA',
    width: 150,
    editable: false,
  },
  {
    field: 'perch_cod',
    headerName: 'Perch COD',
    width: 150,
    editable: false,
  },
  {
    field: 'nexamp_attestation',
    headerName: 'Nexamp Attestation',
    width: 150,
    editable: false,
  },
];

const Contracts = () => {
  const [data, setData] = useState<[]>([]);
  return (
    <Box>
      <Table columns={columns} rows={data} />
    </Box>
  );
};

export default Contracts;
