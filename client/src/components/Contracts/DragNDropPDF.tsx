import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DropResult,
    Droppable,
    DroppableProvided,
} from '@hello-pangea/dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
    Box,
    Button,
    List,
    ListItem,
    Modal,
    Stack,
    Typography,
} from '@mui/material';
import React from 'react';

interface DragNDropPDFProps {
  files: File[];
  setFiles: (files: File[]) => void;
  isUploading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleFileUpload: () => void;
  handleRemoveFile: (file: File) => void;
}

const DragNDropPDF: React.FC<DragNDropPDFProps> = ({
  files,
  setFiles,
  isUploading,
  isOpen,
  setIsOpen,
  handleFileUpload,
  handleRemoveFile,
}) => {
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFiles(items);
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    height: '90vh',
    maxWidth: '1200px',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Arrange PDFs in desired order
        </Typography>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="pdfs">
                {(provided: DroppableProvided) => (
                  <List
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    sx={{ mb: 2 }}
                  >
                    {files.map((file, index) => (
                      <Draggable
                        key={file.name}
                        draggableId={file.name}
                        index={index}
                      >
                        {(provided: DraggableProvided) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              bgcolor: 'grey.100',
                              mb: 1,
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              cursor: 'default',
                              userSelect: 'none'
                            }}
                          >
                            <Box
                              {...provided.dragHandleProps}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'grab',
                                '&:active': { cursor: 'grabbing' }
                              }}
                            >
                              <DragIndicatorIcon sx={{ mr: 2, color: 'grey.500' }} />
                            </Box>
                            <Typography>{file.name}</Typography>
                            <Button 
                              onClick={() => handleRemoveFile(file)}
                              sx={{ ml: 'auto' }}
                              color="error"
                            >
                              Remove
                            </Button>
                          </ListItem>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </DragDropContext>
          </Box>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleFileUpload}
            disabled={isUploading}
          >
            Upload
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default DragNDropPDF;
