import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play,
  Send,
  RotateCcw,
  XCircle,
  Clock,
  Code2,
  FileText,
  History,
  ArrowLeft,
} from 'lucide-react';
import { Button, Card, Spinner } from '../components/ui';
import { CodeEditor } from '../components/editor/CodeEditor';
import { SplitPane } from '../components/layout/SplitPane';
import { problemService } from '../services/problemService';
import { submissionService } from '../services/submissionService';
import { DEFAULT_BOILERPLATES, LANGUAGE_OPTIONS } from '../constants/languages';
import { VerdictBadge } from '../components/common/VerdictBadge';
import toast from 'react-hot-toast';

const getSubmissionMessage = (status) => {
  switch (status) {
    case 'ACCEPTED':
      return 'All test cases passed.';
    case 'WRONG_ANSWER':
      return 'Your output did not match the expected output for at least one test case.';
    case 'COMPILATION_ERROR':
      return 'The compiler rejected the submitted source code.';
    case 'RUNTIME_ERROR':
      return 'The program crashed while running a test case.';
    case 'TIME_LIMIT_EXCEEDED':
      return 'The program took too long to finish.';
    case 'INTERNAL_ERROR':
      return 'The code execution service failed. This is not a verdict on your code; please try again.';
    default:
      return 'Submission was recorded.';
  }
};

