import React, { useState, useEffect, useRef } from "react";
import {
  Box, Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Typography, IconButton, Checkbox, Chip
} from "@mui/material";

import { Add, Delete, Save } from "@mui/icons-material";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, query } from "firebase/firestore";
import { app } from "../App"; // adjust import if needed
import type { UIComponent, UISection as UISectionType } from "../data/uiConfigTypes";

type ColorScheme = {
  id: string;
  title: string;
  colors: Record<string, string[]>;
};

const defaultInput: UIComponent = {
  label: "",
  ref: "",
  type: "textinput",
  required: true,
};

// Bright, non-red colors for chips
const CHIP_COLORS = [
  '#FFD600', '#00E676', '#00B8D4', '#2979FF', '#F50057', '#FF9100', '#64DD17', '#1DE9B6', '#00BFAE', '#AEEA00', '#FFEA00', '#00C853', '#0091EA', '#C51162', '#AA00FF', '#6200EA', '#304FFE', '#009688', '#43A047', '#FFAB00', '#FF6D00', '#00B0FF', '#00E5FF', '#76FF03', '#B2FF59', '#18FFFF', '#00BFAE', '#00C853', '#FFD600', '#AEEA00', '#FFEA00', '#00C853', '#0091EA', '#AA00FF', '#6200EA', '#304FFE', '#009688', '#43A047', '#FFAB00', '#FF6D00', '#00B0FF', '#00E5FF', '#76FF03', '#B2FF59', '#18FFFF', '#00BFAE', '#00C853', '#FFD600', '#AEEA00', '#FFEA00', '#00C853', '#0091EA', '#AA00FF', '#6200EA', '#304FFE', '#009688', '#43A047', '#FFAB00', '#FF6D00', '#00B0FF', '#00E5FF', '#76FF03', '#B2FF59', '#18FFFF', '#00BFAE', '#00C853',
];
const CHIP_COLORS_NO_RED = CHIP_COLORS.filter(c => !['#F50057', '#C51162', '#FF6D00', '#FF1744', '#D50000'].includes(c));


interface UIEditorPageProps {
  editingUIId?: string | null;
}

