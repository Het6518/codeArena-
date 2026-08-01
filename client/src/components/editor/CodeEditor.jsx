import Editor from '@monaco-editor/react';
import { useThemeStore } from '../../store/useThemeStore';

export function CodeEditor({ value, onChange, language = 'javascript' }) {
  const theme = useThemeStore((state) => state.theme);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="monaco-editor-wrapper" style={{ width: '100%', height: '100%', minHeight: '340px' }}>
      <Editor
        height="100%"
        language={language}
        theme={monacoTheme}
        value={value}
        onChange={onChange}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: true,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          folding: true,
        }}
        loading={
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--color-muted)' }}>
            Loading Monaco Editor...
          </div>
        }
      />
    </div>
  );
}
