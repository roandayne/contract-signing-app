import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Box,
  Button,
  Stack,
  Modal,
  Typography,
  TextField,
  IconButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { GridColDef } from '@mui/x-data-grid';
import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import DragNDropPDF from '../components/Contracts/DragNDropPDF';
import Table from '../components/CustomMui/Table';
import { ContractEditor } from '../components/Contracts/ContractEditor';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

type FormComponent = {
  id: number;
  original_filename: string;
  page_count: number;
  start_page: number;
  end_page: number;
  order_index: number;
};

type DataType = {
  uuid: string;
  file_name: string;
  signing_link: string;
  file_url: string;
  submissions: number;
  form_components: FormComponent[];
};

const shortenLink = (longUrl: string, callback: (shortUrl: string) => void) => {
  axios
    .get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`)
    .then(response => {
      callback(response.data);
    })
    .catch(error => console.error("Error shortening URL:", error));
};

const Contracts = () => {
  const [data, setData] = useState<DataType[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [shortenedUrls, setShortenedUrls] = useState<Record<string, string>>({});
  const [_formUrl, setFormUrl] = useState<string>();
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{
    uuid: string;
    url: string;
  } | null>(null);
  const [isSignatureEditorOpen, setIsSignatureEditorOpen] = useState(false);
  const [publicLink, setPublicLink] = useState<string>('');
  const [isPublicLinkModalOpen, setIsPublicLinkModalOpen] = useState(false);
  const { showNotification } = useNotification();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchContracts();
  }, [page]);

  const fetchContracts = async () => {
    try {
      const response = await axiosInstance.get('/api/v1/forms', {
        params: {
          page,
          per_page: rowsPerPage
        }
      });
      setData(response.data.forms);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handleAddSignatureFields = (uuid: string, url: string) => {
    setSelectedPdf({ uuid, url });
    setIsSignatureEditorOpen(true);
  };

  const handleGenerateLink = async (formUuid: string) => {
    try {
      const response = await axiosInstance.post(`/api/v1/forms/${formUuid}/generate_link`);
      const publicLink = response.data.signing_link;
      setPublicLink(publicLink);

      setData(prevData => prevData.map(item => 
        item.uuid === formUuid ? { ...item, signing_link: publicLink } : item
      ));

      showNotification('Public link generated successfully!', 'success');
    } catch (error) {
      showNotification('Failed to generate public link', 'error');
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
      const response = await axiosInstance.post('/api/v1/forms', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showNotification(response.data.message, 'success');
      setFormUrl(response.data.form.file_url);
      setIsOpen(false);
      setFiles([]);

      if (response.data.form.uuid && response.data.form.file_url) {
        handleAddSignatureFields(
          response.data.form.uuid,
          response.data.form.file_url
        );
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      showNotification(error.response?.data?.error || 'Failed to upload files', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleExpand = (uuid: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [uuid]: !prev[uuid]
    }));
  };

  const columns = (
    handleDownload: (url: string) => void,
    handleAddSignatureFields: (uuid: string, url: string) => void,
    handleGenerateLink: (formUuid: string) => void
  ): GridColDef[] => [
    {
      field: 'expand',
      headerName: '',
      width: 50,
      renderCell: (params) => (
        <IconButton
          onClick={() => handleToggleExpand(params.row.uuid)}
        >
          {expandedRows[params.row.uuid] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      ),
    },
    {
      field: 'file_name',
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
      renderCell: (params) => 
        params.value ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography noWrap sx={{ flex: 1 }}>
              {shortenedUrls[params.value] || (() => {
                const fullUrl = params.value;
                shortenLink(fullUrl, (shortUrl: string) => {
                  setShortenedUrls((prev: Record<string, string>) => ({...prev, [params.value]: shortUrl}));
                });
                return fullUrl;
              })()}
            </Typography>
            <IconButton
              size="small"
              onClick={() => navigator.clipboard.writeText(params.value)}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Stack>
        ) : (
          <Typography color="text.secondary">No signing link available</Typography>
        ),
    },
    {
      field: 'file_url',
      headerName: 'File',
      flex: 2,
      minWidth: 250,
      editable: false,
      renderCell: (params) =>
        params.value ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography noWrap sx={{ flex: 1 }}>
              {shortenedUrls[params.value] || (() => {
                const fullUrl = `${import.meta.env.VITE_API_URL}${params.value}`;
                shortenLink(fullUrl, (shortUrl: string) => {
                  setShortenedUrls((prev: Record<string, string>) => ({...prev, [params.value]: shortUrl}));
                });
                return fullUrl;
              })()}
            </Typography>
            <IconButton
              size="small"
              onClick={() => navigator.clipboard.writeText(shortenedUrls[params.value] || `${import.meta.env.VITE_API_URL}${params.value}`)}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Stack>
        ) : (
          <Typography color="text.secondary">No file URL available</Typography>
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
            onClick={() =>
              handleAddSignatureFields(params.row.uuid, params.row.file_url)
            }
            disabled={params.row.signing_link}
          >
            Add Inputs
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleGenerateLink(params.row.uuid)}
            disabled={params.row.signing_link}
            color="secondary"
          >
            Generate Link
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
    },
  ];

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

      <Table
        columns={columns(handleDownload, handleAddSignatureFields, handleGenerateLink)}
        rows={data}
      />

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
        <Box
          sx={{
            width: 'fit-content',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          {selectedPdf && (
            <ContractEditor
              fetchContracts={fetchContracts}
              pdfUrl={`${import.meta.env.VITE_API_URL}${selectedPdf.url}`}
              formUuid={selectedPdf.uuid}
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
        <Box
          sx={{
            width: '600px',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
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
                showNotification('Link copied to clipboard!', 'success');
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