const UIEditorPage: React.FC<UIEditorPageProps> = ({ editingUIId: propEditingUIId = null }) => {
  const [template, setTemplate] = useState("");
  const [title, setTitle] = useState("");
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme | null>(null);
  const [sections, setSections] = useState<UISectionType[]>([]);
  const [fragments, setFragments] = useState<{ ref: string; text: string }[]>([]);
  
  // State for editing existing UI
  const [editingUIId, setEditingUIId] = useState<string | null>(propEditingUIId);
  // Load UI for editing if editingUIId is provided
  useEffect(() => {
    if (propEditingUIId) {
      setEditingUIId(propEditingUIId);
      const fetchUI = async () => {
        try {
          const db = getFirestore(app, "promptor-db");
          const uiSnap = await getDocs(query(collection(db, "UIs")));
          const docSnap = uiSnap.docs.find(doc => doc.id === propEditingUIId);
          if (docSnap) {
            const data = docSnap.data() as {
              title?: string;
              colorScheme?: ColorScheme | null;
              sections?: UISectionType[];
              fragments?: { ref: string; text: string }[];
              template?: string;
            };
            setTitle(data?.title || "");
            setSelectedScheme(data?.colorScheme || null);
            setSections(Array.isArray(data?.sections) ? data.sections : []);
            setFragments(Array.isArray(data?.fragments) ? data.fragments : []);
            setTemplate(data?.template || "");
          }
        } catch {
          // Optionally handle error
        }
      };
      fetchUI();
    }
  }, [propEditingUIId]);
  const [isSaving, setIsSaving] = useState(false);
    // Ref for editable Typography
  const editableRef = useRef<HTMLDivElement | null>(null);
  // Sync editable content when template changes from external sources
  useEffect(() => {
    if (editableRef.current) {
      const currentContent = editableRef.current.innerText || '';
      if (currentContent !== template) {
        const selection = window.getSelection();
        const wasInEditor = selection && selection.rangeCount > 0 && 
          editableRef.current.contains(selection.getRangeAt(0).startContainer);
        
        // Only update if focus is not in the editor (to avoid cursor reset during typing)
        if (!wasInEditor || currentContent === '') {
          editableRef.current.innerText = template;
        }
      }
    }
  }, [template]);

  // Collect all refs from input components and fragments
  const allRefs: string[] = [
    ...sections.flatMap(section => section.components.map(c => c.ref)),
    ...fragments.map(f => f.ref)
  ].filter(Boolean);

  // Assign a color to each ref (cycling through the chip color palette)
  const refColorMap: Record<string, string> = {};
  allRefs.forEach((ref, idx) => {
    refColorMap[ref] = CHIP_COLORS_NO_RED[idx % CHIP_COLORS_NO_RED.length];
  });  const curlyRegex = /\{\{([^}]+)\}\}/g;
  
  // Compute invalid refs for save validation
  const invalidRefs: string[] = [];
  let match;
  const tempRegex = new RegExp(curlyRegex.source, 'g');
  while ((match = tempRegex.exec(template)) !== null) {
    const ref = match[1];
    if (!refColorMap[ref]) {
      invalidRefs.push(ref);
    }
  }

  const getHighlightedTemplate = (tpl: string) => {
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;
    let idx = 0;
    const regex = new RegExp(curlyRegex.source, 'g');
    while ((match = regex.exec(tpl)) !== null) {
      const [full, ref] = match;
      const start = match.index;
      const end = start + full.length;
      if (start > lastIdx) {
        elements.push(<span key={idx++}>{tpl.slice(lastIdx, start)}</span>);
      }
      const color = refColorMap[ref];
      if (color) {
        elements.push(
          <span key={idx++} style={{ background: color, color: '#23272f', borderRadius: 4, padding: '0 2px', fontWeight: 700 }}>{full}</span>
        );
      } else {
        elements.push(
          <span key={idx++} style={{ background: '#ff1744', color: '#fff', borderRadius: 4, padding: '0 2px', fontWeight: 700 }}>{full}</span>
        );
      }
      lastIdx = end;
    }
    if (lastIdx < tpl.length) {
      elements.push(<span key={idx++}>{tpl.slice(lastIdx)}</span>);
    }
    return elements;
  };

  // Insert chip ref at cursor position in editable Typography
  const handleInsertRef = (ref: string) => {
    const insert = `{{${ref}}}`;
    const el = editableRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Only insert if selection is inside our editor
    if (!el.contains(range.startContainer)) return;
    range.deleteContents();
    const textNode = document.createTextNode(insert);
    range.insertNode(textNode);
    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
    // Update template state
    setTemplate(el.innerText.replace(/\u200B/g, ''));
  };  // Save UI to Firestore
  const handleSaveUI = async () => {
    if (!title.trim()) {
      alert("Please enter a UI title before saving.");
      return;
    }

    if (invalidRefs.length > 0) {
      alert("Cannot save: Invalid template refs highlighted in red.");
      return;
    }

    setIsSaving(true);
    try {
      const db = getFirestore(app, "promptor-db");
      const uiConfig = {
        title: title.trim(),
        colorScheme: selectedScheme,
        sections,
        fragments,
        template,
        updatedAt: new Date(),
      };

      if (editingUIId) {
        // Update existing UI
        const uiDocRef = doc(db, "UIs", editingUIId);
        await updateDoc(uiDocRef, uiConfig);
        alert("UI updated successfully!");
      } else {
        // Create new UI
        const uiConfigWithCreatedAt = {
          ...uiConfig,
          createdAt: new Date(),
        };
        const docRef = await addDoc(collection(db, "UIs"), uiConfigWithCreatedAt);
        setEditingUIId(docRef.id);
        alert("UI saved successfully!");
      }
    } catch (error) {
      console.error("Error saving UI:", error);
      alert("Error saving UI. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  useEffect(() => {
    const fetchSchemes = async () => {
      const db = getFirestore(app, "promptor-db");
      const querySnapshot = await getDocs(collection(db, "colorSchemes"));
      const schemes: ColorScheme[] = [];
      querySnapshot.forEach((doc) => {
        schemes.push({ id: doc.id, ...doc.data() } as ColorScheme);
      });
      setColorSchemes(schemes);
    };
    fetchSchemes();
  }, []);

  // Section handlers
  const addSection = () => {
    setSections([
      ...sections,
      {
        header: "",
        fixed: false,
        color: Object.keys(selectedScheme?.colors ?? {})[0] || "",
        components: [{ ...defaultInput }],
      },
    ]);
  };

  const removeSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  // Input handlers
  const addInput = (sectionIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].components.push({ ...defaultInput });
    setSections(updated);
  };

  const removeInput = (sectionIdx: number, inputIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].components = updated[sectionIdx].components.filter((_, i) => i !== inputIdx);
    setSections(updated);
  };

