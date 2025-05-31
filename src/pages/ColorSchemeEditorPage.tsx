import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import { Add, Edit, Delete, Save, Cancel, Palette, ContentCopy } from '@mui/icons-material';
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, limit, query } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../App';

// Types for color scheme data
interface ColorScheme {
  id?: string;
  title: string;
  colors: {
    c1: [string, string, string?, string?];
    c2: [string, string, string?, string?];
    c3: [string, string, string?, string?];
    c4: [string, string, string?, string?];
    c5: [string, string, string?, string?];
    modal: [string, string, string?, string?, string?, string?, string?, string?];
    bg: [string, string, string?, string?];
  };
}

const ColorSchemeEditorPage: React.FC = () => {
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme | null>(null);
  const [editingScheme, setEditingScheme] = useState<ColorScheme | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewScheme, setIsNewScheme] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const db = getFirestore(app, 'promptor-db');
  const auth = getAuth();

  // Load color schemes from Firestore
  useEffect(() => {
    const loadColorSchemes = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'colorSchemes'), limit(12));
        const querySnapshot = await getDocs(q);
        const schemes: ColorScheme[] = [];
        
        querySnapshot.forEach((doc) => {
          schemes.push({ id: doc.id, ...doc.data() } as ColorScheme);
        });
        
        setColorSchemes(schemes);
        if (schemes.length > 0 && !selectedScheme) {
          setSelectedScheme(schemes[0]);
        }
      } catch (err) {
        setError('Failed to load color schemes');
        console.error('Error loading color schemes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadColorSchemes();
  }, [db]);

  // Create a new color scheme
  const createNewScheme = () => {
    const newScheme: ColorScheme = {
      title: 'New Color Scheme',
      colors: {
        c1: ['#6f1d1b', '#ffe6a7', '#ffe6a7', '#000000'],
        c2: ['#99582a', '#ffe6a7', '#ffe6a7', '#000000'],
        c3: ['#432818', '#ffe6a7', '#ffe6a7', '#000000'],
        c4: ['#bb9457', '#000000', '#ffffff', '#000000'],
        c5: ['#ffe6a7', '#000000', '#ffffff', '#000000'],
        modal: ['#6f1d1b', '#ffe6a7', '#bbbbbb', '#000000', '#ffce54', '#000000', '#ffde6a', '#000000'],
        bg: ['#432818', '#d8d8d8', '#ffffff', '#000000']
      }
    };
    setEditingScheme(newScheme);
    setIsNewScheme(true);
    setIsDialogOpen(true);
  };

  // Edit existing scheme
  const editScheme = (scheme: ColorScheme) => {
    setEditingScheme({ ...scheme });
    setIsNewScheme(false);
    setIsDialogOpen(true);
  };

  // Save scheme to Firestore
  const saveScheme = async () => {
    if (!editingScheme || !auth.currentUser) return;

    try {
      setSaving(true);
      
      if (isNewScheme) {
        const docRef = await addDoc(collection(db, 'colorSchemes'), {
          title: editingScheme.title,
          colors: editingScheme.colors,
          createdBy: auth.currentUser.uid,
          createdAt: new Date()
        });
        const newScheme = { ...editingScheme, id: docRef.id };
        setColorSchemes(prev => [...prev, newScheme]);
        setSelectedScheme(newScheme);
      } else if (editingScheme.id) {
        await updateDoc(doc(db, 'colorSchemes', editingScheme.id), {
          title: editingScheme.title,
          colors: editingScheme.colors,
          updatedAt: new Date()
        });
        setColorSchemes(prev => 
          prev.map(scheme => 
            scheme.id === editingScheme.id ? editingScheme : scheme
          )
        );
        if (selectedScheme?.id === editingScheme.id) {
          setSelectedScheme(editingScheme);
        }
      }
      
      setIsDialogOpen(false);
      setEditingScheme(null);
    } catch (err) {
      setError('Failed to save color scheme');
      console.error('Error saving color scheme:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete scheme
  const deleteScheme = async (schemeId: string) => {
    if (!schemeId) return;
    
    try {
      await deleteDoc(doc(db, 'colorSchemes', schemeId));
      setColorSchemes(prev => prev.filter(scheme => scheme.id !== schemeId));
      if (selectedScheme?.id === schemeId) {
        setSelectedScheme(colorSchemes.find(s => s.id !== schemeId) || null);
      }
    } catch (err) {
      setError('Failed to delete color scheme');
      console.error('Error deleting color scheme:', err);
    }
  };

  // Update color in editing scheme
  const updateColor = (colorKey: keyof ColorScheme['colors'], index: number, value: string) => {
    if (!editingScheme) return;
    
    const newColors = { ...editingScheme.colors };
    const colorArray = [...newColors[colorKey]];
    colorArray[index] = value;
    newColors[colorKey] = colorArray as any;
    
    setEditingScheme({
      ...editingScheme,
      colors: newColors
    });
  };

  // Color input component
  const ColorInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
  }> = ({ label, value, onChange }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Typography variant="body2" sx={{ minWidth: 80, fontSize: '0.75rem' }}>
        {label}:
      </Typography>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 40,
          height: 30,
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      />
      <TextField
        size="small"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        sx={{ width: 100 }}
        inputProps={{ style: { fontSize: '0.75rem' } }}
      />
      <IconButton 
        size="small" 
        onClick={() => navigator.clipboard.writeText(value)}
        title="Copy hex code"
      >
        <ContentCopy fontSize="small" />
      </IconButton>
    </Box>
  );

  // Preview component showing how colors look when applied
  const ColorPreview: React.FC<{ scheme: ColorScheme }> = ({ scheme }) => {
    const { colors } = scheme;
    
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Preview: {scheme.title}</Typography>
        
        {/* Background simulation */}
        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            backgroundColor: colors.bg[0], 
            color: colors.bg[1],
            border: `1px solid ${colors.bg[3] || '#ccc'}`
          }}
        >
          <Typography variant="body2">Background (bg)</Typography>
          
          {/* Component sections simulation */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            {(['c1', 'c2', 'c3', 'c4', 'c5'] as const).map((colorKey) => (
              <Box key={colorKey} sx={{ flex: '1 1 250px', minWidth: 220, maxWidth: 350 }}>
                <Paper
                  sx={{
                    p: 1.5,
                    backgroundColor: colors[colorKey][0],
                    color: colors[colorKey][1],
                    border: `1px solid ${colors[colorKey][3] || 'transparent'}`
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Section {colorKey.toUpperCase()}
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Input field"
                    variant="filled"
                    fullWidth
                    sx={{
                      '& .MuiFilledInput-root': {
                        backgroundColor: colors[colorKey][2] || colors[colorKey][0],
                        color: colors[colorKey][3] || colors[colorKey][1],
                        fontSize: '0.75rem'
                      }
                    }}
                  />
                </Paper>
              </Box>
            ))}
          </Box>
          
          {/* Modal simulation */}
          <Paper
            sx={{
              p: 2,
              mt: 2,
              backgroundColor: colors.modal[0],
              color: colors.modal[1],
              border: `2px solid ${colors.modal[2] || '#ccc'}`
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Modal Preview
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                sx={{
                  backgroundColor: colors.modal[4] || colors.modal[0],
                  color: colors.modal[5] || colors.modal[1],
                  '&:hover': {
                    backgroundColor: colors.modal[6] || colors.modal[4] || colors.modal[0],
                    color: colors.modal[7] || colors.modal[5] || colors.modal[1]
                  }
                }}
              >
                Button
              </Button>
            </Box>
          </Paper>
        </Paper>
      </Box>
    );
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading color schemes...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
          Color Scheme Editor
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={createNewScheme}
          sx={{ backgroundColor: '#4caf50' }}
        >
          New Scheme
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Scheme selection */}
        <Box sx={{ flex: '1 1 340px', minWidth: 300, maxWidth: 420 }}>
          <Typography variant="h6" gutterBottom>Available Schemes</Typography>
          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            {colorSchemes.map((scheme) => (
              <Card
                key={scheme.id}
                sx={{
                  mb: 2,
                  cursor: 'pointer',
                  border: selectedScheme?.id === scheme.id ? '2px solid #1976d2' : '1px solid #ccc',
                  '&:hover': { boxShadow: 3 }
                }}
                onClick={() => setSelectedScheme(scheme)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="h6" gutterBottom>{scheme.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(scheme.colors).map(([key, colors]) => (
                      <Chip
                        key={key}
                        label={key}
                        size="small"
                        sx={{
                          backgroundColor: colors[0],
                          color: colors[1],
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={(e) => {
                      e.stopPropagation();
                      editScheme(scheme);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Delete />}
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (scheme.id && window.confirm('Delete this color scheme?')) {
                        deleteScheme(scheme.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Preview */}
        <Box sx={{ flex: '2 1 600px', minWidth: 320, maxWidth: '100%' }}>
          {selectedScheme ? (
            <ColorPreview scheme={selectedScheme} />
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Select a color scheme to preview
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isNewScheme ? 'Create New Color Scheme' : 'Edit Color Scheme'}
        </DialogTitle>
        <DialogContent>
          {editingScheme && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Scheme Title"
                value={editingScheme.title}
                onChange={(e) =>
                  setEditingScheme({ ...editingScheme, title: e.target.value })
                }
                sx={{ mb: 3 }}
              />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.entries(editingScheme.colors).map(([colorKey, colorArray]) => (
                  <Box key={colorKey} sx={{ flex: '1 1 320px', minWidth: 220, maxWidth: 400 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {colorKey.toUpperCase()}
                        {colorKey === 'bg' && ' (Background)'}
                        {colorKey === 'modal' && ' (Modal/Buttons)'}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      {colorArray.map((color, index) => {
                        const labels = {
                          modal: ['Background', 'Text', 'Border', 'Input Text', 'Button BG', 'Button Text', 'Hover BG', 'Hover Text'],
                          default: ['Background', 'Text', 'Input BG', 'Input Text']
                        };
                        const labelArray = colorKey === 'modal' ? labels.modal : labels.default;
                        
                        return color !== undefined ? (
                          <ColorInput
                            key={index}
                            label={labelArray[index] || `Color ${index + 1}`}
                            value={color}
                            onChange={(value) => updateColor(colorKey as keyof ColorScheme['colors'], index, value)}
                          />
                        ) : null;
                      })}
                    </Paper>
                  </Box>
                ))}
              </Box>

              {/* Preview in dialog */}
              {editingScheme && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Live Preview</Typography>
                  <ColorPreview scheme={editingScheme} />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button
            onClick={saveScheme}
            variant="contained"
            startIcon={<Save />}
            disabled={saving || !editingScheme?.title.trim()}
          >
            {saving ? <CircularProgress size={20} /> : (isNewScheme ? 'Create' : 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ColorSchemeEditorPage;