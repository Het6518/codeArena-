import Editor from '@monaco-editor/react';
import { useThemeStore } from '../../store/useThemeStore';

// Monaco's built-in themes color keywords blue; these match CodeArena's palette instead.
const defineThemes = (monaco) => {
  monaco.editor.defineTheme('arena-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: '16171A' },
      { token: 'comment', foreground: '8A8C86', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7A5A00', fontStyle: 'bold' },
      { token: 'string', foreground: '1E7F45' },
      { token: 'number', foreground: 'B3401F' },
      { token: 'type', foreground: '7B3F8C' },
      { token: 'type.identifier', foreground: '7B3F8C' },
      { token: 'delimiter', foreground: '5C5F66' },
      { token: 'operator', foreground: '5C5F66' },
      { token: 'identifier', foreground: '16171A' },
      { token: 'variable', foreground: '16171A' },
      { token: 'function', foreground: '3D4A1E' },
      { token: 'regexp', foreground: 'B3401F' },
      { token: 'tag', foreground: '7A5A00' },
      { token: 'attribute.name', foreground: '7B3F8C' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#16171A',
      'editorLineNumber.foreground': '#B9BAB2',
      'editorLineNumber.activeForeground': '#16171A',
      'editor.lineHighlightBackground': '#F4F4F0',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#F5B80055',
      'editor.inactiveSelectionBackground': '#F5B80033',
      'editorCursor.foreground': '#16171A',
      'editorIndentGuide.background1': '#E6E6E0',
      'editorIndentGuide.activeBackground1': '#B9BAB2',
      'editorBracketMatch.background': '#F5B80033',
      'editorBracketMatch.border': '#7A5A00',
      'editorWidget.background': '#FFFFFF',
      'editorWidget.border': '#D6D6CF',
      'editorSuggestWidget.selectedBackground': '#FFF4CC',
      'scrollbarSlider.background': '#16171A22',
      'scrollbarSlider.hoverBackground': '#16171A44',
      focusBorder: '#16171A',
    },
  });

  monaco.editor.defineTheme('arena-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'EDEDE6' },
      { token: 'comment', foreground: '75766F', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'F5B800', fontStyle: 'bold' },
      { token: 'string', foreground: '8FD19E' },
      { token: 'number', foreground: 'F2916F' },
      { token: 'type', foreground: 'D7A8E6' },
      { token: 'type.identifier', foreground: 'D7A8E6' },
      { token: 'delimiter', foreground: 'A09F97' },
      { token: 'operator', foreground: 'A09F97' },
      { token: 'identifier', foreground: 'EDEDE6' },
      { token: 'variable', foreground: 'EDEDE6' },
      { token: 'function', foreground: 'E6D9A8' },
      { token: 'regexp', foreground: 'F2916F' },
      { token: 'tag', foreground: 'F5B800' },
      { token: 'attribute.name', foreground: 'D7A8E6' },
    ],
    colors: {
      'editor.background': '#171815',
      'editor.foreground': '#EDEDE6',
      'editorLineNumber.foreground': '#43443D',
      'editorLineNumber.activeForeground': '#EDEDE6',
      'editor.lineHighlightBackground': '#1F201C',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#F5B80040',
      'editor.inactiveSelectionBackground': '#F5B80026',
      'editorCursor.foreground': '#F5B800',
      'editorIndentGuide.background1': '#252621',
      'editorIndentGuide.activeBackground1': '#43443D',
      'editorBracketMatch.background': '#F5B80026',
      'editorBracketMatch.border': '#F5B800',
      'editorWidget.background': '#1F201C',
      'editorWidget.border': '#2F302A',
      'editorSuggestWidget.selectedBackground': '#2F2A14',
      'scrollbarSlider.background': '#EDEDE622',
      'scrollbarSlider.hoverBackground': '#EDEDE644',
      focusBorder: '#F5B800',
    },
  });
};

export function CodeEditor({ value, onChange, language = 'javascript' }) {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className="monaco-editor-wrapper" style={{ width: '100%', height: '100%', minHeight: 0 }}>
      <Editor
        height="100%"
        language={language}
        theme={theme === 'dark' ? 'arena-dark' : 'arena-light'}
        beforeMount={defineThemes}
        value={value}
        onChange={onChange}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
          fontLigatures: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'phase',
          bracketPairColorization: { enabled: false },
          guides: { indentation: true },
          folding: true,
        }}
        loading={
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--graphite)' }}>
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
