import { useState } from 'react';
import { Stack, TextField, IconButton, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import axiosInstance from '../axiosInstance';
import { useNotification } from '../context/NotificationContext';

interface EditableFileNameProps {
  fileName: string;
  formUuid: string;
  onUpdate: (newFileName: string) => void;
}

const EditableFileName = ({ fileName, formUuid, onUpdate }: EditableFileNameProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editedName, setEditedName] = useState(fileName);
  const { showNotification } = useNotification();

  const handleSave = async () => {
    if (editedName.trim() === '') {
      showNotification('File name cannot be empty', 'error');
      return;
    }

    try {
      await axiosInstance.patch(`/api/v1/forms/${formUuid}/update_filename`, {
        file_name: editedName
      });
      
      onUpdate(editedName);
      setIsEditing(false);
      showNotification('File name updated successfully', 'success');
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to update file name', 'error');
      setEditedName(fileName);
    }
  };

  const handleCancel = () => {
    setEditedName(fileName);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 200 }}>
        <TextField
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          size="small"
          autoFocus
          fullWidth
          sx={{ minWidth: 150 }}
        />
        <IconButton size="small" onClick={handleSave} color="primary">
          <CheckIcon />
        </IconButton>
        <IconButton size="small" onClick={handleCancel} color="error">
          <CloseIcon />
        </IconButton>
      </Stack>
    );
  }

  return (
    <Stack 
      direction="row" 
      spacing={1} 
      alignItems="center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{ 
        minWidth: 200,
        '&:hover': {
          cursor: 'pointer',
          '& .edit-icon': {
            opacity: 1,
          }
        }
      }}
    >
      <Typography onClick={() => setIsEditing(true)}>{fileName}</Typography>
      <IconButton 
        size="small" 
        onClick={() => setIsEditing(true)}
        sx={{ 
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
        className="edit-icon"
      >
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
};

export default EditableFileName; 