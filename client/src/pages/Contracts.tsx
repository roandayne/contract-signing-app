import { Box, Button, Stack } from '@mui/material';
import React, { useState } from 'react';
import Table from '../components/CustomMui/Table';
import { GridColDef } from '@mui/x-data-grid';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

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
  const [isUploading, setIsUploading] = useState(false);

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error uploading file:', error);
      // You might want to add error handling UI here
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
          disabled={isUploading}
        >
          Upload Contracts
          <input
            type="file"
            hidden
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
          />
        </Button>
      </Stack>
      <Table columns={columns(handleDownload)} rows={data} />
    </Box>
  );
};

export default Contracts;
