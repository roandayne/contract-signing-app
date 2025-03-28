import { Box, Button } from '@mui/material';
import React, { useState } from 'react';
import Table from '../components/CustomMui/Table';
import { GridColDef } from '@mui/x-data-grid';

const columns = (handleDownload: (url: string) => void): GridColDef[] => [
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
    renderCell: (params) => (
      <Button variant="contained" onClick={() => handleDownload(params.value)}>
        Download
      </Button>
    ),
  },
  {
    field: 'clae_ibo',
    headerName: 'Clae IBO',
    width: 150,
    editable: false,
    renderCell: (params) => (
      <Button variant="contained" onClick={() => handleDownload(params.value)}>
        Download
      </Button>
    ),
  },
  {
    field: 'direct_deposit',
    headerName: 'Direct Deposit',
    width: 150,
    editable: false,
    renderCell: (params) => (
      <Button variant="contained" onClick={() => handleDownload(params.value)}>
        Download
      </Button>
    ),
  },
  {
    field: 'vistra',
    headerName: 'VISTRA',
    width: 150,
    editable: false,
    renderCell: (params) => (
      <Button variant="contained" onClick={() => handleDownload(params.value)}>
        Download
      </Button>
    ),
  },
  {
    field: 'perch_cod',
    headerName: 'Perch COD',
    width: 150,
    editable: false,
    renderCell: (params) => (
      <Button variant="contained" onClick={() => handleDownload(params.value)}>
        Download
      </Button>
    ),
  },
  {
    field: 'nexamp_attestation',
    headerName: 'Nexamp Attestation',
    width: 150,
    editable: false,
    renderCell: (params) => (
      <Button variant="contained" onClick={() => handleDownload(params.value)}>
        Download
      </Button>
    ),
  },
];

type DataType = {
  first_name: string;
  last_name: string;
  perch_cod: string;
  nexamp_attestation: string;
  clae_onboarding_link: string;
  clae_ibo: string;
  vistra: string;
  direct_deposit: string;
};

const Contracts = () => {
  const [data, setData] = useState<DataType[]>([]);

  const handleDownload = (url: string) => {
    // Logic to handle file download
    window.open(url, '_blank');
  };

  return (
    <Box>
      <Table columns={columns(handleDownload)} rows={data} />
    </Box>
  );
};

export default Contracts;
