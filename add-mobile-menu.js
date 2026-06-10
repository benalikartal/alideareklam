const fs = require('fs');

const htmlFiles = [
    'index.html',
    'iarone.html',
    'portfolio.html',
    'team.html',
    'websitesgo.html'
];

const mobileMenuHtml = `
    <!-- Mobile Menu Overlay -->
    <div class="mobile-nav-overlay" id="mobileNavOverlay">
        <ul class="mobile-nav-links">
            <li><a href="index.html">Ana Sayfa</a></li>
            <li><a href="portfolio.html">Portföy</a></li>
            <li><a href="iarone.html">Iarone</a></li>
            <li><a href="websitesgo.html">Websitesgo</a></li>
            <li><a href="team.html">Ekip</a></li>
            <li><a id="mobileNavOpenModalBtn" class="btn btn-primary" style="cursor:pointer; margin-top: 1rem;">Projeye Başla</a></li>
        </ul>
    </div>
`;

htmlFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Skip if already has mobile menu button
    if (content.includes('mobile-menu-btn')) return;

    // Add hamburger button to nav-container
    // Find the end of <ul class="nav-links">...</ul>
    content = content.replace(/(<\/ul>\s*<a id="navOpenModalBtn"[^>]*>.*?<\/a>\s*)(<\/div>\s*<\/nav>)/, `$1<button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>\n        $2\n${mobileMenuHtml}`);

    // If the above regex fails (e.g. some files don't have navOpenModalBtn), try a generic replace
    if (!content.includes('mobile-menu-btn')) {
        content = content.replace(/(<\/ul>\s*)(<\/div>\s*<\/nav>)/, `$1<button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>\n        $2\n${mobileMenuHtml}`);
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});

// Append CSS
const cssAppend = `
/* --- MOBILE MENU FIX --- */
.mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    color: inherit;
    font-size: 2rem;
    cursor: pointer;
    z-index: 1002;
    padding: 0 0.5rem;
}
.mobile-nav-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: var(--bg-primary);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease-in-out;
}
/* Allow dark navbar to look okay */
.dark-navbar ~ .mobile-nav-overlay {
    background: #000;
}
.dark-navbar ~ .mobile-nav-overlay a {
    color: #fff;
}

.mobile-nav-overlay.active {
    opacity: 1;
    pointer-events: auto;
}
.mobile-nav-links {
    list-style: none;
    text-align: center;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}
.mobile-nav-links a {
    font-size: 2rem;
    font-weight: 600;
    color: var(--text-primary);
    text-decoration: none;
}
.mobile-nav-links .btn {
    font-size: 1.2rem;
    padding: 1rem 2rem;
}
@media (max-width: 768px) {
    .mobile-menu-btn {
        display: block !important;
    }
    #navOpenModalBtn {
        display: none !important;
    }
    .nav-container {
        justify-content: space-between !important;
    }
}
`;

fs.appendFileSync('styles.css', cssAppend, 'utf8');
console.log('Updated styles.css');

// Append JS
const jsAppend = `
// Mobile Menu Logic
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileOverlay = document.getElementById('mobileNavOverlay');
    const mobileModalBtn = document.getElementById('mobileNavOpenModalBtn');
    const mainModal = document.getElementById('leadModal');

    if (mobileBtn && mobileOverlay) {
        mobileBtn.addEventListener('click', () => {
            mobileOverlay.classList.toggle('active');
            // Change icon
            if (mobileOverlay.classList.contains('active')) {
                mobileBtn.innerHTML = '✕';
                document.body.style.overflow = 'hidden';
            } else {
                mobileBtn.innerHTML = '☰';
                document.body.style.overflow = '';
            }
        });
        
        // Close menu when a link is clicked
        const links = mobileOverlay.querySelectorAll('a:not(#mobileNavOpenModalBtn)');
        links.forEach(link => {
            link.addEventListener('click', () => {
                mobileOverlay.classList.remove('active');
                mobileBtn.innerHTML = '☰';
                document.body.style.overflow = '';
            });
        });
    }

    if (mobileModalBtn && mainModal) {
        mobileModalBtn.addEventListener('click', () => {
            // close mobile menu
            mobileOverlay.classList.remove('active');
            mobileBtn.innerHTML = '☰';
            
            // open modal
            mainModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }
});
`;

fs.appendFileSync('script.js', jsAppend, 'utf8');
console.log('Updated script.js');
