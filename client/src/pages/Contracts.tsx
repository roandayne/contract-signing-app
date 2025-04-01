import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Box,
  Button,
  Stack,
  Modal,
  Typography,
  TextField,
  IconButton
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { GridColDef } from '@mui/x-data-grid';
import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import DragNDropPDF from '../components/Contracts/DragNDropPDF';
import SignatureFieldEditor from '../components/Contracts/SignatureFieldEditor';
import Table from '../components/CustomMui/Table';

const columns = (handleDownload: (url: string) => void, handleAddSignatureFields: (id: string, url: string) => void): GridColDef[] => [
  {
    field: 'name',
    headerName: 'Contract Name',
    flex: 1,
    minWidth: 150,
    editable: false,
  },
  {
    field: 'signing_link',
    headerName: 'Signing Link',
    flex: 2,
    minWidth: 250,
    editable: false,
    renderCell: (params) => params.value ? (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography noWrap sx={{ flex: 1 }}>{params.value}</Typography>
        <IconButton 
          size="small" 
          onClick={() => navigator.clipboard.writeText(params.value)}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Stack>
    ) : (
      <Typography color="text.secondary">No signing link yet</Typography>
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    flex: 1,
    minWidth: 200,
    editable: false,
    renderCell: (params) => (
      <Stack direction="row" spacing={1}>
        <Button 
          variant="contained" 
          size="small"
          onClick={() => handleAddSignatureFields(params.row.id, params.row.file_url)}
          disabled={params.row.signing_link}
        >
          Add Signatures
        </Button>
        <Button 
          variant="contained" 
          size="small"
          onClick={() => handleDownload(params.value)}
        >
          Download
        </Button>
      </Stack>
    ),
  }
];

type DataType = {
  id: string;
  name: string;
  signing_link: string;
  file_url: string;
  submissions: number;
};

interface SignatureField {
  id: string;
  x: number;
  y: number;
  pageNumber: number;
}

const Contracts = () => {
  const [data, setData] = useState<DataType[]>([]);
  const [formUrl, setFormUrl] = useState<string>();
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{ id: string; url: string } | null>(null);
  const [isSignatureEditorOpen, setIsSignatureEditorOpen] = useState(false);
  const [publicLink, setPublicLink] = useState<string>('');
  const [isPublicLinkModalOpen, setIsPublicLinkModalOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await axiosInstance.get('/api/v1/forms');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handleAddSignatureFields = (id: string, url: string) => {
    setSelectedPdf({ id, url });
    setIsSignatureEditorOpen(true);
  };

  const handleSaveSignatureFields = async (fields: SignatureField[]) => {
    if (!selectedPdf) return;

    try {
      const response = await axiosInstance.post(`/api/v1/forms/${selectedPdf.id}/signature_fields`, {
        signature_fields: fields
      });
      
      // Show the public link modal
      const publicUrl = `${window.location.origin}/form/${selectedPdf.id}`;
      setPublicLink(publicUrl);
      setIsSignatureEditorOpen(false);
      setIsPublicLinkModalOpen(true);
      
      // Update the table data
      fetchContracts();
    } catch (error) {
      console.error('Error saving signature fields:', error);
      alert('Failed to save signature fields');
    }
  };

  const handleFileUpload = async () => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files[]', file);
    });

    try {
      const response = await axiosInstance.post('/api/v1/forms', formData);
      alert(response.data.message);
      setFormUrl(response.data.form.file_url);
      setIsOpen(false);
      setFiles([]);
      
      // Open signature editor for the newly uploaded file
      if (response.data.form.id && response.data.form.file_url) {
        handleAddSignatureFields(response.data.form.id, response.data.form.file_url);
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      alert(error.response?.data?.error || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
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
            multiple
            accept=".pdf"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              if (event.target.files) {
                setFiles(Array.from(event.target.files));
                setIsOpen(true);
              }
            }}
          />
        </Button>
      </Stack>
      
      <Table columns={columns(handleDownload, handleAddSignatureFields)} rows={data} />

      <DragNDropPDF
        files={files}
        setFiles={setFiles}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        handleFileUpload={handleFileUpload}
        isUploading={isUploading}
        handleRemoveFile={handleRemoveFile}
      />

      <Modal
        open={isSignatureEditorOpen}
        onClose={() => {
          setIsSignatureEditorOpen(false);
          setSelectedPdf(null);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ 
          width: '90vw', 
          height: '90vh', 
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}>
          {selectedPdf && (
            <SignatureFieldEditor
              pdfUrl={selectedPdf.url}
              onSave={handleSaveSignatureFields}
            />
          )}
        </Box>
      </Modal>

      <Modal
        open={isPublicLinkModalOpen}
        onClose={() => setIsPublicLinkModalOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ 
          width: '600px',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}>
          <Typography variant="h6" gutterBottom>
            Public Form Link Created
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Share this link with users to collect signatures:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              value={publicLink}
              InputProps={{
                readOnly: true,
              }}
            />
            <Button
              variant="contained"
              onClick={() => {
                navigator.clipboard.writeText(publicLink);
                alert('Link copied to clipboard!');
              }}
            >
              Copy
            </Button>
          </Stack>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setIsPublicLinkModalOpen(false)}
          >
            Close
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default Contracts;
