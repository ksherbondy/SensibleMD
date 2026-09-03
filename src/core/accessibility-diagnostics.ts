export type FindingSeverity = 'error' | 'warning' | 'advisory' | 'info'
export type FindingConfidence = 'high' | 'medium' | 'low'

export interface AccessibilityFinding {
  id: string
  ruleId: string
  severity: FindingSeverity
  confidence: FindingConfidence
  title: string
  explanation: string
  remediation: string
  line: number
}

function finding(ruleId: string, severity: FindingSeverity, confidence: FindingConfidence, title: string, explanation: string, remediation: string, line: number): AccessibilityFinding {
  return { id: `${ruleId}-${line}`, ruleId, severity, confidence, title, explanation, remediation, line }
}

export function analyzeAccessibility(source: string): AccessibilityFinding[] {
  const lines = source.split('\n')
  const findings: AccessibilityFinding[] = []
  let previousHeadingLevel = 0
  let firstHeading = true

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const heading = /^(#{1,6})\s*(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const text = heading[2].trim()
      if (firstHeading && level > 1) findings.push(finding('HEAD-006', 'advisory', 'low', 'Document starts below heading level 1.', 'This may be intentional for a Markdown fragment, but a complete document usually starts with a level-one heading.', 'Confirm this document is intentionally a fragment or begin with a level-one heading.', lineNumber))
      if (previousHeadingLevel && level > previousHeadingLevel + 1) findings.push(finding('HEAD-001', 'warning', 'high', `Heading hierarchy jumps from level ${previousHeadingLevel} to level ${level}.`, 'Skipped heading levels can make the document outline misleading for screen-reader navigation.', `Use a level ${previousHeadingLevel + 1} heading unless an intermediate level is intentionally omitted.`, lineNumber))
      if (!text) findings.push(finding('HEAD-002', 'error', 'high', 'Heading has no accessible text.', 'A heading without text does not provide a useful navigation label.', 'Add a concise heading that describes the section.', lineNumber))
      if (text && /^[^\w]+$/.test(text)) findings.push(finding('HEAD-004', 'warning', 'medium', 'Heading contains only punctuation or symbols.', 'Symbol-only headings do not describe their section to readers or assistive technology.', 'Replace it with descriptive heading text.', lineNumber))
      if (text.length > 90) findings.push(finding('HEAD-005', 'advisory', 'low', 'Heading is unusually long.', 'Long headings can be cumbersome in outlines and spoken navigation.', 'Consider a shorter heading that preserves the section meaning.', lineNumber))
      previousHeadingLevel = level
      firstHeading = false
    }

    for (const match of line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
      const alt = match[1].trim()
      if (!alt) findings.push(finding('IMG-002', 'advisory', 'medium', 'Image has empty alternative text.', 'Empty alternative text may be correct for decorative images, but informative images need a description.', 'Confirm the image is decorative or add concise alternative text.', lineNumber))
      if (/^(image|img|screenshot)[_ -]?\d*\.(png|jpe?g|gif|webp)$/i.test(alt)) findings.push(finding('IMG-003', 'warning', 'medium', 'Alternative text appears to be a filename.', 'A filename usually does not describe the information the image communicates.', 'Replace the filename with the image purpose or meaningful content.', lineNumber))
      if (/^(image|picture|photo) of\s/i.test(alt)) findings.push(finding('IMG-004', 'advisory', 'medium', 'Alternative text repeats the image role.', 'Screen readers already announce an image before its alternative text.', 'Start with the image content unless its medium is meaningful.', lineNumber))
    }

    if (/\[\s*\]\([^)]*\)/.test(line)) findings.push(finding('LINK-001', 'error', 'high', 'Link has no accessible text.', 'A link without text has no useful accessible name.', 'Add concise text that describes the destination.', lineNumber))
    if (/\[[^\]]+\]\(\s*\)/.test(line)) findings.push(finding('LINK-002', 'error', 'high', 'Link destination is empty.', 'A link with no destination cannot take readers to the intended content.', 'Add a valid destination or remove the link.', lineNumber))
    if (/\[\s*(click here|here|more|read more|this)\s*\]\([^)]*\)/i.test(line)) findings.push(finding('LINK-003', 'warning', 'medium', 'Link text may not describe its destination.', 'Generic link text may be unclear when links are navigated out of surrounding context.', 'Use text that names the destination or action.', lineNumber))
    if (/^```\s*$/.test(line)) findings.push(finding('CODE-001', 'advisory', 'medium', 'Code block has no language identifier.', 'Language metadata can improve syntax highlighting and navigation context.', 'Add a language after the opening fence when it is known.', lineNumber))
  })
  return findings
}