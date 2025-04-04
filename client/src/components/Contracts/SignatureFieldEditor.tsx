import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography, IconButton, Paper, Button } from '@mui/material';
import React, { useRef, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import Draggable, { DraggableEventHandler, DraggableData } from 'react-draggable';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import axiosInstance from '../../axiosInstance';

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
  isSaved?: boolean;
}

interface SignatureFieldEditorProps {
  pdfUrl: string;
  formId: number;
  onSave?: (fields: SignatureField[]) => void;
  initialFields?: SignatureField[];
}

const fieldDimensions: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 200, height: 35 },
  initial: { width: 100, height: 35 },
  name: { width: 200, height: 30 },
  date: { width: 150, height: 30 },
};

export const SignatureFieldEditor: React.FC<SignatureFieldEditorProps> = ({
  pdfUrl,
  formId,
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
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  useEffect(() => {
    console.log("initialFields", initialFields)
    if (initialFields.length > 0) {
      setSignatureFields(initialFields);
    }
  }, [initialFields]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleClickOnPdf = (e: React.MouseEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest('.signature-field')) {
      return;
    }

    if (!containerRef.current) return;

    const pdfPage = containerRef.current.querySelector('.react-pdf__Page');
    if (!pdfPage) return;

    const pdfRect = pdfPage.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft || 0;
    const scrollTop = containerRef.current.scrollTop || 0;

    const x = ((e.clientX - pdfRect.left + scrollLeft) / scale);
    const y = ((e.clientY - pdfRect.top + scrollTop) / scale);

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
      { pageNum, x, y, width, height, type, id: Date.now(), isSaved: false },
    ];
    setSignatureFields(newFields);
  };

  const handleDeleteField = async (id: number) => {
    
    const field = signatureFields.find(field => field.id === id);
    console.log("meow", signatureFields, id, field)
    if (!field?.id) return;

    if (!field.isSaved) {
      console.log("this?")
      const newFields = signatureFields.filter(field => field.id !== id);
      setSignatureFields(newFields);
      return;
    }

    try {
      console.log("here???")
      await axiosInstance.delete(`/api/v1/forms/${formId}/signatures/${id}`);
      const newFields = signatureFields.filter(field => field.id !== id);
      setSignatureFields(newFields);
    } catch (error) {
      console.error('Error deleting signature field:', error);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(signatureFields);
      const savedFields = signatureFields.map(field => ({ ...field, isSaved: true }));
      setSignatureFields(savedFields);
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

  const handleDragStop: DraggableEventHandler = (e, data: DraggableData) => {
    if (!containerRef.current || !activeDragId) return;

    const newFields = signatureFields.map(field => {
      if (field.id === activeDragId) {
        return {
          ...field,
          x: data.x / scale,
          y: data.y / scale,
          pageNum: pageNumber
        };
      }
      return field;
    });

    setSignatureFields(newFields);
    
    axiosInstance.patch(`/api/v1/forms/${formId}/signatures/${activeDragId}`, {
      signature: {
        position_x: data.x / scale,
        position_y: data.y / scale,
        page_number: pageNumber
      }
    }).catch(error => {
      console.error('Error updating signature field position:', error);
    });

    setActiveDragId(null);
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
        <Box 
          ref={containerRef} 
          position="relative" 
          onClick={handleClickOnPdf} 
          sx={{ 
            position: 'relative',
            '& .react-pdf__Document': {
              '& .react-pdf__Page': {
                position: 'relative',
                backgroundColor: 'white'
              }
            }
          }}
        >
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
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              '& > *': {
                pointerEvents: 'auto'
              }
            }}
          >
            {!isLoading && signatureFields
              .filter(field => field.pageNum === pageNumber)
              .map((field) => (
                <Draggable
                  key={field.id}
                  position={{
                    x: field.x * scale,
                    y: field.y * scale
                  }}
                  onStart={() => setActiveDragId(field.id)}
                  onStop={handleDragStop}
                  bounds="parent"
                  scale={scale}
                  cancel=".delete-button"
                >
                  <Box
                    className="signature-field"
                    position="absolute"
                    width={`${field.width * scale}px`}
                    height={`${field.height * scale}px`}
                    border="2px dashed red"
                    bgcolor="rgba(255, 255, 255, 0.9)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      cursor: 'move',
                      zIndex: 1000,
                      backdropFilter: 'blur(2px)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                      },
                    }}
                  >
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      width="100%"
                      position="relative"
                      sx={{ p: 1 }}
                    >
                      <IconButton
                        className="delete-button"
                        size="small"
                        onClick={(e) => {
                          handleDeleteField(field.id);
                        }}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: 'background.paper',
                          zIndex: 1001,
                          padding: '4px',
                          boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                          '&:hover': {
                            bgcolor: 'error.light',
                            color: 'white',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                        {getFieldLabel(field)}
                      </Typography>
                    </Box>
                  </Box>
                </Draggable>
              ))}
          </Box>
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
