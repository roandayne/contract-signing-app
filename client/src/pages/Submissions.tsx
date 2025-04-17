import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { useState, useEffect } from 'react';
import Table from '../components/CustomMui/Table';
import axiosInstance from '../axiosInstance';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useNotification } from '../context/NotificationContext';

type FormComponent = {
  id: number;
  original_filename: string;
  page_count: number;
  start_page: number;
  end_page: number;
  order_index: number;
};

type Form = {
  uuid: string;
  file_name: string;
  form_components: FormComponent[];
};

type Submission = {
  id: number;
  signer_name: string;
  signer_email: string;
  created_at: string;
  submission_count: number;
};

type GroupedSubmission = {
  form: Form;
  submissions: Submission[];
};

const SubmissionTable = ({ 
  form,
  submissions,
  onDownloadComponent 
}: { 
  form: Form;
  submissions: Submission[];
  onDownloadComponent: (formUuid: string, componentId: number, filename: string, startPage: number, endPage: number, submissionId: number) => void;
}) => {
  const { showNotification } = useNotification();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const handleDownloadAll = async (submissionId: number) => {
    try {
      const response = await axiosInstance.get(
        `/api/v1/submissions/forms/${form.uuid}/components/download_all`,
        { 
          params: {
            submission_id: submissionId
          },
          responseType: 'blob' 
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `signed_${form.file_name}_components.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading all components:', error);
      if (error.response) {
        showNotification(`Failed to download components: ${error.response.data.error || 'Unknown error'}`, 'error');
      } else if (error.request) {
        showNotification('Failed to download components: No response from server', 'error');
      } else {
        showNotification(`Failed to download components: ${error.message}`, 'error');
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'submitter',
      headerName: 'Submitter',
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => params.row.signer_name,
    },
    {
      field: 'signer_email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => params.row.signer_email,
    },
    {
      field: 'submitted_at',
      headerName: 'Last Submission',
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => 
        new Date(params.row.created_at).toLocaleString(),
    },
    {
      field: 'download_all',
      headerName: 'All Components',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={() => handleDownloadAll(params.row.id)}
        >
          Download All
        </Button>
      ),
    },
    ...form.form_components.map((component): GridColDef => ({
      field: `component_${component.id}`,
      headerName: component.original_filename,
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => onDownloadComponent(form.uuid, component.id, component.original_filename, component.start_page, component.end_page, params.row.id)}
        >
          Download
        </Button>
      ),
    })),
  ];

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" mb={2}>{form.file_name}</Typography>
        <Table 
          columns={columns} 
          rows={submissions.map(submission => ({
            ...submission,
            ...form.form_components.reduce((acc, component) => ({
              ...acc,
              [`component_${component.id}`]: component.original_filename,
            }), {}),
          }))}
          page={page}
          pageSize={pageSize}
          onPageChange={(model) => setPage(model.page)}
          totalRows={submissions.length}
        />
      </CardContent>
    </Card>
  );
};

const Submissions = () => {
  const [groupedSubmissions, setGroupedSubmissions] = useState<GroupedSubmission[]>([]);
  const { showNotification } = useNotification();
  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await axiosInstance.get('/api/v1/submissions');
      setGroupedSubmissions(response.data.grouped_submissions);
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to fetch submissions', 'error');
    }
  };

  const handleDownloadComponent = async (formUuid: string, componentId: number, filename: string, startPage: number, endPage: number, submissionId: number) => {
    try {
      const response = await axiosInstance.get(
        `/api/v1/submissions/forms/${formUuid}/components/${componentId}/download`,
        { 
          params: {
            start_page: startPage,
            end_page: endPage,
            submission_id: submissionId
          },
          responseType: 'blob' 
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const pageRangeSuffix = startPage === endPage ? `_p${startPage}` : `_p${startPage}-${endPage}`;
      const fileNameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      const fileExt = filename.split('.').pop();
      link.setAttribute('download', `${fileNameWithoutExt}${pageRangeSuffix}.${fileExt}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading component:', error);
      if (error.response) {
        showNotification(`Failed to download component: ${error.response.data.error || 'Unknown error'}`, 'error');
      } else if (error.request) {
        showNotification('Failed to download component: No response from server', 'error');
      } else {
        showNotification(`Failed to download component: ${error.message}`, 'error');
      }
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      {groupedSubmissions.map(({ form, submissions }) => (
        <Box key={form.uuid} sx={{ mb: 4 }}>
          <SubmissionTable
            form={form}
            submissions={submissions}
            onDownloadComponent={handleDownloadComponent}
          />
        </Box>
      ))}
    </Box>
  );
};

export default Submissions;