const formatMetrics = ({ executionTimeMs, memoryKb }) => {
  const parts = [];
  if (executionTimeMs !== null && executionTimeMs !== undefined) parts.push(`${executionTimeMs} ms`);
  if (memoryKb !== null && memoryKb !== undefined) parts.push(`${(memoryKb / 1024).toFixed(1)} MB`);
  return parts.join(' · ');
};
export function ProblemWorkspacePage() {
  const { slug } = useParams();
  
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('description'); // 'description' | 'submissions'
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_BOILERPLATES.javascript);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [testTab, setTestTab] = useState('testcase'); // 'testcase' | 'result'
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    async function fetchProblem() {
      try {
        setLoading(true);
        const data = await problemService.getProblemBySlug(slug);
        const prob = data.problem || data;
        setProblem(prob);
      } catch (err) {
        setError(err.message || 'Problem not found');
      } finally {
        setLoading(false);
      }
    }
    fetchProblem();
  }, [slug]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(DEFAULT_BOILERPLATES[newLang] || '// Write your code here');
  };

  const handleResetCode = () => {
    setCode(DEFAULT_BOILERPLATES[language] || '');
    toast.success('Reset code to default template');
  };

  const fetchSubmissions = async () => {
    if (!problem?.id) return;
    try {
      setLoadingSubmissions(true);
      const data = await submissionService.getProblemSubmissions(problem.id);
      setSubmissions(data.submissions || []);
    } catch {
      toast.error('Failed to load past submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'submissions') {
      fetchSubmissions();
    }
  };

  const handleRunCode = async () => {
    if (!problem?.id || isRunning || isSubmitting) return;
    setIsRunning(true);
    setTestTab('result');
    setExecutionResult(null);

    try {
      const response = await submissionService.runCode({
        problemId: problem.id,
        language,
        sourceCode: code,
      });
      setExecutionResult({ kind: 'run', ...response.result });
    } catch (err) {
      setExecutionResult({ kind: 'error', message: err.message || 'Could not run your code' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!problem?.id || isRunning || isSubmitting) return;
    setIsSubmitting(true);
    setTestTab('result');
    setExecutionResult(null);

    try {
      const response = await submissionService.createSubmission({
        problemId: problem.id,
        language,
        sourceCode: code,
      });
      const submission = response.submission;

      setExecutionResult({ kind: 'submit', ...submission });
      if (submission.status === 'ACCEPTED') {
        toast.success('Accepted');
      }
      if (activeTab === 'submissions') {
        fetchSubmissions();
      }
    } catch (err) {
      // Provider or network failure: report it as such, never as a wrong answer.
      setExecutionResult({ kind: 'error', message: err.message || 'Submission could not be evaluated' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-content" style={{ minHeight: '60vh' }}>
        <Spinner label="Loading LeetCode Problem Canvas..." />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="page-view">
        <Card className="placeholder-content">
          <Code2 size={48} style={{ color: 'var(--color-danger)' }} />
          <h2>Problem Not Found</h2>
          <p>{error || 'The requested problem could not be loaded.'}</p>
          <Link to="/problems">
            <Button variant="secondary">
              <ArrowLeft size={16} /> Back to Problems
            </Button>
          </Link>
        </Card>
      </div>
    );
  }
  return (
    <div className="leetcode-workspace animate-fade-in">
      {/* Problem | editor, resizable like LeetCode. Sizes are remembered per browser. */}
      <SplitPane
        direction="horizontal"
        className="workspace-split"
        defaultSize={45}
        min={25}
        max={70}
        storageKey="codearena_split_problem"
        label="Resize problem and editor panels"
      >
        {/* LEFT PANE: Problem Statement & Submissions */}
        <div className="left-panel">
          <div className="panel-tab-bar">
            <button
              type="button"
              className={`panel-tab ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => handleTabChange('description')}
            >
              <FileText size={15} />
              <span>Description</span>
            </button>
            <button
              type="button"
              className={`panel-tab ${activeTab === 'submissions' ? 'active' : ''}`}
              onClick={() => handleTabChange('submissions')}
            >
              <History size={15} />
              <span>Submissions</span>
            </button>
          </div>

          <div className="panel-content-scroll">
            {activeTab === 'description' ? (
              <div className="problem-details-view">
                <div className="problem-header-row">
                  <h1 className="problem-title-text">{problem.title}</h1>
                  <span className={`difficulty-badge ${problem.difficulty?.toLowerCase()}`}>
                    {problem.difficulty}
                  </span>
                </div>

                <div className="user-menu-divider" />

                <div className="problem-body-text">
                  <p style={{ whiteSpace: 'pre-line', lineHeight: '1.65' }}>{problem.description}</p>
                </div>

                {problem.sampleInput && (
                  <div className="sample-block">
                    <span className="block-label">Example 1:</span>
                    <div className="code-box">
                      <div><strong>Input:</strong> {problem.sampleInput}</div>
                      <div><strong>Output:</strong> {problem.sampleOutput}</div>
                      {problem.explanation && <div><strong>Explanation:</strong> {problem.explanation}</div>}
                    </div>
                  </div>
                )}

                {problem.constraints && (
                  <div className="sample-block">
                    <span className="block-label">Constraints:</span>
                    <ul className="constraints-list">
                      {problem.constraints.split('\n').map((c, i) => (
                        <li key={i}><code>{c}</code></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="submissions-history-view">
                <h3>Your Past Submissions</h3>
                {loadingSubmissions ? (
                  <Spinner label="Loading submissions..." />
                ) : submissions.length === 0 ? (
                  <p className="problem-desc" style={{ marginTop: '12px' }}>No submissions yet for this problem.</p>
                ) : (
                  <ul className="submissions-list">
                    {submissions.map((sub) => (
                      <li key={sub.id} className="submission-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <VerdictBadge status={sub.status} compact />
                          {sub.totalTestCases ? (
                            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                              {sub.passedTestCases}/{sub.totalTestCases}
                            </span>
                          ) : null}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                          {sub.language.toUpperCase()} · {sub.battleRoomId ? 'Battle · ' : ''}
                          {new Date(sub.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Monaco Editor + Console */}
        <div className="right-panel">
          {/* Top Control Header */}
          <div className="editor-control-header">
            <div className="language-selector-wrap">
              <select
                className="language-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="editor-icon-btn"
              onClick={handleResetCode}
              title="Reset to default code template"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          </div>
          <SplitPane
            direction="vertical"
            defaultSize={62}
            min={20}
            max={85}
            storageKey="codearena_split_editor"
            label="Resize editor and console"
          >
          <div className="editor-workspace-container">
            <CodeEditor
              value={code}
              onChange={(val) => setCode(val || '')}
              language={language}
            />
          </div>

          <div className="console-panel">
            <div className="console-tab-bar">
              <button
                type="button"
                className={`console-tab ${testTab === 'testcase' ? 'active' : ''}`}
                onClick={() => setTestTab('testcase')}
              >
                Testcase
              </button>
              <button
                type="button"
                className={`console-tab ${testTab === 'result' ? 'active' : ''}`}
                onClick={() => setTestTab('result')}
              >
                Test Result
              </button>
            </div>

            <div className="console-body">
              {testTab === 'testcase' ? (
                <div className="testcase-inputs">
                  {problem.sampleTestCases?.length ? (
                    problem.sampleTestCases.map((sample, index) => (
                      <div key={sample.id}>
                        <label className="input-label">Sample {index + 1} input (stdin):</label>
                        <pre className="input-preview">{sample.input}</pre>
                      </div>
                    ))
                  ) : (
                    <>
                      <label className="input-label">Sample Input:</label>
                      <pre className="input-preview">{problem.sampleInput}</pre>
                    </>
                  )}
                </div>
              ) : (
                <div className="test-result-view">
                  {isRunning || isSubmitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Spinner size="small" />
                      <span>{isSubmitting ? 'Evaluating Submission...' : 'Running Test Cases...'}</span>
                    </div>
                  ) : executionResult?.kind === 'error' ? (
                    <div className="verdict-card">
                      <div className="verdict-status-row">
                        <div className="verdict-badge wrong">
                          <XCircle size={18} /> Could not evaluate
                        </div>
                      </div>
                      <p className="verdict-output">{executionResult.message}</p>
                    </div>
                  ) : executionResult?.kind === 'run' ? (
                    <div className="verdict-card">
                      <div className="verdict-status-row">
                        <VerdictBadge status={executionResult.status} />
                        <span className="metric-tag">
                          {executionResult.passedTestCases}/{executionResult.totalTestCases} sample tests passed
                        </span>
                      </div>
                      {executionResult.results.map((caseResult, index) => (
                        <div key={index} className="run-case">
                          <div className="run-case-header">
                            <span>Sample {index + 1}</span>
                            <VerdictBadge status={caseResult.status} compact />
                            {formatMetrics(caseResult) && (
                              <span className="metric-tag">
                                <Clock size={13} /> {formatMetrics(caseResult)}
                              </span>
                            )}
                          </div>
                          <label className="input-label">Input</label>
                          <pre className="input-preview">{caseResult.input}</pre>
                          <label className="input-label">Expected</label>
                          <pre className="input-preview">{caseResult.expectedOutput}</pre>
                          <label className="input-label">Your output</label>
                          <pre className="input-preview">{caseResult.actualOutput || '(no output)'}</pre>
                          {caseResult.stderr && (
                            <>
                              <label className="input-label">Error output</label>
                              <pre className="input-preview error-output">{caseResult.stderr}</pre>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : executionResult?.kind === 'submit' ? (
                    <div className="verdict-card">
                      <div className="verdict-status-row">
                        <VerdictBadge status={executionResult.status} />
                        {executionResult.totalTestCases ? (
                          <span className="metric-tag">
                            {executionResult.passedTestCases}/{executionResult.totalTestCases} tests passed
                          </span>
                        ) : null}
                        {formatMetrics(executionResult) && (
                          <span className="metric-tag">
                            <Clock size={13} /> {formatMetrics(executionResult)}
                          </span>
                        )}
                      </div>
                      <p className="verdict-output">{getSubmissionMessage(executionResult.status)}</p>
                      {executionResult.errorMessage && (
                        <pre className="input-preview error-output">{executionResult.errorMessage}</pre>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                      Click <strong>Run Code</strong> or <strong>Submit</strong> to evaluate your solution.
                    </p>
                  )}
                </div>
              )}
            </div>

       
            <div className="console-actions-bar">
              <Button
                variant="secondary"
                size="small"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting || !problem.sampleTestCases?.length}
                title={problem.sampleTestCases?.length ? undefined : 'This problem has no public sample tests'}
              >
                <Play size={14} />
                <span>Run Code</span>
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
              >
                <Send size={14} />
                <span>Submit</span>
              </Button>
            </div>
          </div>
          </SplitPane>
        </div>
      </SplitPane>
    </div>
  );
}


