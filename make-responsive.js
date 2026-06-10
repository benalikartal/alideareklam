const fs = require('fs');

// ─── helper to inject proper mobile CSS into a file ─────────────────────────
function addMobileCSS(file, extraCSS = '') {
  let content = fs.readFileSync(file, 'utf8');

  // Remove any previous injected block
  content = content.replace(/\n\s*\/\* MOBILE RESPONSIVE CSS \*\/[\s\S]*?<\/style>/m, '\n  </style>');

  // --- shared mobile block ---
  const mobileBlock = `
    /* ─── SIDEBAR BACKGROUND FIX ─── */
    .sidebar {
      background: #0f1714 !important;
    }

    /* ─── MOBILE RESPONSIVE ─────────────────────────── */
    .mobile-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.65);
      z-index: 998;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .mobile-overlay.active { display: block; }

    .hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: #fff;
      font-size: 18px;
      width: 40px;
      height: 40px;
      cursor: pointer;
      flex-shrink: 0;
      margin-right: 12px;
      transition: background 0.2s;
    }
    .hamburger:hover { background: rgba(255,255,255,0.12); }

    @media (max-width: 860px) {
      .sidebar {
        position: fixed !important;
        left: 0; top: 0; bottom: 0;
        z-index: 999;
        width: 260px !important;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
        box-shadow: 4px 0 32px rgba(0,0,0,0.6);
      }
      .sidebar.open { transform: translateX(0) !important; }

      .hamburger { display: flex !important; }

      .topbar {
        padding: 0 16px !important;
      }

      .content, .content-area {
        padding: 16px !important;
      }

      .dashboard-grid,
      .stat-row {
        grid-template-columns: 1fr !important;
      }

      .timeline-widget,
      .calendar-widget {
        grid-column: span 1 !important;
      }

      .calendars-wrapper {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }

      table {
        font-size: 13px;
      }

      table th:nth-child(2),
      table td:nth-child(2) {
        max-width: 120px;
        white-space: normal;
        word-break: break-word;
      }

      .widget-header {
        flex-wrap: wrap;
        gap: 8px;
      }

      .stat-card {
        padding: 16px !important;
        gap: 14px !important;
      }

      .stat-icon {
        width: 48px !important;
        height: 48px !important;
        font-size: 22px !important;
        flex-shrink: 0;
      }

      .stat-value { font-size: 24px !important; }

      /* messages chat panel stacking */
      .chat-layout {
        grid-template-columns: 1fr !important;
        grid-template-rows: 280px 1fr;
      }

      .topbar h2 {
        font-size: 15px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
${extraCSS}
  </style>`;

  content = content.replace(/(\s*)<\/style>/, mobileBlock);

  // --- add overlay div right after <body> ---
  if (!content.includes('id="mobileOverlay"')) {
    content = content.replace(/<body>/, '<body>\n  <div class="mobile-overlay" id="mobileOverlay" onclick="closeSidebar()"></div>');
  }

  // --- add hamburger to topbar header (after opening tag only) ---
  if (!content.includes('class="hamburger"')) {
    content = content.replace(
      /(<(?:header|div) class="topbar">)/,
      '$1\n      <button class="hamburger" onclick="openSidebar()">&#9776;</button>'
    );
  }

  // --- add JS functions if not present ---
  if (!content.includes('function openSidebar()')) {
    const jsFunctions = `
    function openSidebar() {
      document.querySelector('.sidebar').classList.add('open');
      document.getElementById('mobileOverlay').classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      document.querySelector('.sidebar').classList.remove('open');
      document.getElementById('mobileOverlay').classList.remove('active');
      document.body.style.overflow = '';
    }
`;
    const lastScript = content.lastIndexOf('</script>');
    content = content.slice(0, lastScript) + jsFunctions + content.slice(lastScript);
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Updated:', file);
}

addMobileCSS('special-customer-dashboard.html');
addMobileCSS('special-customer-payments.html');
addMobileCSS('messages-dashboard.html');
