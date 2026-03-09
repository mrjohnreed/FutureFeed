document.addEventListener('DOMContentLoaded', () => {
    const dataUrl = 'data/news.json';
    const loader = document.getElementById('loader');
    const contentGrid = document.getElementById('content-grid');
    const lastUpdatedEl = document.getElementById('last-updated');

    // Category mapping text
    const categoryMapping = {
        "מודלי AI (LLM, VLAM, רובוטיקה ועוד)": "מודלי AI",
        "רגולציה, אבטחה ופרטיות": "רגולציה ופרטיות",
        "עסקים (מיזוגים, רכישות ועוד)": "עסקים",
        "פרויקטים ואלגוריתמים מעניינים": "פרויקטים מעניינים"
    };

    // The order we want sections to appear
    const categoryOrder = [
        "מודלי AI (LLM, VLAM, רובוטיקה ועוד)",
        "פרויקטים ואלגוריתמים מעניינים",
        "עסקים (מיזוגים, רכישות ועוד)",
        "רגולציה, אבטחה ופרטיות"
    ];

    async function fetchNews() {
        try {
            // Add a small cache buster for fresh data
            const response = await fetch(`${dataUrl}?t=${new Date().getTime()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const newsData = await response.json();

            if (!newsData || newsData.length === 0) {
                showError("לא נמצאו כרגע עדכונים. נסה שוב מאוחר יותר.");
                return;
            }

            renderNews(newsData);

            // Set last updated time based on newest article
            if (newsData.length > 0) {
                const newest = new Date(newsData[0].published);
                lastUpdatedEl.textContent = `עדכון אחרון: ${formatDateHe(newest)}`;
            }

        } catch (error) {
            console.error("Error fetching news:", error);
            showError("שגיאה בטעינת הנתונים. ייתכן והעדכון טרם פורסם.");
        }
    }

    function renderNews(newsData) {
        // Group by category
        const grouped = {};

        // Initialize groups
        categoryOrder.forEach(cat => {
            grouped[cat] = [];
        });

        newsData.forEach(item => {
            let cat = item.category || "";

            // Normalize categories to handle slight variations from the LLM
            if (cat.includes("מודל")) {
                cat = categoryOrder[0];
            } else if (cat.includes("פרויקט") || cat.includes("אלגוריתם")) {
                cat = categoryOrder[1];
            } else if (cat.includes("עסק") || cat.includes("מיזוג") || cat.includes("רכיש")) {
                cat = categoryOrder[2];
            } else if (cat.includes("רגולצ") || cat.includes("אבטח") || cat.includes("פרטי") || cat.includes("חוק")) {
                cat = categoryOrder[3];
            } else {
                // Fallback to "interesting projects" if model returned something completely different
                cat = categoryOrder[1];
            }

            grouped[cat].push(item);
        });

        // Hide loader
        loader.style.display = 'none';
        contentGrid.style.display = 'flex';
        contentGrid.innerHTML = '';

        // Render each category
        const sectionTemplate = document.getElementById('category-template');
        const cardTemplate = document.getElementById('news-card-template');

        // Only iterate over the predefined 4 categories
        const categoriesToRender = categoryOrder;

        categoriesToRender.forEach(category => {
            const items = grouped[category];
            if (!items || items.length === 0) return;

            // Clone section
            const sectionNode = sectionTemplate.content.cloneNode(true);
            const sectionTitle = sectionNode.querySelector('h2');
            const cardsContainer = sectionNode.querySelector('.cards-container');

            sectionTitle.textContent = categoryMapping[category] || category;

            // Render cards for this category
            items.forEach(item => {
                const cardNode = cardTemplate.content.cloneNode(true);

                cardNode.querySelector('.source-badge').textContent = item.source || "מקור לא ידוע";
                cardNode.querySelector('.card-title').textContent = item.title;
                cardNode.querySelector('.card-summary').textContent = item.summary;

                // Format date
                const pubDate = new Date(item.published);
                cardNode.querySelector('.publish-date').textContent = formatDateHe(pubDate);

                cardNode.querySelector('.read-more').href = item.link;

                cardsContainer.appendChild(cardNode);
            });

            contentGrid.appendChild(sectionNode);
        });

        // Small staggered fade-in animation
        const sections = document.querySelectorAll('.category-section');
        sections.forEach((sec, idx) => {
            sec.style.opacity = '0';
            sec.style.transform = 'translateY(20px)';
            sec.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

            setTimeout(() => {
                sec.style.opacity = '1';
                sec.style.transform = 'translateY(0)';
            }, 100 * idx);
        });
    }

    function showError(msg) {
        loader.innerHTML = `<div style="color: #ff3366; text-align: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 1rem;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>${msg}</p>
        </div>`;
    }

    function formatDateHe(date) {
        return date.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Initialize
    fetchNews();
});
