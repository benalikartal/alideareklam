document.addEventListener('DOMContentLoaded', () => {
    // Sadece görünür olduğunda animasyonu tetikleyen sistem
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.slide-up');
    animatedElements.forEach(el => observer.observe(el));

    // --- COUNTER ANIMATION ---
    const counters = document.querySelectorAll('.counter');
    const counterObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = +counter.getAttribute('data-target');
                const duration = 2000; // 2 saniye sürsün
                const increment = target / (duration / 16);
                
                let current = 0;
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.innerText = Math.ceil(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.innerText = target;
                    }
                };
                
                updateCounter();
                obs.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    // --- LEAD MODAL & FORM LOGIC ---
    const modal = document.getElementById('leadModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const navOpenModalBtn = document.getElementById('navOpenModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const leadForm = document.getElementById('leadForm');
    const successMessage = document.getElementById('formSuccessMessage');
    const submitBtn = document.querySelector('.submit-btn');

    // Only run if modal exists on page (e.g. index.html)
    if (modal && closeModalBtn) {
        
        const openModal = () => {
            modal.classList.remove('hidden');
            // document.body.style.overflow = 'hidden'; // Removed for mobile touch scroll compatibility
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            // document.body.style.overflow = '';
            // Reset form
            setTimeout(() => {
                leadForm.reset();
                successMessage.classList.add('hidden');
                submitBtn.style.display = 'block';
            }, 300);
        };

        if (openModalBtn) openModalBtn.addEventListener('click', openModal);
        if (navOpenModalBtn) navOpenModalBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Form submission
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const btnText = submitBtn.querySelector('.btn-text');
            const spinner = document.getElementById('submitSpinner');
            
            // Show loading state
            if(btnText) btnText.style.opacity = '0';
            if(spinner) spinner.style.display = 'inline-block';
            submitBtn.disabled = true;
            submitBtn.style.cursor = 'not-allowed';

            setTimeout(() => {
                // Collect data
                const formData = new FormData(leadForm);
                const lead = {
                    id: Date.now(),
                    category: formData.get('project_category') || 'Genel',
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    message: formData.get('message'),
                    date: new Date().toLocaleString('tr-TR')
                };

                // Save to localStorage
                try {
                    let existingLeads = JSON.parse(localStorage.getItem('alidea_leads')) || [];
                    existingLeads.push(lead);
                    localStorage.setItem('alidea_leads', JSON.stringify(existingLeads));
                } catch (e) {
                    console.warn("Storage restricted (probably running via file://). Form submitted in-memory only.");
                }

                // Show success overlay
                const formWrap = document.getElementById('formContentWrap');
                const successMsg = document.getElementById('formSuccessMessage');
                
                if(formWrap) formWrap.style.display = 'none';
                if(successMsg) {
                    successMsg.classList.remove('hidden');
                    // Small delay to allow display:block to apply before animating opacity
                    setTimeout(() => successMsg.classList.add('visible'), 50);
                }

                // Auto close after 4 seconds
                setTimeout(() => {
                    closeModal();
                    
                    // Reset to original state after modal is hidden
                    setTimeout(() => {
                        if(formWrap) formWrap.style.display = 'block';
                        if(successMsg) {
                            successMsg.classList.remove('visible');
                            successMsg.classList.add('hidden');
                        }
                        if(btnText) btnText.style.opacity = '1';
                        if(spinner) spinner.style.display = 'none';
                        submitBtn.disabled = false;
                        submitBtn.style.cursor = 'pointer';
                    }, 400);
                }, 4000);
            }, 1500); // 1.5s simulated loading delay
        });
    }
});

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
            // document.body.style.overflow = 'hidden';
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const mobileOverlay = document.getElementById('mobileNavOverlay');
    const closeBtn = document.getElementById('mobileNavCloseBtn');
    if (closeBtn && mobileOverlay) {
        closeBtn.addEventListener('click', () => {
            mobileOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});

// --- FAQ ACCORDION ---
document.addEventListener('DOMContentLoaded', () => {
    const faqTriggers = document.querySelectorAll('.faq-trigger');

    faqTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            const targetId = trigger.getAttribute('aria-controls');
            const answer = document.getElementById(targetId);

            // Diğer açık olanları kapat
            faqTriggers.forEach(other => {
                if (other !== trigger) {
                    const otherId = other.getAttribute('aria-controls');
                    const otherAnswer = document.getElementById(otherId);
                    other.setAttribute('aria-expanded', 'false');
                    other.closest('.faq-item').classList.remove('faq-open');
                    if (otherAnswer) {
                        otherAnswer.style.maxHeight = null;
                        otherAnswer.removeAttribute('style');
                        setTimeout(() => { otherAnswer.hidden = true; }, 320);
                    }
                }
            });

            // Bu elemanı toggle et
            if (isExpanded) {
                trigger.setAttribute('aria-expanded', 'false');
                trigger.closest('.faq-item').classList.remove('faq-open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    answer.style.maxHeight = null;
                    answer.style.opacity = '0';
                });
                setTimeout(() => { answer.hidden = true; answer.style.opacity = ''; }, 320);
            } else {
                trigger.setAttribute('aria-expanded', 'true');
                trigger.closest('.faq-item').classList.add('faq-open');
                answer.hidden = false;
                answer.style.maxHeight = '0px';
                answer.style.opacity = '0';
                requestAnimationFrame(() => {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    answer.style.opacity = '1';
                });
                setTimeout(() => { answer.style.maxHeight = 'none'; }, 320);
            }
        });
    });
});
