import { useState, useEffect, useRef, useCallback } from 'react';
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
import type SignatureCanvas from 'react-signature-canvas';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';

// Create a separate axios instance for public endpoints
const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
  },
});

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Field {
  form_id: number;
  id: number;
  page_number: number;
  position_x: number;
  position_y: number;
  signature_data: string | null;
  signature_type: 'type' | 'date' | 'draw';
  name: string;
  width: number;
  height?: number;
}

interface FormFields {
  created_at: string;
  file_name: string;
  file_type: string;
  file_url: string;
  id: number;
  signing_link: string;
  updated_at: string;
  user_id: number;
  uuid: string;
}

type FormData = {
  file_url: string;
  fields: FormFields;
};

const validationSchema = yup.object().shape({
  signerName: yup.string().required('Signer name is required'),
  signerEmail: yup.string().email('Invalid email').required('Email is required'),
});

type SignerFormData = {
  signerName: string;
  signerEmail: string;
};

const PublicForm = () => {
  const { formId } = useParams<{ formId: string }>();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [fields, setFields] = useState<Field[]>([]);
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});
  const [signatures, setSignatures] = useState<{ [key: string]: string }>({});
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string>('');
  const [hasSignature, setHasSignature] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const sigPadRefs = useRef<SignatureCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SignerFormData>({
    resolver: yupResolver(validationSchema),
  });

  useEffect(() => {
    fetchFormData();
  }, [formId]);

  const fetchFormData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!formId) {
        throw new Error('Form ID is required');
      }
      const response = await publicAxios.get(`/api/v1/forms/${formId}`);
      if (!response.data || !response.data.form) {
        throw new Error('Invalid form data received');
      }
      console.log('Form data response:', response.data);
      setFormData(response.data.form);
      setFields(response.data.signature_fields || []);
      console.log('Fields after setting:', response.data.signature_fields);
    } catch (error: any) {
      console.error('Error fetching form:', error);
      setError(error.message || 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };
console.log(sigPadRefs.current)
  console.log('Fields:', fields);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError('Failed to load PDF document. Please try again later.');
  };

  const handleChange = (fieldId: number, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSignaturePadRef = useCallback((ref: SignatureCanvas | null) => {
    if (ref && ref._canvas) {
      sigPadRefs.current = ref;
      // Add event listener for drawing
      ref._canvas.addEventListener("mouseup", () => {
        setHasSignature(!ref.isEmpty());
      });
      ref._canvas.addEventListener("touchend", () => {
        setHasSignature(!ref.isEmpty());
      });
    }
  }, []);

  const handleSignatureSave = () => {
    if (sigPadRefs.current && !sigPadRefs.current.isEmpty()) {
      const signatureData = sigPadRefs.current.toDataURL();
      setSignatures((prev) => ({ ...prev, [currentFieldId]: signatureData }));
      setIsSignatureModalOpen(false);
      sigPadRefs.current.clear();
      setHasSignature(false);
    }
  };

  const handleClearSignature = () => {
    if (sigPadRefs.current) {
      sigPadRefs.current.clear();
      setHasSignature(false);
    }
  };

  const renderField = (field: Field) => {
    const getFieldDimensions = (type: string) => {
      switch (type) {
        case 'draw':
          return { width: 200, height: 20 };
        case 'type':
          return { width: 200, height: 20 };
        case 'date':
          return { width: 150, height: 20 };
        default:
          return { width: 200, height: 20 };
      }
    };

    const dimensions = getFieldDimensions(field.signature_type);
    
    const commonStyle = {
      position: 'absolute',
      top: `${field.position_y}px`,
      left: `${field.position_x}px`,
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '0px',
      border: '1px solid #ccc',
      transform: 'translate(0, 0)',
      zIndex: 1000,
    };

    console.log('Rendering field:', field);

    switch (field.signature_type) {
      case 'type':
        return (
          <TextField
            key={field.id}
            type="text"
            name={`field_${field.id}`}
            value={formValues[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            sx={{
              ...commonStyle,
              '& .MuiOutlinedInput-root': {
                height: '20px',
                padding: 0,
                '& input': {
                  padding: '0 5px',
                  height: '20px',
                }
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #ccc'
              }
            }}
            variant="outlined"
            size="small"
          />
        );
      case 'date':
        return (
          <TextField
            key={field.id}
            type="date"
            name={`field_${field.id}`}
            value={formValues[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            sx={{
              ...commonStyle,
              '& .MuiOutlinedInput-root': {
                height: '20px',
                padding: 0,
                '& input': {
                  padding: '0 5px',
                  height: '20px',
                }
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #ccc'
              }
            }}
            variant="outlined"
            size="small"
          />
        );
      case 'draw':
        return (
          <Box
            key={field.id}
            sx={{
              ...commonStyle,
              height: dimensions.height || "20px",
              cursor: 'pointer',
              border: signatures[field.id] ? '2px solid #4caf50' : '2px dashed #1976d2',
            }}
            onClick={() => {
              setCurrentFieldId(field.id.toString());
              setIsSignatureModalOpen(true);
            }}
          >
            {signatures[field.id] ? (
              <img
                src={signatures[field.id]}
                alt="Signature"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : (
              <Typography align="center">Click to sign</Typography>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  const handleSubmitForm = async (signerData: SignerFormData) => {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('signature[signer_name]', signerData.signerName);
      formData.append('signature[signer_email]', signerData.signerEmail);

      // Add signatures
      Object.entries(signatures).forEach(([fieldId, signatureData], index) => {
        const field = fields.find(f => f.id.toString() === fieldId);
        formData.append(`signature[signatures_attributes][${index}][field_id]`, fieldId);
        formData.append(`signature[signatures_attributes][${index}][signature_data]`, signatureData);
        formData.append(`signature[signatures_attributes][${index}][position_x]`, (field?.position_x || 0).toString());
        formData.append(`signature[signatures_attributes][${index}][position_y]`, (field?.position_y || 0).toString());
        formData.append(`signature[signatures_attributes][${index}][width]`, (field?.width || 100).toString());
        formData.append(`signature[signatures_attributes][${index}][height]`, (field?.height || 100).toString());
      });

      // Add type fields
      Object.entries(formValues).forEach(([name, value], index) => {
        const field = fields.find(f => f.name === name);
        formData.append(`signature[type_fields_attributes][${index}][name]`, name);
        formData.append(`signature[type_fields_attributes][${index}][value]`, value);
        formData.append(`signature[type_fields_attributes][${index}][position_x]`, (field?.position_x || 0).toString());
        formData.append(`signature[type_fields_attributes][${index}][position_y]`, (field?.position_y || 0).toString());
        formData.append(`signature[type_fields_attributes][${index}][width]`, (field?.width || 100).toString());
        formData.append(`signature[type_fields_attributes][${index}][height]`, (field?.height || 100).toString());
      });

      // Log the form data for debugging
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      // Send the data
      const response = await publicAxios.post(
        `/api/v1/forms/${formId}/signatures/${currentFieldId}/sign`,
        formData
      );
      
      console.log('Response:', response.data);
      
      // Save the signed PDF URL
      if (response.data.signed_pdf_url) {
        setSignedPdfUrl(response.data.signed_pdf_url);
        alert('Form submitted successfully! You can now download your signed document.');
      } else {
        throw new Error('No signed PDF URL received');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to submit form: ${error.response?.data?.details || error.message}`);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading form data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchFormData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!formData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>No form data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', margin: '0 auto' }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Signer Information
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              {...register('signerName')}
              error={!!errors.signerName}
              helperText={errors.signerName?.message}
              fullWidth
            />
            <TextField
              label="Email"
              {...register('signerEmail')}
              error={!!errors.signerEmail}
              helperText={errors.signerEmail?.message}
              fullWidth
            />
          </Stack>
        </Box>

        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          {pdfError ? (
            <Typography color="error">{pdfError}</Typography>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <Document
                file={`${import.meta.env.VITE_API_URL}${formData.file_url}`}
                onLoadSuccess={handleDocumentLoadSuccess}
                onLoadError={handleDocumentLoadError}
                loading={<Typography>Loading PDF document...</Typography>}
              >
                <div style={{ position: 'relative' }}>
                  <Page
                    pageNumber={pageNumber}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    scale={1}
                  />
                  {fields
                    .filter((field) => field.page_number === pageNumber)
                    .map((field) => renderField(field))}
                </div>
              </Document>
            </Box>
          )}
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

        <form onSubmit={handleSubmit(handleSubmitForm)}>
          <Stack spacing={2}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={
                fields.filter((f) => f.signature_type === 'draw').length !==
                Object.keys(signatures).length
              }
            >
              Submit Form
            </Button>

            {signedPdfUrl && (
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={() => window.open(signedPdfUrl, '_blank')}
              >
                Download Signed Document
              </Button>
            )}
          </Stack>
        </form>
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
              ref={handleSignaturePadRef}
              canvasProps={{
                width: 550,
                height: 200,
                style: { width: '100%', height: '200px' },
              }}
            />
          </Box>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={handleClearSignature}>Clear</Button>
            <Button
              variant="contained"
              onClick={handleSignatureSave}
              disabled={!hasSignature}
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
