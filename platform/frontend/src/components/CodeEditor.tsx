import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Box,
  Paper,
  Typography,
  Toolbar,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as RunIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  FormatAlignLeft as FormatIcon,
  People as CollaborateIcon,
} from '@mui/icons-material';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onRun?: () => void;
  language?: string;
  readOnly?: boolean;
  collaborators?: Array<{ id: string; name: string; color: string }>;
  isLoading?: boolean;
  error?: string;
}

// QuickBase API autocomplete definitions
const quickbaseApiCompletions = [
  {
    label: 'QB.api.getRecords',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.api.getRecords(${1:tableId}, ${2:options})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Retrieve records from a QuickBase table',
    detail: 'QB.api.getRecords(tableId: string, options?: QueryOptions): Promise<Record[]>',
  },
  {
    label: 'QB.api.createRecord',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.api.createRecord(${1:tableId}, ${2:fields})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create a new record in a QuickBase table',
    detail: 'QB.api.createRecord(tableId: string, fields: Record<string, any>): Promise<Record>',
  },
  {
    label: 'QB.api.updateRecord',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.api.updateRecord(${1:tableId}, ${2:recordId}, ${3:fields})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Update an existing record in a QuickBase table',
    detail: 'QB.api.updateRecord(tableId: string, recordId: number, fields: Record<string, any>): Promise<Record>',
  },
  {
    label: 'QB.api.deleteRecord',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.api.deleteRecord(${1:tableId}, ${2:recordId})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Delete a record from a QuickBase table',
    detail: 'QB.api.deleteRecord(tableId: string, recordId: number): Promise<void>',
  },
  {
    label: 'QB.api.getTables',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.api.getTables()',
    documentation: 'Get all tables in the current QuickBase application',
    detail: 'QB.api.getTables(): Promise<Table[]>',
  },
  {
    label: 'QB.api.getFields',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.api.getFields(${1:tableId})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Get all fields for a specific table',
    detail: 'QB.api.getFields(tableId: string): Promise<Field[]>',
  },
  {
    label: 'QB.ui.showMessage',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.ui.showMessage(${1:"message"}, ${2:"info"})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Display a message to the user',
    detail: 'QB.ui.showMessage(message: string, type?: "info" | "success" | "warning" | "error"): void',
  },
  {
    label: 'QB.ui.showDialog',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.ui.showDialog(${1:options})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Show a dialog to the user',
    detail: 'QB.ui.showDialog(options: DialogOptions): Promise<DialogResult>',
  },
  {
    label: 'QB.utils.formatCurrency',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.utils.formatCurrency(${1:amount})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Format a number as currency',
    detail: 'QB.utils.formatCurrency(amount: number): string',
  },
  {
    label: 'QB.utils.formatDate',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'QB.utils.formatDate(${1:date})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Format a date value',
    detail: 'QB.utils.formatDate(date: Date | string): string',
  },
];

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onSave,
  onRun,
  language = 'javascript',
  readOnly = false,
  collaborators = [],
  isLoading = false,
  error,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Register QuickBase API completion provider
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: quickbaseApiCompletions.map(item => ({
            ...item,
            range,
          })),
        };
      },
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun();
      });
    }

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    });
  };

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'undo', null);
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'redo', null);
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.formatDocument', null);
    }
  };

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Code Editor
        </Typography>
        
        {/* Collaborators */}
        {collaborators.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <CollaborateIcon sx={{ mr: 1, fontSize: 20 }} />
            {collaborators.map((collaborator) => (
              <Chip
                key={collaborator.id}
                label={collaborator.name}
                size="small"
                sx={{
                  ml: 0.5,
                  backgroundColor: collaborator.color,
                  color: 'white',
                }}
              />
            ))}
          </Box>
        )}

        {/* Editor Actions */}
        <IconButton
          size="small"
          onClick={handleUndo}
          disabled={!isEditorReady || readOnly}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon />
        </IconButton>
        
        <IconButton
          size="small"
          onClick={handleRedo}
          disabled={!isEditorReady || readOnly}
          title="Redo (Ctrl+Y)"
        >
          <RedoIcon />
        </IconButton>
        
        <IconButton
          size="small"
          onClick={handleFormat}
          disabled={!isEditorReady || readOnly}
          title="Format Code"
        >
          <FormatIcon />
        </IconButton>

        {onRun && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RunIcon />}
            onClick={onRun}
            disabled={readOnly}
            sx={{ ml: 1 }}
          >
            Run
          </Button>
        )}

        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={readOnly}
          sx={{ ml: 1 }}
        >
          Save
        </Button>
      </Toolbar>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Editor */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={(newValue) => onChange(newValue || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            theme: 'vs-dark',
            automaticLayout: true,
          }}
        />
      </Box>
    </Paper>
  );
};