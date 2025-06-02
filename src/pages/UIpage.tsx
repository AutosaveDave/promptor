import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, MenuItem, Button, Modal, Box, CircularProgress } from '@mui/material';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import { app } from '../App';
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
  selectedUI: string; // This is now the Firestore document id
}


const UIpage: React.FC<UIPageProps> = ({ selectedUI }) => {
  const [uiData, setUIData] = useState<UI | null>(null);
  const [loadingUI, setLoadingUI] = useState(true);
  const [formState, setFormState] = useState<Record<string, string | number | undefined>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch UI config from Firestore
  useEffect(() => {
    const fetchUI = async () => {
      setLoadingUI(true);
      setError(null);
      try {
        const db = getFirestore(app, 'promptor-db');
        // Fetch by Firestore document id
        const docRef = collection(db, 'UIs');
        const snapshot = await getDocs(query(docRef));
        const docSnap = snapshot.docs.find(doc => doc.id === selectedUI);
        if (docSnap) {
          // Normalize Firestore data to match expected UI type
          const raw = docSnap.data();
          // Convert sections array to ui object
          let ui: Record<string, any> = {};
          if (Array.isArray(raw.sections)) {
            raw.sections.forEach((section: any, idx: number) => {
              // Use sectionKey as 'topbar' if fixed, else 'section' + idx
              const key = section.fixed ? 'topbar' : `section${idx}`;
              ui[key] = section;
            });
          }
          // Convert colorScheme.colors to colors
          let colors = raw.colors;
          if (!colors && raw.colorScheme && raw.colorScheme.colors) {
            colors = raw.colorScheme.colors;
          }
          // Convert fragments array to object
          let fragments = raw.fragments;
          if (Array.isArray(raw.fragments)) {
            fragments = {};
            raw.fragments.forEach((frag: any) => {
              if (frag.ref && typeof frag.text === 'string') {
                fragments[frag.ref] = frag.text;
              }
            });
          }
          // Compose normalized UI object
          const normalized: UI = {
            ...raw,
            template: raw.template ?? '',
            ui,
            colors,
            fragments,
          };
          setUIData(normalized);
        } else {
          setUIData(null);
          setError('No UI found for id: ' + selectedUI);
        }
      } catch {
        setError('Failed to load UI config');
        setUIData(null);
      } finally {
        setLoadingUI(false);
      }
    };
    fetchUI();
  }, [selectedUI]);

  if (loadingUI) {
    return <Container sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!uiData) {
    return <Typography color="error">No UI found for: {selectedUI}</Typography>;
  }

  // Handle input changes
  const handleInputChange = (ref: string, value: string | number) => {
    setFormState((prev) => ({ ...prev, [ref]: value }));
  };

  // Generate prompt using template and fragments from Firestore config
  const handleGeneratePrompt = async () => {
    // If template/fragments are stored as text in Firestore, use them directly
    // Otherwise, fallback to file-based loading (legacy)
    let template = '';
    let fragmentContents: Record<string, string> = {};
    if (typeof uiData.template === 'string' && uiData.template.trim().length > 0 && !uiData.template.endsWith('.txt')) {
      template = uiData.template;
    } else {
      // fallback: try to load from file (legacy)
      const basePath = `src/data/${selectedUI}/`;
      const templatePath = basePath + 'template.txt';
      template = await loadTextFile(templatePath);
    }
    if (uiData.fragments && Object.values(uiData.fragments).every(f => typeof f === 'string' && f.trim().length > 0 && !f.endsWith('.txt'))) {
      fragmentContents = { ...uiData.fragments };
    } else {
      // fallback: try to load from file (legacy)
      const basePath = `src/data/${selectedUI}/`;
      fragmentContents = {};
      for (const [key, relPath] of Object.entries(uiData.fragments)) {
        fragmentContents[key] = await loadTextFile(basePath + relPath.split('/').pop());
      }
    }
    // Replace placeholders in template (use replace with regex for compatibility)
    let prompt = template;
    Object.entries(formState).forEach(([key, value]) => {
      const re = new RegExp(`{{${key}}}`, 'g');
      prompt = prompt.replace(re, String(value ?? ''));
    });
    Object.entries(fragmentContents).forEach(([key, value]) => {
      const re = new RegExp(`{{${key}}}`, 'g');
      prompt = prompt.replace(re, value);
    });
    setGeneratedPrompt(prompt);
    setModalOpen(true);
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
  console.log("uiData",uiData)
  // Handle colors from normalized uiData.colors
  let modalColors: (string | undefined)[] = [undefined, undefined];
  if (uiData.colors && (uiData.colors.modal || uiData.colors.bg)) {
    modalColors = uiData.colors.modal || uiData.colors.bg || [undefined, undefined];
  }
  const [modalBg, modalText, promptBg, promptText, buttonBg, buttonText, buttonHoverBg, buttonHoverText] = modalColors;
  const modalStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: modalBg,
    color: modalText,
    boxShadow: 24,
    p: 4,
    minWidth: 350,
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflow: 'auto',
    borderRadius: 2,
  };

  // Check if all required fields are filled
  let allRequiredFilled = false;
  if (uiData && uiData.ui && typeof uiData.ui === 'object') {
    try {
      allRequiredFilled = Object.values(uiData.ui).every((section) =>
        section && section.components && Array.isArray(section.components) &&
        section.components.every((comp) => {
          if (!comp.required) return true;
          const value = formState[comp.ref];
          return value !== undefined && value !== '';
        })
      );
    } catch {
      allRequiredFilled = false;
    }
  }

  return (
    <Container sx={{ 
        top: 0,
        minWidth: { xs:"95vw", sm:"80vw", md:"70vw", lg:"60vw" },
        maxWidth: { xs:"98vw", sm:"94vw", md:"92vw", lg:"90vw" },
    }}>
      {uiData.ui && typeof uiData.ui === 'object' ? (
        Object.entries(uiData.ui).map(([sectionKey, section]) => {
          // Use color from section.color, fallback to bg
          const colorArr = (uiData.colors && (section.color && uiData.colors[section.color] ? uiData.colors[section.color] : uiData.colors.bg)) || [undefined, undefined];
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
                if (comp.type.toLowerCase() === 'textarea') {
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
        })
      ) : null}
      {/* Removed duplicate and unreachable rendering code */}
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleGeneratePrompt} disabled={!allRequiredFilled}>
        Generate Prompt
      </Button>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom sx={{ color: modalText }}>Generated Prompt</Typography>
          <Box sx={{ whiteSpace: 'pre-wrap', mb: 2, maxHeight: 300, overflow: 'auto', background: promptBg, p: 2, borderRadius: 2, color: promptText }}>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', background: 'none', margin: 0, color: promptText }}>
              {generatedPrompt}
            </div>
          </Box>
          <Button onClick={handleCopy} sx={{ mr: 1, color: buttonText, background: buttonBg, '&:hover': { background: buttonHoverBg, color: buttonHoverText } }}>Copy</Button>
          <Button onClick={handleSavePrompt} sx={{ mr: 1, color: buttonText, background: buttonBg, '&:hover': { background: buttonHoverBg, color: buttonHoverText } }}>Save Prompt</Button>
          <Button onClick={handleSaveInput} sx={{ mr: 1, color: buttonText, background: buttonBg, '&:hover': { background: buttonHoverBg, color: buttonHoverText } }}>Save Input</Button>
          <Button onClick={() => setModalOpen(false)} color="secondary" sx={{ color: buttonText, background: buttonBg, '&:hover': { background: buttonHoverBg, color: buttonHoverText } }}>Close</Button>
        </Box>
      </Modal>
    </Container>
  );
};

export default UIpage;
