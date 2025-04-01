import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  IconButton, 
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DrawIcon from '@mui/icons-material/Draw';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

type FieldType = 'signature' | 'initial' | 'name' | 'date' | 'text';

interface SignatureField {
  id: string;
  x: number;
  y: number;
  pageNumber: number;
  type: FieldType;
  label?: string;
}

interface SignatureFieldEditorProps {
  pdfUrl: string;
  onSave: (fields: SignatureField[]) => void;
}

const fieldTypeConfig: Record<FieldType, { icon: JSX.Element, label: string, width: number }> = {
  signature: { 
    icon: <DriveFileRenameOutlineIcon />, 
    label: 'Signature',
    width: 200
  },
  initial: { 
    icon: <DrawIcon />, 
    label: 'Initial',
    width: 100
  },
  name: { 
    icon: <TextFieldsIcon />, 
    label: 'Full Name',
    width: 200
  },
  date: { 
    icon: <CalendarTodayIcon />, 
    label: 'Date',
    width: 150
  },
  text: { 
    icon: <TextFieldsIcon />, 
    label: 'Text Field',
    width: 200
  }
};

const SignatureFieldEditor: React.FC<SignatureFieldEditorProps> = ({ pdfUrl, onSave }) => {
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>('signature');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);

    return () => {
      window.removeEventListener('resize', updateContainerSize);
    };
  }, []);

  const handleFieldTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newFieldType: FieldType | null,
  ) => {
    if (newFieldType !== null) {
      setSelectedFieldType(newFieldType);
    }
  };

  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newField: SignatureField = {
      id: Date.now().toString(),
      x,
      y,
      pageNumber: 1,
      type: selectedFieldType,
      label: selectedFieldType === 'text' ? 'Enter text' : undefined
    };

    setSignatureFields([...signatureFields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setSignatureFields(signatureFields.filter(field => field.id !== id));
  };

  const handleSave = () => {
    onSave(signatureFields);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Add Form Fields</Typography>
          <ToggleButtonGroup
            value={selectedFieldType}
            exclusive
            onChange={handleFieldTypeChange}
            size="small"
          >
            {Object.entries(fieldTypeConfig).map(([type, config]) => (
              <ToggleButton key={type} value={type}>
                <Tooltip title={config.label}>
                  {config.icon}
                </Tooltip>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
        >
          Save Fields
        </Button>
      </Box>

      <Box 
        ref={containerRef}
        sx={{ 
          flex: 1, 
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid #ccc',
          borderRadius: 1,
          backgroundColor: '#f5f5f5',
        }}
      >
        <Box
          onClick={handlePageClick}
          sx={{ 
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'auto'
          }}
        >
          <Box sx={{ 
            position: 'relative', 
            width: '100%',
            height: '100%',
            '& iframe': {
              width: '100%',
              height: '100%',
              border: 'none'
            }
          }}>
            <iframe 
              src={`${pdfUrl}#toolbar=0&view=FitH`}
              title="PDF Viewer"
              onLoad={() => setLoading(false)}
            />
            {signatureFields.map(field => {
              const config = fieldTypeConfig[field.type];
              return (
                <Paper
                  key={field.id}
                  elevation={2}
                  sx={{
                    position: 'absolute',
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    transform: 'translate(-50%, -50%)',
                    border: '2px dashed #1976d2',
                    padding: '10px',
                    width: config.width,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    zIndex: 10,
                    cursor: 'move',
                  }}
                >
                  {config.icon}
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {config.label}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveField(field.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Paper>
              );
            })}
          </Box>
        </Box>
        {loading && (
          <Box 
            sx={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SignatureFieldEditor; 