const updateInput = (
  sectionIdx: number,
  inputIdx: number,
  field: keyof UIComponent,
  value: string | boolean | string[] | null | undefined
) => {
  const updated = [...sections];
  updated[sectionIdx].components[inputIdx][field] = value as never;  // If label changes, auto-set ref
  if (field === "label" && typeof value === "string") {
    // Remove text in parentheses or brackets, then replace spaces/special chars with _
    const ref = value
      .replace(/\([^)]*\)|\[[^\]]*\]/g, "") // remove (text) and [text]
      .replace(/[^a-zA-Z0-9]+/g, "_") // replace non-alphanumeric with _
      .replace(/^_+|_+$/g, "") // trim leading/trailing _
      .toLowerCase();
    updated[sectionIdx].components[inputIdx].ref = ref;
  }
  // If type changes, reset options/default
  if (field === "type" && value !== "dropdown") {
    updated[sectionIdx].components[inputIdx].options = undefined;
    updated[sectionIdx].components[inputIdx].default = undefined;
  }
  setSections(updated);
};

  // Render
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 2, bgcolor: '#23272f', borderRadius: 3, boxShadow: 3, color: '#ffe6a7', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#ffce54', fontWeight: 700 }}>UI Editor</Typography>
      <TextField
        label="UI Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{ style: { background: '#353b48', color: '#ffe6a7' } }}
        InputLabelProps={{ style: { color: '#ffe6a7' } }}
      />
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel sx={{ color: '#ffe6a7' }}>Color Scheme</InputLabel>
        <Select
          value={selectedScheme?.id || ""}
          label="Color Scheme"
          onChange={e => {
            const scheme = colorSchemes.find(s => s.id === e.target.value);
            setSelectedScheme(scheme || null);
          }}
          sx={{ background: '#353b48', color: '#ffe6a7' }}
          MenuProps={{ PaperProps: { sx: { bgcolor: '#353b48', color: '#ffe6a7' } } }}
        >
          {colorSchemes.map(scheme => (
            <MenuItem key={scheme.id} value={scheme.id} sx={{ color: '#ffe6a7' }}>{scheme.title}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box>
        <Typography variant="h6" sx={{ color: '#ffce54', fontWeight: 600 }}>Sections</Typography>
        {sections.map((section, sIdx) => {
          // Get color array for this section from selectedScheme
          const colorArr = selectedScheme?.colors[section.color] || ["#353b48", "#ffe6a7", "#ffe6a7", "#000000"];
          // colorArr: [bg, text, inputBg, inputText, ...]
          const sectionBg = colorArr[0] || '#353b48';
          const sectionText = colorArr[1] || '#ffe6a7';
          const inputBg = colorArr[2] || '#23272f';
          const inputText = colorArr[3] || '#ffe6a7';
          return (
            <Box key={sIdx} sx={{ border: `1px solid ${sectionText}`, borderRadius: 2, p: 2, mb: 2, bgcolor: sectionBg }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TextField
                  label="Section Header"
                  value={typeof section.header === 'string' ? section.header : ''}
                  onChange={e => {
                    const updated = [...sections];
                    updated[sIdx].header = e.target.value;
                    setSections(updated);
                  }}
                  sx={{ flex: 1, mr: 2 }}
                  InputProps={{ style: { background: inputBg, color: inputText } }}
                  InputLabelProps={{ style: { color: inputText } }}
                />
                {/* Fixed checkbox for the first section only */}
                {sIdx === 0 && (
                  <FormControl sx={{ mr: 2, flexDirection: 'row', alignItems: 'center', display: 'flex' }}>
                    <Checkbox
                      checked={!!section.fixed}
                      onChange={e => {
                        const updated = [...sections];
                        updated[sIdx].fixed = e.target.checked;
                        setSections(updated);
                      }}
                      sx={{ color: '#ffce54', p: 0, mr: 1 }}
                    />
                    <Typography sx={{ color: inputText, fontSize: 14 }}>Fixed</Typography>
                  </FormControl>
                )}
                <FormControl sx={{ minWidth: 120, mr: 2 }}>
                  <InputLabel sx={{ color: inputText }}>Color</InputLabel>
                  <Select
                    value={section.color}
                    label="Color"
                    onChange={e => {
                      const updated = [...sections];
                      updated[sIdx].color = e.target.value;
                      setSections(updated);
                    }}
                    sx={{ background: inputBg, color: inputText }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: inputBg, color: inputText } } }}
                  >
                    {selectedScheme &&
                      Object.entries(selectedScheme.colors).map(([key, val]) => (
                        <MenuItem key={key} value={key} sx={{ color: inputText }}>
                          <Box sx={{ display: "inline-block", width: 16, height: 16, bgcolor: val[0], mr: 1, borderRadius: "50%" }} />
                          {key}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <IconButton onClick={() => removeSection(sIdx)} sx={{ color: '#ffce54' }}><Delete /></IconButton>
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#ffce54', fontWeight: 500 }}>Inputs</Typography>
                {section.components.map((input, iIdx) => (
                  <Box key={iIdx} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <TextField
                      label="Label"
                      value={input.label}
                      onChange={e => updateInput(sIdx, iIdx, "label", e.target.value)}
                      sx={{ mr: 1 }}
                      InputProps={{ style: { background: inputBg, color: inputText } }}
                      InputLabelProps={{ style: { color: inputText } }}
                    />
                    <TextField
                      label="Ref"
                      value={input.ref}
                      sx={{ mr: 1 }}
                      InputProps={{ style: { background: inputBg, color: inputText } }}
                      InputLabelProps={{ style: { color: inputText } }}
                      disabled
                      helperText="Auto-generated from label"
                    />
                    <FormControl sx={{ minWidth: 120, mr: 1 }}>
                      <InputLabel sx={{ color: inputText }}>Type</InputLabel>
                      <Select
                        value={input.type}
                        label="Type"
                        onChange={e => updateInput(sIdx, iIdx, "type", e.target.value)}
                        sx={{ background: inputBg, color: inputText }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: inputBg, color: inputText } } }}
                      >
                        <MenuItem value="textinput" sx={{ color: inputText }}>Text Input</MenuItem>
                        <MenuItem value="textarea" sx={{ color: inputText }}>Textarea</MenuItem>
                        <MenuItem value="dropdown" sx={{ color: inputText }}>Dropdown</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl sx={{ mr: 1 }}>
                      <InputLabel sx={{ color: inputText }}>Required</InputLabel>
                      <Checkbox
                        checked={input.required}
                        onChange={e => updateInput(sIdx, iIdx, "required", e.target.checked)}
                        sx={{ color: '#ffce54' }}
                      />
                    </FormControl>
                    <IconButton onClick={() => removeInput(sIdx, iIdx)} sx={{ color: '#ffce54' }}><Delete /></IconButton>
                    {/* Dropdown options */}
                    {input.type === "dropdown" && (
                      <Box sx={{ ml: 2, display: "flex", alignItems: "center" }}>
                        <TextField
                          label="Options (comma separated)"
                          value={input.options?.join(",") || ""}
                          onChange={e => updateInput(sIdx, iIdx, "options", e.target.value.split(",").map(opt => opt.trim()))}
                          sx={{ mr: 1 }}
                          InputProps={{ style: { background: inputBg, color: inputText } }}
                          InputLabelProps={{ style: { color: inputText } }}
                        />
                        <TextField
                          label="Default"
                          value={input.default || ""}
                          onChange={e => updateInput(sIdx, iIdx, "default", e.target.value)}
                          sx={{ mr: 1 }}
                          placeholder="Default value"
                          InputProps={{ style: { background: inputBg, color: inputText } }}
                          InputLabelProps={{ style: { color: inputText } }}
                        />
                      </Box>
                    )}
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => addInput(sIdx)}
                  sx={{ mt: 1, color: '#ffce54', borderColor: '#ffce54', '&:hover': { background: sectionBg, borderColor: '#ffe6a7' } }}
                >
                  Add Input
                </Button>
              </Box>
            </Box>
          );
        })}
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={addSection}
          sx={{ background: '#ffce54', color: '#23272f', fontWeight: 600, '&:hover': { background: '#ffe6a7' } }}
        >
          Add Section
        </Button>
      </Box>
      {/* Fragments Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ color: '#ffce54', fontWeight: 600 }}>Fragments</Typography>
        {fragments.map((fragment, idx) => (
          <Box key={idx} sx={{ border: '1px solid #ffe6a7', borderRadius: 2, p: 2, mb: 2, bgcolor: '#353b48' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                label="Fragment Ref"
                value={fragment.ref}
                onChange={e => {
                  const updated = [...fragments];
                  updated[idx].ref = e.target.value;
                  setFragments(updated);
                }}
                sx={{ mr: 2, flex: 1 }}
                InputProps={{ style: { background: '#23272f', color: '#ffe6a7' } }}
                InputLabelProps={{ style: { color: '#ffe6a7' } }}
              />
              <IconButton onClick={() => setFragments(fragments.filter((_, i) => i !== idx))} sx={{ color: '#ffce54' }}><Delete /></IconButton>
            </Box>
            <TextField
              label="Fragment Text"
              value={fragment.text}
              onChange={e => {
                const updated = [...fragments];
                updated[idx].text = e.target.value;
                setFragments(updated);
              }}
              multiline
              minRows={4}
              fullWidth
              sx={{ mb: 1 }}
              InputProps={{
                style: { background: '#23272f', color: '#ffe6a7', fontFamily: 'monospace' },
                inputProps: { style: { whiteSpace: 'pre', fontFamily: 'monospace' } },
              }}
              InputLabelProps={{ style: { color: '#ffe6a7' } }}
            />
          </Box>
        ))}
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => setFragments([...fragments, { ref: '', text: '' }])}
          sx={{ color: '#ffce54', borderColor: '#ffce54', '&:hover': { background: '#23272f', borderColor: '#ffe6a7' } }}
        >
          Add Fragment
        </Button>

      </Box>
      
      {/* Template Section */}
      <Box sx={{ mt: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>        <Box sx={{ flex: 1, minWidth: 0, position: 'relative', height: '100%' }}>
          <Typography variant="subtitle1" sx={{ color: '#ffe6a7', mb: 1, fontWeight: 600 }}>Prompt Template</Typography>
          <Box
            sx={{
              position: 'relative',
              minHeight: 250,
              maxHeight: 500,
              borderRadius: 2,
              border: '1px solid #444',
              boxSizing: 'border-box',
              margin: 0,
              textAlign: 'left',
              background: '#353b48',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {/* Scrollable content area for both layers */}
            <Box
              sx={{
                position: 'relative',
                minHeight: 250,
                maxHeight: 500,
                overflow: 'auto',
                width: '100%',
                height: '100%',
              }}
            >
              {/* Syntax highlighting overlay - background layer */}
              <Typography
                variant="body1"
                component="div"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '20px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: 250,
                  maxHeight: 500,
                  background: 'none',
                  borderRadius: 2,
                  boxSizing: 'border-box',
                  padding: '16.5px 14px',
                  margin: 0,
                  textAlign: 'left',
                  color: '#ffe6a7',
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal',
                  pointerEvents: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1,
                }}
              >
                {getHighlightedTemplate(template)}
              </Typography>
              {/* Actual editable text input - foreground layer */}
              <Typography
                ref={editableRef}
                variant="body1"
                component="div"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '20px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: 250,
                  maxHeight: 500,
                  background: 'transparent',
                  color: 'transparent',
                  borderRadius: 2,
                  boxSizing: 'border-box',
                  padding: '16.5px 14px',
                  outline: 'none',
                  margin: 0,
                  textAlign: 'left',
                  position: 'relative',
                  zIndex: 2,
                  caretColor: '#ffe6a7',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal',
                  '& ::selection': {
                    background: 'rgba(255, 230, 167, 0.3)',
                  },
                  width: '100%',
                  height: '100%',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      range.deleteContents();
                      // Insert newline and a zero-width space to help with cursor positioning
                      const textNode = document.createTextNode('\n');
                      range.insertNode(textNode);
                      // Position cursor after the newline
                      range.setStartAfter(textNode);
                      range.collapse(true);
                      selection.removeAllRanges();
                      selection.addRange(range);
                      // Force the editor to scroll to cursor if needed
                      const el = e.currentTarget as HTMLDivElement;
                      setTimeout(() => {
                        if (selection.rangeCount > 0) {
                          const rect = selection.getRangeAt(0).getBoundingClientRect();
                          const editorRect = el.getBoundingClientRect();
                          if (rect.bottom > editorRect.bottom - 20) {
                            el.scrollTop += (rect.bottom - editorRect.bottom + 20);
                          }
                        }
                      }, 0);
                      // Update template state
                      const newText = el.innerText.replace(/\u200B/g, '');
                      if (newText !== template) {
                        setTemplate(newText);
                      }
                    }
                  }
                }}
                onInput={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  const newText = el.innerText.replace(/\u200B/g, '');
                  // Update state immediately but check if it actually changed
                  if (newText !== template) {
                    setTemplate(newText);
                  }
                }}
                onBlur={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  const newText = el.innerText.replace(/\u200B/g, '');
                  if (newText !== template) {
                    setTemplate(newText);
                  }
                }}
                aria-label="Prompt Template"
                tabIndex={0}
                role="textbox"
                autoCorrect="off"
                autoCapitalize="off"
                dir="ltr"
              />
            </Box>
          </Box>
          
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: '0 0 220px', alignItems: 'flex-end', minWidth: 180 }}>
          <Typography variant="subtitle2" sx={{ color: '#ffe6a7', mb: 1, fontWeight: 600 }}>Refs</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>            {allRefs.map((ref) => (
              <Chip
                key={ref}
                label={ref}
                onClick={() => handleInsertRef(ref)}
                sx={{ bgcolor: refColorMap[ref], color: '#23272f', fontWeight: 700, fontSize: 15, cursor: 'pointer', mb: 1 }}
              />
            ))}
          </Box>
        </Box>
      </Box>      {/* Save/Export UI config */}
      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          sx={{ background: '#bb9457', color: '#23272f', fontWeight: 600, '&:hover': { background: '#ffe6a7' } }}
          disabled={invalidRefs.length > 0 || isSaving || !title.trim()}
          onClick={handleSaveUI}
        >
          {isSaving ? 'Saving...' : editingUIId ? 'Update UI' : 'Save UI'}
        </Button>
        {invalidRefs.length > 0 && (
          <Typography color="error" sx={{ mt: 1 }}>
            Cannot save: Invalid template refs highlighted in red.
          </Typography>
        )}
        {!title.trim() && (
          <Typography color="warning" sx={{ mt: 1 }}>
            Please enter a UI title before saving.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default UIEditorPage;