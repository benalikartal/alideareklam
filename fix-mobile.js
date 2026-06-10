const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

// Remove previous block
css = css.replace(/\/\* ¦¦¦ GLOBAL MOBILE RESPONSIVENESS FIXES.*$/s, '');

// Append perfect block
const newBlock = \
/* ¦¦¦ GLOBAL MOBILE RESPONSIVENESS FIXES (FORCE OVERRIDES) ¦¦¦ */
@media (max-width: 768px) {
    html, body {
        overflow-x: hidden !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    
    /* Hero Section Constraints */
    .hero {
        padding-top: 5rem !important;
        padding-bottom: 2rem !important;
        min-height: auto !important;
        width: 100% !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
    }
    
    .hero-content {
        padding: 0 1rem !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }
    
    .hero-left {
        width: 100% !important;
        padding: 0 !important;
    }
    
    /* Hero Typography */
    .hero h1, h1 {
        font-size: clamp(1.8rem, 7vw, 2.5rem) !important;
        line-height: 1.15 !important;
        letter-spacing: -0.02em !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        width: 100% !important;
    }
    .hero p {
        font-size: 0.95rem !important;
        line-height: 1.5 !important;
        padding: 0 !important;
        width: 100% !important;
    }
    
    /* Hero Buttons Container */
    .hero-actions {
        flex-direction: column !important;
        align-items: center !important;
        width: 100% !important;
        padding: 0 !important;
        margin-top: 1.5rem !important;
        gap: 0.8rem !important;
    }
    
    /* Hero Buttons */
    .hero-actions a.btn {
        width: 100% !important;
        max-width: 100% !important;
        flex: none !important;
        text-align: center !important;
        display: flex !important;
        justify-content: center !important;
        box-sizing: border-box !important;
    }
    
    /* Nav & Headers */
    .nav-container {
        padding: 1rem !important;
    }
    
    /* Fix potential horizontal scrolling causes */
    .ticker-wrap {
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
    }
    section {
        overflow-x: hidden !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
    }
    .creative-arm, .tech-arm, .giant-cta, .metrics {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }
    .arm-content h2, .giant-cta h2 {
        font-size: 1.8rem !important;
    }
}
\;

fs.writeFileSync('styles.css', css + newBlock, 'utf8');
console.log('Fixed CSS');
