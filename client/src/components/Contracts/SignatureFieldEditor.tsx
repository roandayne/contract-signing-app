import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography, IconButton, Paper, Button } from '@mui/material';
import React, { useRef, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export type FieldType = 'signature' | 'initial' | 'name' | 'date';

export interface SignatureField {
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  id: number;
}

interface SignatureFieldEditorProps {
  pdfUrl: string;
  onSave?: (fields: SignatureField[]) => void;
  initialFields?: SignatureField[];
}

const fieldDimensions: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 200, height: 50 },
  initial: { width: 100, height: 50 },
  name: { width: 200, height: 40 },
  date: { width: 150, height: 40 },
};

export const SignatureFieldEditor: React.FC<SignatureFieldEditorProps> = ({
  pdfUrl,
  onSave,
  initialFields = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>(initialFields);
  const [pdfError, setPdfError] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>('signature');
  const [scale, setScale] = useState(1);

  // Load initial fields if provided
  useEffect(() => {
    if (initialFields.length > 0) {
      setSignatureFields(initialFields);
    }
  }, [initialFields]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleClickOnPdf = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Add field at clicked position with dimensions based on type
    const { width, height } = fieldDimensions[selectedFieldType];
    addSignatureField(pageNumber, x, y, width, height, selectedFieldType);
  };

  const addSignatureField = (
    pageNum: number,
    x: number,
    y: number,
    width: number,
    height: number,
    type: FieldType
  ): void => {
    const newFields = [
      ...signatureFields,
      { pageNum, x, y, width, height, type, id: Date.now() },
    ];
    setSignatureFields(newFields);
    if (onSave) {
      onSave(newFields);
    }
  };

  const handleDeleteField = (id: number) => {
    const newFields = signatureFields.filter(field => field.id !== id);
    setSignatureFields(newFields);
    if (onSave) {
      onSave(newFields);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(signatureFields);
    }
  };

  const handleFieldTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newFieldType: FieldType | null
  ) => {
    if (newFieldType !== null) {
      setSelectedFieldType(newFieldType);
    }
  };

  const getFieldLabel = (field: SignatureField): string => {
    switch (field.type) {
      case 'signature':
        return 'Signature';
      case 'initial':
        return 'Initial';
      case 'name':
        return 'Full Name';
      case 'date':
        return 'Date';
      default:
        return '';
    }
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages);
    });
  };

  const handleZoom = (delta: number) => {
    setScale(prevScale => {
      const newScale = prevScale + delta;
      return Math.min(Math.max(0.5, newScale), 2);
    });
  };

  return (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Select field type:
          </Typography>
          <ToggleButtonGroup
            value={selectedFieldType}
            exclusive
            onChange={handleFieldTypeChange}
            aria-label="field type"
            size="small"
          >
            <ToggleButton value="signature" aria-label="signature">
              Signature
            </ToggleButton>
            <ToggleButton value="initial" aria-label="initial">
              Initial
            </ToggleButton>
            <ToggleButton value="name" aria-label="name">
              Name
            </ToggleButton>
            <ToggleButton value="date" aria-label="date">
              Date
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => handleZoom(-0.1)} size="small">
            <ZoomOutIcon />
          </IconButton>
          <Typography variant="body2">
            {Math.round(scale * 100)}%
          </Typography>
          <IconButton onClick={() => handleZoom(0.1)} size="small">
            <ZoomInIcon />
          </IconButton>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="small"
        >
          Save Fields
        </Button>
      </Box>

      {pdfError && (
        <Box color="error.main" mb={2}>
          Error: {pdfError}
        </Box>
      )}

      <Paper 
        elevation={2} 
        sx={{ 
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <Box ref={containerRef} position="relative" onClick={handleClickOnPdf}>
          {isLoading && (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          )}
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => {
              setPdfError('Failed to load PDF: ' + error.message);
              setIsLoading(false);
            }}
            loading={
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            }
          >
            <Page 
              pageNumber={pageNumber}
              scale={scale}
              loading={
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              }
            />
          </Document>
          {!isLoading && signatureFields
            .filter(field => field.pageNum === pageNumber)
            .map((field) => (
              <Box
                key={field.id}
                position="absolute"
                left={`${field.x * scale}px`}
                top={`${field.y * scale}px`}
                width={`${field.width * scale}px`}
                height={`${field.height * scale}px`}
                border="1px dashed red"
                bgcolor="rgba(255, 0, 0, 0.1)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(255, 0, 0, 0.2)',
                  },
                }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  width="100%"
                  position="relative"
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteField(field.id);
                    }}
                    sx={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'error.light',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" color="textSecondary">
                    {getFieldLabel(field)}
                  </Typography>
                </Box>
              </Box>
            ))}
        </Box>
      </Paper>

      <Box mt={2} display="flex" justifyContent="center" alignItems="center" gap={2}>
        <IconButton 
          onClick={() => changePage(-1)} 
          disabled={pageNumber <= 1}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography>
          Page {pageNumber} of {numPages}
        </Typography>
        <IconButton 
          onClick={() => changePage(1)} 
          disabled={pageNumber >= numPages}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </Box>
  );
};
