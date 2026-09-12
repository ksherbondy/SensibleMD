// Scroll Layout Diagnostic Script
// Run this in both Safari (npm run dev) and Electron DevTools (npm run dev:desktop)

(function() {
  console.log('%c=== SCROLL LAYOUT DIAGNOSTIC ===', 'font-weight: bold; background: #222; color: #bada55; padding: 4px 8px;');
  console.log('Environment:', navigator.userAgent);
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  // Basic viewport metrics
  console.log('%c=== VIEWPORT METRICS ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  console.log('window.innerWidth:', window.innerWidth);
  console.log('window.innerHeight:', window.innerHeight);
  console.log('window.devicePixelRatio:', window.devicePixelRatio);
  console.log('');

  // Element.getBoundingClientRect() for key elements
  const elements = {
    'app-shell': document.querySelector('.app-shell'),
    'workspace': document.querySelector('.workspace'),
    'main-area': document.querySelector('.main-area'),
    'scroll-reader': document.querySelector('.scroll-reader'),
    'scroll-reader .document-reader': document.querySelector('.scroll-reader .document-reader'),
    'reading-column': document.querySelector('.reading-column'),
    'scroll-navigation': document.querySelector('.scroll-navigation'),
    'statusbar': document.querySelector('.statusbar')
  };

  console.log('%c=== BOUNDING CLIENT RECT ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  Object.entries(elements).forEach(([name, el]) => {
    if (el) {
      const rect = el.getBoundingClientRect();
      console.log(`${name}:`);
      console.log(`  x: ${rect.x.toFixed(2)}, y: ${rect.y.toFixed(2)}`);
      console.log(`  width: ${rect.width.toFixed(2)}, height: ${rect.height.toFixed(2)}`);
      console.log(`  top: ${rect.top.toFixed(2)}, bottom: ${rect.bottom.toFixed(2)}`);
      console.log(`  left: ${rect.left.toFixed(2)}, right: ${rect.right.toFixed(2)}`);
    } else {
      console.log(`${name}: NOT FOUND`);
    }
  });
  console.log('');

  // Computed styles for scroll-reader
  const scrollReader = document.querySelector('.scroll-reader');
  console.log('%c=== SCROLL-READER COMPUTED STYLES ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  if (scrollReader) {
    const style = getComputedStyle(scrollReader);
    console.log('display:', style.display);
    console.log('width:', style.width);
    console.log('height:', style.height);
    console.log('padding:', style.padding);
    console.log('padding-top:', style.paddingTop);
    console.log('padding-right:', style.paddingRight);
    console.log('padding-bottom:', style.paddingBottom);
    console.log('padding-left:', style.paddingLeft);
    console.log('overflow:', style.overflow);
    console.log('overflowX:', style.overflowX);
    console.log('overflowY:', style.overflowY);
    console.log('containerType:', style.containerType || '(not supported)');
    console.log('boxSizing:', style.boxSizing);
  } else {
    console.log('.scroll-reader NOT FOUND');
  }
  console.log('');

  // Computed styles for document-reader (inside scroll-reader)
  const documentReader = document.querySelector('.scroll-reader .document-reader');
  console.log('%c=== DOCUMENT-READER COMPUTED STYLES ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  if (documentReader) {
    const style = getComputedStyle(documentReader);
    console.log('width:', style.width);
    console.log('height:', style.height);
    console.log('margin:', style.margin);
    console.log('margin-top:', style.marginTop);
    console.log('margin-right:', style.marginRight);
    console.log('margin-bottom:', style.marginBottom);
    console.log('margin-left:', style.marginLeft);
    console.log('padding:', style.padding);
    console.log('padding-top:', style.paddingTop);
    console.log('padding-right:', style.paddingRight);
    console.log('padding-bottom:', style.paddingBottom);
    console.log('padding-left:', style.paddingLeft);
    console.log('overflow:', style.overflow);
    console.log('overflowY:', style.overflowY);
    console.log('background:', style.background);
    console.log('boxSizing:', style.boxSizing);
  } else {
    console.log('.scroll-reader .document-reader NOT FOUND');
  }
  console.log('');

  // Computed styles for reading-column
  const readingColumn = document.querySelector('.reading-column');
  console.log('%c=== READING-COLUMN COMPUTED STYLES ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  if (readingColumn) {
    const style = getComputedStyle(readingColumn);
    console.log('width:', style.width);
    console.log('maxWidth:', style.maxWidth);
    console.log('margin:', style.margin);
    console.log('margin-left:', style.marginLeft);
    console.log('margin-right:', style.marginRight);
    console.log('padding:', style.padding);
    console.log('padding-left:', style.paddingLeft);
    console.log('padding-right:', style.paddingRight);
    console.log('boxSizing:', style.boxSizing);
  } else {
    console.log('.reading-column NOT FOUND');
  }
  console.log('');

  // CSS.supports() tests
  console.log('%c=== CSS SUPPORT TESTS ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  console.log('CSS.supports("container-type: inline-size"):', CSS.supports('container-type: inline-size'));
  console.log('CSS.supports("width: 1cqw"):', CSS.supports('width: 1cqw'));
  console.log('CSS.supports("selector(:has(*))"):', CSS.supports('selector(:has(*))'));
  console.log('CSS.supports("@container"):', CSS.supports('@container'));
  console.log('');

  // CSS Variable inspection
  console.log('%c=== CSS VARIABLE VALUES ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  const rootStyle = getComputedStyle(document.documentElement);
  const readerWidth = rootStyle.getPropertyValue('--reader-width').trim();
  const readerScale = rootStyle.getPropertyValue('--reader-scale').trim();
  const readerLineHeight = rootStyle.getPropertyValue('--reader-line-height').trim();
  console.log('--reader-width:', readerWidth);
  console.log('--reader-scale:', readerScale);
  console.log('--reader-line-height:', readerLineHeight);
  console.log('');

  // Check if .scroll-reader is the query container
  console.log('%c=== CONTAINER QUERY ANALYSIS ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  if (scrollReader) {
    const containerName = scrollReader.getAttribute('data-container-name');
    console.log('container-name attribute:', containerName || '(not set)');
    
    // Check if element is a container
    const isContainer = scrollReader.style.containerType || 
                        scrollReader.getAttribute('container-type') ||
                        getComputedStyle(scrollReader).containerType;
    console.log('Is container:', !!isContainer);
    console.log('computed containerType:', isContainer || '(not a container)');
    
    // Check parent container context
    let parent = scrollReader.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      const parentContainerType = getComputedStyle(parent).containerType;
      if (parentContainerType && parentContainerType !== 'normal') {
        console.log(`Parent at depth ${depth} is a container with type: ${parentContainerType}`);
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
    if (depth >= 5) {
      console.log('No container parent found within 5 levels');
    }
  }
  console.log('');

  // Cascade analysis - check which rules are winning
  console.log('%c=== CASCADE/SPECIFICITY ANALYSIS ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  
  // Get all stylesheets
  const stylesheets = Array.from(document.styleSheets);
  console.log(`Total stylesheets: ${stylesheets.length}`);
  
  // Find index.css
  const indexCss = stylesheets.find(sheet => sheet.href && sheet.href.includes('index'));
  if (indexCss) {
    console.log('Found index.css stylesheet');
    try {
      const rules = Array.from(indexCss.cssRules);
      console.log(`Rules in index.css: ${rules.length}`);
      
      // Find document-reader rules
      const docReaderRules = rules.filter(r => r.selectorText && r.selectorText.includes('.document-reader'));
      console.log(`Rules matching .document-reader: ${docReaderRules.length}`);
      docReaderRules.forEach((rule, i) => {
        console.log(`  Rule ${i}: ${rule.selectorText}`);
        if (rule.style.width) console.log(`    width: ${rule.style.width}`);
        if (rule.style.padding) console.log(`    padding: ${rule.style.padding}`);
        if (rule.style.margin) console.log(`    margin: ${rule.style.margin}`);
        if (rule.style.maxWidth) console.log(`    maxWidth: ${rule.style.maxWidth}`);
      });
      
      // Find scroll-reader rules
      const scrollReaderRules = rules.filter(r => r.selectorText && r.selectorText.includes('.scroll-reader'));
      console.log(`Rules matching .scroll-reader: ${scrollReaderRules.length}`);
      scrollReaderRules.forEach((rule, i) => {
        console.log(`  Rule ${i}: ${rule.selectorText}`);
        if (rule.style.width) console.log(`    width: ${rule.style.width}`);
        if (rule.style.padding) console.log(`    padding: ${rule.style.padding}`);
        if (rule.style.height) console.log(`    height: ${rule.style.height}`);
      });
      
    } catch (e) {
      console.log('Could not read stylesheet rules (CORS restriction):', e.message);
    }
  } else {
    console.log('index.css stylesheet not found in document.styleSheets');
  }
  console.log('');

  // Check for !important declarations
  console.log('%c=== !IMPORTANT CHECK ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  if (documentReader) {
    const styleAttr = documentReader.getAttribute('style');
    console.log('inline style attribute:', styleAttr || '(none)');
    
    // Check specific properties
    const widthStyle = window.getComputedStyle(documentReader).getPropertyValue('width');
    const widthPriority = window.getComputedStyle(documentReader).getPropertyPriority('width');
    console.log('width priority:', widthPriority);
    
    const paddingStyle = window.getComputedStyle(documentReader).getPropertyValue('padding');
    const paddingPriority = window.getComputedStyle(documentReader).getPropertyPriority('padding');
    console.log('padding priority:', paddingPriority);
    
    const marginStyle = window.getComputedStyle(documentReader).getPropertyValue('margin');
    const marginPriority = window.getComputedStyle(documentReader).getPropertyPriority('margin');
    console.log('margin priority:', marginPriority);
  }
  console.log('');

  // Check if .scroll-reader is actually being used
  console.log('%c=== LAYOUT PATH VERIFICATION ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
  const appShell = document.querySelector('.app-shell');
  if (appShell) {
    const hasScrollReader = appShell.querySelector('.scroll-reader');
    console.log('.app-shell contains .scroll-reader:', !!hasScrollReader);
    
    const hasBookReader = appShell.querySelector('.book-reader');
    console.log('.app-shell contains .book-reader:', !!hasBookReader);
    
    const appShellStyle = getComputedStyle(appShell);
    console.log('app-shell display:', appShellStyle.display);
    console.log('app-shell flex:', appShellStyle.flex);
    console.log('app-shell height:', appShellStyle.height);
    console.log('app-shell overflow:', appShellStyle.overflow);
  }
  console.log('');

  // Check .main-area
  if (document.querySelector('.main-area')) {
    const mainAreaStyle = getComputedStyle(document.querySelector('.main-area'));
    console.log('%c=== MAIN-AREA STYLE ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
    console.log('display:', mainAreaStyle.display);
    console.log('flex:', mainAreaStyle.flex);
    console.log('height:', mainAreaStyle.height);
    console.log('overflow:', mainAreaStyle.overflow);
    console.log('min-height:', mainAreaStyle.minHeight);
  }
  console.log('');

  // Check .workspace
  if (document.querySelector('.workspace')) {
    const workspaceStyle = getComputedStyle(document.querySelector('.workspace'));
    console.log('%c=== WORKSPACE STYLE ===', 'font-weight: bold; background: #333; color: #fff; padding: 4px 8px;');
    console.log('display:', workspaceStyle.display);
    console.log('grid-template-columns:', workspaceStyle.gridTemplateColumns);
    console.log('flex:', workspaceStyle.flex);
  }
  console.log('');

  // Final summary
  console.log('%c=== DIAGNOSTIC COMPLETE ===', 'font-weight: bold; background: #222; color: #bada55; padding: 4px 8px;');
  console.log('Compare the output above between Safari and Electron to identify the root cause.');
  console.log('');
  console.log('Geometry difference indicators:');
  console.log('  - Different window.innerWidth/Height');
  console.log('  - Different bounding rect sizes for same elements');
  console.log('  - Different container query behavior');
  console.log('');
  console.log('CSS behavior difference indicators:');
  console.log('  - Different computed values for same properties');
  console.log('  - Different !important application');
  console.log('  - Different cascade order');
  console.log('  - CSS.supports() returning different values');
  console.log('');

})();
