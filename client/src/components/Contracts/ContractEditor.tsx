import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { SignatureFieldEditor } from './SignatureFieldEditor';
import type { SignatureField } from './SignatureFieldEditor';
import axiosInstance from '../../axiosInstance';
import { useNotification } from '../../context/NotificationContext';

interface ContractEditorProps {
  pdfUrl: string;
  formUuid: string;
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
    pageNum: signature.page_number,
    x: signature.position_x,
    y: signature.position_y,
    width: type === 'initial' ? 100 : 200,
    height: type === 'name' || type === 'date' ? 20 : 20,
    type,
  };
};

export const ContractEditor: React.FC<ContractEditorProps> = ({ pdfUrl, formUuid }) => {
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [_isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    const loadSignatureFields = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`/api/v1/forms/${formUuid}/signatures`);

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
        showNotification('Failed to load existing signature fields', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadSignatureFields();
  }, [formUuid]);

  const handleSaveFields = async (updatedFields: SignatureField[]) => {
    try {
      setIsLoading(true);

      const response = await axiosInstance.post(`/api/v1/forms/${formUuid}/signatures`, {
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
      showNotification('Signature fields saved successfully', 'success');
    } catch (error) {
      showNotification('Failed to save signature fields', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <SignatureFieldEditor
        pdfUrl={pdfUrl}
        formUuid={formUuid}
        onSave={handleSaveFields}
        initialFields={fields}
      />
    </Box>
  );
}; 