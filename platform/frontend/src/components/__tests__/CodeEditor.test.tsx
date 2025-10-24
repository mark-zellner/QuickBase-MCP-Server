import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeEditor } from '../CodeEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, onMount }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={() => onMount?.()}
    />
  ),
}));

describe('CodeEditor', () => {
  const defaultProps = {
    value: 'console.log("Hello World");',
    onChange: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor with initial value', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue(defaultProps.value);
  });

  it('calls onChange when editor content changes', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'new code' } });
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('new code');
  });

  it('calls onSave when save button is clicked', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const saveButton = screen.getByLabelText(/save/i);
    fireEvent.click(saveButton);
    
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('calls onRun when run button is clicked', () => {
    const onRun = vi.fn();
    render(<CodeEditor {...defaultProps} onRun={onRun} />);
    
    const runButton = screen.getByLabelText(/run/i);
    fireEvent.click(runButton);
    
    expect(onRun).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<CodeEditor {...defaultProps} isLoading={true} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message', () => {
    const errorMessage = 'Syntax error on line 5';
    render(<CodeEditor {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays collaborators', () => {
    const collaborators = [
      { id: '1', name: 'John Doe', color: '#ff0000' },
      { id: '2', name: 'Jane Smith', color: '#00ff00' },
    ];
    
    render(<CodeEditor {...defaultProps} collaborators={collaborators} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('disables editor when readOnly is true', () => {
    render(<CodeEditor {...defaultProps} readOnly={true} />);
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeDisabled();
  });

  it('shows format button and handles formatting', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const formatButton = screen.getByLabelText(/format/i);
    expect(formatButton).toBeInTheDocument();
    
    fireEvent.click(formatButton);
    // Format functionality would be tested with actual Monaco integration
  });

  it('shows undo/redo buttons', () => {
    render(<CodeEditor {...defaultProps} />);
    
    expect(screen.getByLabelText(/undo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/redo/i)).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    
    // Test Ctrl+S for save
    fireEvent.keyDown(editor, { key: 's', ctrlKey: true });
    expect(defaultProps.onSave).toHaveBeenCalled();
  });
});