import React, { useState } from 'react';
import { Container, Typography, TextField, MenuItem, Button, Modal, Box } from '@mui/material';
import { getUI } from '../data/getUI';
import type { UI } from '../data/uiConfigTypes';

// Helper to load text files dynamically
async function loadTextFile(path: string): Promise<string> {
  // Use import.meta.glob to get the correct file URL for Vite static assets
  const txtFiles = import.meta.glob('/src/data/**/*.txt', { query: '?raw', import: 'default', eager: true });
  // Normalize path to match the keys in txtFiles
  let normalizedPath = path.replace(/^src\//, '/src/').replace(/^src\//, '/src/').replace(/\\/g, '/');
  if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;
  const content = txtFiles[normalizedPath];
  if (typeof content === 'string') return content;
  throw new Error(`Text file not found: ${normalizedPath}`);
}

interface UIPageProps {
  selectedUI: string;
}

const UIpage: React.FC<UIPageProps> = ({ selectedUI }) => {
  const uiData = getUI(selectedUI) as UI | undefined;
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  // const [loadingPrompt, setLoadingPrompt] = useState(false);

  if (!uiData) {
    return <Typography color="error">No UI found for: {selectedUI}</Typography>;
  }

  // Handle input changes
  const handleInputChange = (ref: string, value: any) => {
    setFormState((prev) => ({ ...prev, [ref]: value }));
  };

  // Generate prompt using template and text files
  const handleGeneratePrompt = async () => {
    // setLoadingPrompt(true); // removed unused loadingPrompt state
    // Load template and fragments using Vite's import.meta.glob
    const basePath = `src/data/${selectedUI}/`;
    const templatePath = basePath + 'template.txt';
    const fragments = uiData.fragments;
    const fragmentContents: Record<string, string> = {};
    for (const [key, relPath] of Object.entries(fragments)) {
      fragmentContents[key] = await loadTextFile(basePath + relPath.split('/').pop());
    }
    const template = await loadTextFile(templatePath);
    // Replace placeholders in template (use replace with regex for compatibility)
    let prompt = template;
    Object.entries(formState).forEach(([key, value]) => {
      const re = new RegExp(`{{${key}}}`, 'g');
      prompt = prompt.replace(re, value || '');
    });
    Object.entries(fragmentContents).forEach(([key, value]) => {
      const re = new RegExp(`{{${key}}}`, 'g');
      prompt = prompt.replace(re, value);
    });
    setGeneratedPrompt(prompt);
    setModalOpen(true);
    // setLoadingPrompt(false); // removed unused loadingPrompt state
  };

  // Copy prompt to clipboard
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPrompt);
  };

  // Save prompt as markdown
  const handleSavePrompt = () => {
    const blob = new Blob([generatedPrompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedUI}_prompt.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save input as JSON
  const handleSaveInput = () => {
    const blob = new Blob([JSON.stringify(formState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedUI}_input.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Modal style
  const modalStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    minWidth: 350,
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflow: 'auto',
  };

  // Check if all required fields are filled
  const allRequiredFilled = Object.values(uiData.ui).every((section) =>
    section.components.every((comp) => {
      if (!comp.required) return true;
      const value = formState[comp.ref];
      return value !== undefined && value !== '';
    })
  );

  return (
    <Container sx={{ 
        top: 0,
        minWidth: { xs:"95vw", sm:"80vw", md:"70vw", lg:"60vw" },
        maxWidth: { xs:"98vw", sm:"94vw", md:"92vw", lg:"90vw" },
    }}>
      {Object.entries(uiData.ui).map(([sectionKey, section]) => {
        const colorArr = uiData.colors[section.color] || uiData.colors.bg || [undefined, undefined];
        const [backgroundColor, textColor, inputBgColor, inputTextColor] = colorArr;
        // Render topbar as a fixed AppBar if fixed is true
        if (sectionKey === 'topbar' && section.fixed) {
          return (
            <Box key={sectionKey} sx={{ position: 'sticky', top: 0, zIndex: 1200, background: backgroundColor, color: textColor, borderRadius: 0, boxShadow: 1, paddingLeft: 2, paddingRight: "7em", py: 1, width: '100vw', left: 0, right: 0, marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                {section.components.map((comp) => {
                  if (comp.type === 'textinput') {
                    return (
                      <TextField
                        key={comp.ref}
                        label={comp.label}
                        required={comp.required}
                        value={formState[comp.ref] || ''}
                        variant="filled"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(comp.ref, e.target.value)}
                        size="small"
                        sx={{ minWidth: 180 }}
                        slotProps={{
                          input: { style: { color: inputTextColor, background: inputBgColor } },
                          inputLabel: { style: { color: inputTextColor } }
                        }}
                      />
                    );
                  }
                  if (comp.type === 'dropdown') {
                    return (
                      <TextField
                        key={comp.ref}
                        label={comp.label}
                        required={comp.required}
                        select
                        value={formState[comp.ref] || ''}
                        variant="filled"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(comp.ref, e.target.value)}
                        size="small"
                        sx={{ minWidth: 180, paddingTop: 0, paddingBottom: 0 }}
                        slotProps={{
                          input: { style: { color: inputTextColor, background: inputBgColor } },
                          inputLabel: { style: { color: inputTextColor } }
                        }}
                        SelectProps={{
                          MenuProps: {
                            PaperProps: {
                              sx: {
                                margin: 0,
                                boxShadow: 'none',
                                borderRadius: 0,
                                background: inputBgColor,
                                border: `2px solid ${inputTextColor}`,
                              },
                              elevation: 0,
                            },
                            MenuListProps: {
                              sx: {
                                paddingTop: 0,
                                paddingBottom: 0,
                              },
                            },
                          },
                        }}
                      >
                        {(comp.options || []).map((option, idx, arr) => (
                          <MenuItem
                            key={option}
                            value={option}
                            style={{
                              color: inputTextColor,
                              background: inputBgColor,
                              borderBottom: idx !== arr.length - 1 ? `1px solid ${inputTextColor}` : undefined,
                              // No border on last item
                            }}
                          >
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    );
                  }
                  return null;
                })}
              </Box>
            </Box>
          );
        }
        return (
          <section
            key={sectionKey}
            style={{
              marginTop: 32,
              background: backgroundColor,
              color: textColor,
              borderRadius: 8,
              padding: 24,
            }}
          >
            {section.header && (
              <Typography variant="h6" gutterBottom sx={{ color: textColor }}>{section.header}</Typography>
            )}
            {section.components.map((comp) => {
              if (comp.type === 'textinput') {
                return (
                  <TextField
                    key={comp.ref}
                    label={comp.label}
                    required={comp.required}
                    variant="filled"
                    fullWidth
                    margin="normal"
                    value={formState[comp.ref] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(comp.ref, e.target.value)}
                    slotProps={{
                      input: { style: { color: inputTextColor, background: inputBgColor } },
                      inputLabel: { style: { color: inputTextColor } }
                    }}
                  />
                );
              }
              if (comp.type === 'dropdown') {
                return (
                  <TextField
                    key={comp.ref}
                    label={comp.label}
                    required={comp.required}
                    select
                    fullWidth
                    margin="normal"
                    value={formState[comp.ref] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(comp.ref, e.target.value)}
                    slotProps={{
                      input: { style: { color: inputTextColor, background: inputBgColor } },
                      inputLabel: { style: { color: textColor } }
                    }}
                  >
                    {(comp.options || []).map((option, idx, arr) => (
                      <MenuItem
                        key={option}
                        value={option}
                        style={{
                          color: inputTextColor,
                          background: inputBgColor,
                          borderBottom: idx !== arr.length - 1 ? `1px solid ${inputTextColor}` : undefined,
                          // No border on last item
                        }}
                      >
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }
              if (comp.type === 'textarea') {
                return (
                  <TextField
                    key={comp.ref}
                    label={comp.label}
                    required={comp.required}
                    fullWidth
                    margin="normal"
                    multiline
                    minRows={3}
                    variant="filled"
                    value={formState[comp.ref] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(comp.ref, e.target.value)}
                    slotProps={{
                      input: { style: { color: inputTextColor, background: inputBgColor } },
                      inputLabel: { style: { color: inputTextColor } }
                    }}
                  />
                );
              }
              return null;
            })}
          </section>
        );
      })}
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleGeneratePrompt} disabled={!allRequiredFilled}>
        Generate Prompt
      </Button>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>Generated Prompt</Typography>
          <Box sx={{ whiteSpace: 'pre-wrap', mb: 2, maxHeight: 300, overflow: 'auto', background: '#f5f5f5', p: 2, borderRadius: 2 }}>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', background: 'none', margin: 0 }}>
              {generatedPrompt}
            </div>
          </Box>
          <Button onClick={handleCopy} sx={{ mr: 1 }}>Copy</Button>
          <Button onClick={handleSavePrompt} sx={{ mr: 1 }}>Save Prompt</Button>
          <Button onClick={handleSaveInput} sx={{ mr: 1 }}>Save Input</Button>
          <Button onClick={() => setModalOpen(false)} color="secondary">Close</Button>
        </Box>
      </Modal>
    </Container>
  );
};

export default UIpage;
