import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  Stack,
  Modal,
} from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';
import SignaturePad from 'react-signature-canvas';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../axiosInstance';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SignatureField {
  id: string;
  x: number;
  y: number;
  pageNumber: number;
}

const validationSchema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email'),
});

type FormData = {
  name: string;
  email: string;
};

const PublicForm = () => {
  const { formId } = useParams<{ formId: string }>();
  const [formData, setFormData] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [signatures, setSignatures] = useState<{ [key: string]: string }>({});
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string>('');
  const [sigPad, setSigPad] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
  });

  useEffect(() => {
    fetchFormData();
  }, [formId]);

  const fetchFormData = async () => {
    try {
      const response = await axiosInstance.get(
        `/api/v1/forms/${formId}`
      );
      setFormData(response.data.form);
      setSignatureFields(response.data.signature_fields || []);
    } catch (error) {
      console.error('Error fetching form:', error);
    }
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const openSignaturePad = (fieldId: string) => {
    setCurrentFieldId(fieldId);
    setIsSignatureModalOpen(true);
  };

  const handleSignatureSave = () => {
    if (sigPad && !sigPad.isEmpty()) {
      const signatureData = sigPad.toDataURL();
      setSignatures({ ...signatures, [currentFieldId]: signatureData });
      setIsSignatureModalOpen(false);
      sigPad.clear();
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await axiosInstance.post(`/api/v1/forms/${formId}/submit`, {
        name: data.name,
        email: data.email,
        signatures: Object.entries(signatures).map(
          ([fieldId, signatureData]) => ({
            field_id: fieldId,
            signature_data: signatureData,
          })
        ),
      });
      alert('Form submitted successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form');
    }
  };

  if (!formData) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', margin: '0 auto' }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {formData.name}
        </Typography>

        <Stack
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <TextField
            label="Your Name"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            required
          />
          <TextField
            label="Your Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            required
          />
        </Stack>

        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Document
            file={formData.file_url}
            onLoadSuccess={handleDocumentLoadSuccess}
          >
            <Box sx={{ position: 'relative' }}>
              <Page
                pageNumber={pageNumber}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
              {signatureFields
                .filter((field) => field.pageNumber === pageNumber)
                .map((field) => (
                  <Box
                    key={field.id}
                    sx={{
                      position: 'absolute',
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      transform: 'translate(-50%, -50%)',
                      border: signatures[field.id]
                        ? '2px solid #4caf50'
                        : '2px dashed #1976d2',
                      padding: '20px 40px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      cursor: 'pointer',
                    }}
                    onClick={() => openSignaturePad(field.id)}
                  >
                    {signatures[field.id] ? (
                      <img
                        src={signatures[field.id]}
                        alt="Signature"
                        style={{ maxWidth: '200px', maxHeight: '100px' }}
                      />
                    ) : (
                      <Typography>Click to sign</Typography>
                    )}
                  </Box>
                ))}
            </Box>
          </Document>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
          <Button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((prev) => prev - 1)}
          >
            Previous
          </Button>
          <Typography>
            Page {pageNumber} of {numPages}
          </Typography>
          <Button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((prev) => prev + 1)}
          >
            Next
          </Button>
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={Object.keys(signatures).length !== signatureFields.length}
        >
          Submit Form
        </Button>
      </Paper>

      <Modal
        open={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper sx={{ p: 3, width: '600px' }}>
          <Typography variant="h6" gutterBottom>
            Draw your signature
          </Typography>
          <Box
            sx={{
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              mb: 2,
            }}
          >
            <SignaturePad
              ref={(ref) => setSigPad(ref)}
              canvasProps={{
                width: 550,
                height: 200,
                style: { width: '100%', height: '200px' },
              }}
            />
          </Box>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={() => sigPad?.clear()}>Clear</Button>
            <Button
              variant="contained"
              onClick={handleSignatureSave}
              disabled={!sigPad || sigPad.isEmpty()}
            >
              Save Signature
            </Button>
          </Stack>
        </Paper>
      </Modal>
    </Box>
  );
};

export default PublicForm;
