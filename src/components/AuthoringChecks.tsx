import { useLayoutEffect, useRef } from 'react';
import { Check, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react';
import type { AccessibilityFinding, FindingSeverity } from '../core/accessibility-diagnostics';

export function AuthoringChecks({ open, onOpenChange, filter, onFilterChange, findings, onFinding }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: FindingSeverity | 'all';
  onFilterChange: (filter: FindingSeverity | 'all') => void;
  findings: AccessibilityFinding[];
  onFinding: (finding: AccessibilityFinding) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const previousOpen = useRef(open);
  useLayoutEffect(() => {
    if (previousOpen.current === open) return;
    previousOpen.current = open;
    (open ? closeRef : openRef).current?.focus();
  }, [open]);
  return <>
    <aside id="authoring-checks" className="findings-panel" aria-label="Authoring checks" hidden={!open}>
      <div className="findings-heading">
        <Sparkles size={17} aria-hidden="true" />
        <span>Authoring checks</span>
        <strong>{findings.length}</strong>
        <button ref={closeRef} type="button" className="icon-button" aria-label="Hide authoring checks" title="Hide authoring checks" aria-expanded={open} aria-controls="authoring-checks" onClick={() => onOpenChange(false)}>
          <PanelRightClose size={17} />
        </button>
      </div>
      <nav className="diagnostics-filter" aria-label="Diagnostic severity filter">
        {(['all', 'error', 'warning'] as const).map(value => <button key={value} type="button" className={filter === value ? 'selected' : ''} aria-pressed={filter === value} onClick={() => onFilterChange(value)}>
          {{ all: 'All', error: 'Errors', warning: 'Warnings' }[value]}
        </button>)}
      </nav>
      {findings.length ? findings.map(finding => <button type="button" key={finding.id} className={`finding ${finding.severity}`} onClick={() => onFinding(finding)}>
        <span>{finding.ruleId} · {finding.confidence}</span>
        <p>{finding.title}</p>
        <small>Line {finding.line}</small>
      </button>) : <div className="all-clear"><Check size={22} /><p>No structural issues found.</p></div>}
    </aside>
    <button ref={openRef} type="button" className="checks-restore" hidden={open} aria-label="Show authoring checks" title="Show authoring checks" aria-expanded={open} aria-controls="authoring-checks" onClick={() => onOpenChange(true)}>
      <PanelRightOpen size={17} /><span>Authoring checks</span>
    </button>
  </>;
}
