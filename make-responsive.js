const fs = require('fs');
const files = [
  'special-customer-dashboard.html',
  'special-customer-payments.html',
  'messages-dashboard.html'
];

const cssBlock = `
    /* MOBILE RESPONSIVE CSS */
    .mobile-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 998;
      backdrop-filter: blur(4px);
    }
    .hamburger {
      display: none;
      background: none;
      border: none;
      color: var(--text);
      font-size: 24px;
      cursor: pointer;
      margin-right: 16px;
    }
    @media (max-width: 900px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 999;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .mobile-overlay.active {
        display: block;
      }
      .hamburger {
        display: block;
      }
      .grid {
        grid-template-columns: 1fr !important;
      }
      .stats-grid, .panels-grid, .content-grid, .overview-cards, .dashboard-grid {
        grid-template-columns: 1fr !important;
      }
      .topbar {
        padding: 0 16px;
      }
      .content-area, .content {
        padding: 16px;
      }
      .main-content {
        width: 100%;
        max-width: 100vw;
      }
      /* Chat layout specific for messages */
      .chat-layout {
        grid-template-columns: 1fr !important;
      }
      .chat-list {
        display: block; /* Could hide one or the other, but stacking is safer for now */
      }
    }
  </style>
`;

const jsBlock = `
    function openSidebar() {
      const sb = document.querySelector('.sidebar');
      const mo = document.getElementById('mobileOverlay');
      if (sb) sb.classList.add('open');
      if (mo) mo.classList.add('active');
    }
    function closeSidebar() {
      const sb = document.querySelector('.sidebar');
      const mo = document.getElementById('mobileOverlay');
      if (sb) sb.classList.remove('open');
      if (mo) mo.classList.remove('active');
    }
  </script>
`;

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(file + ' not found');
    return;
  }
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('.mobile-overlay')) {
    content = content.replace('</style>', cssBlock);
    content = content.replace('<body>', '<body>\n  <div class="mobile-overlay" id="mobileOverlay" onclick="closeSidebar()"></div>');
    
    // For topbars:
    const hamburgerBtn = '\n        <button class="hamburger" onclick="openSidebar()">☰</button>';
    content = content.replace(/<div class="topbar">/g, '<div class="topbar">' + hamburgerBtn);
    content = content.replace(/<header class="topbar">/g, '<header class="topbar">' + hamburgerBtn);
    
    // For JS
    // Ensure we don't accidentally replace all script tags, just the last one or append to body end.
    const lastScriptIndex = content.lastIndexOf('</script>');
    if (lastScriptIndex !== -1) {
      content = content.substring(0, lastScriptIndex) + jsBlock + content.substring(lastScriptIndex + 9);
    } else {
      content = content.replace('</body>', jsBlock + '\n</body>');
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated: ' + file);
  } else {
    console.log('Already updated: ' + file);
  }
});
