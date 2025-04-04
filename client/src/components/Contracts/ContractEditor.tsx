import React, { useState, useEffect } from 'react';
import { Box, Button, Snackbar, Alert } from '@mui/material';
import { SignatureFieldEditor } from './SignatureFieldEditor';
import type { SignatureField } from './SignatureFieldEditor';
import axios from 'axios';
import axiosInstance from '../../axiosInstance';

interface ContractEditorProps {
  pdfUrl: string;
  formId: number;
}

type Signature = {
  id: number,
  page_number: number,
  position_x: number,
  position_y: number,
  signature_type: string
}

const convertSignatureToField = (signature: Signature): SignatureField => {
  let type: 'signature' | 'initial' | 'name' | 'date';
  
  switch (signature.signature_type) {
    case 'draw':
      type = 'signature';
      break;
    case 'initial':
      type = 'initial';
      break;
    case 'type':
      type = 'name';
      break;
    case 'date':
      type = 'date';
      break;
    default:
      type = 'signature';
  }

  return {
    id: signature.id,
    pageNum: signature.page_number, // You might need to add page_number to your signature model
    x: signature.position_x,
    y: signature.position_y,
    width: type === 'initial' ? 100 : 200, // Use the same dimensions as in SignatureFieldEditor
    height: type === 'name' || type === 'date' ? 40 : 50,
    type,
  };
};

export const ContractEditor: React.FC<ContractEditorProps> = ({ pdfUrl, formId }) => {
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSignatureFields = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`/api/v1/forms/${formId}/signatures`);

        const convertedFields = response.data.signatures.map((signature: Signature) => {
          const field = convertSignatureToField(signature);
          return {
            ...field,
            isSaved: true
          };
        });
        setFields(convertedFields);
      } catch (error) {
        console.error('Error loading signature fields:', error);
        setError('Failed to load existing signature fields');
      } finally {
        setIsLoading(false);
      }
    };

    loadSignatureFields();
  }, [formId]);

  const handleSaveFields = async (updatedFields: SignatureField[]) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axiosInstance.post(`/api/v1/forms/${formId}/signatures`, {
        signature_fields: updatedFields
      });

      const convertedFields = response.data.signatures.map((signature: Signature) => {
        const field = convertSignatureToField(signature);
        return {
          ...field,
          isSaved: true
        };
      });
      setFields(convertedFields);
      setSuccessMessage('Signature fields saved successfully');
    } catch (error) {
      console.error('Error saving signature fields:', error);
      setError('Failed to save signature fields');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <Box>
      <SignatureFieldEditor
        pdfUrl={pdfUrl}
        formId={formId}
        onSave={handleSaveFields}
        initialFields={fields}
      />
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 