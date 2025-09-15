
const API_URL = 'https://schooldb.skillline.ru/api/schools';

let currentPage = 1;
let perPage = 10;

// последние известные корректные значения пагинации (если API временно падает)
let lastPagesCount = 0;
let lastTotalCount = 0;

const perPageSelect = document.getElementById('perPage');
const searchInput = document.getElementById('q');

// Инициализируем селект значением по-умолчанию (если нужно)
if (perPageSelect) perPageSelect.value = String(perPage);

async function fetchSchools() {
    const q = (searchInput && searchInput.value) ? searchInput.value : '';
    const url = `${API_URL}?page=${currentPage}&count=${perPage}&q=${encodeURIComponent(q || '')}`;

    let data;

    try {
        const res = await fetch(url);

        if (!res.ok) {
            console.error("Ошибка ответа от сервера:", res.status);
            // Рисуем пустую таблицу, но пагинацию показываем по последним известным значениям
            renderTable([]);
            renderPagination(currentPage, lastPagesCount || 1, lastTotalCount || 0, []);
            return;
        }

        data = await res.json();
    } catch (err) {
        console.error("Ошибка при запросе:", err);
        renderTable([]);
        renderPagination(currentPage, lastPagesCount || 1, lastTotalCount || 0, []);
        return;
    }

    const LIST = data?.data?.list || [];
    const PAGE = data?.data?.page || currentPage;
    const PAGES_COUNT = (typeof data?.data?.pages_count === 'number') ? data.data.pages_count : lastPagesCount;
    const TOTAL_COUNT = (typeof data?.data?.total_count === 'number') ? data.data.total_count : lastTotalCount;

    // Сохраняем последние корректные значения, чтобы использовать при ошибках
    lastPagesCount = PAGES_COUNT || lastPagesCount;
    lastTotalCount = TOTAL_COUNT || lastTotalCount;

    renderTable(LIST);
    renderPagination(PAGE, PAGES_COUNT, TOTAL_COUNT, LIST);
}

function renderTable(schools) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!schools || schools.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td colspan="4" style="text-align:center; color:#888; padding: 20px;">
        Данных нет
      </td>
    `;
        tbody.appendChild(tr);
        return;
    }

    schools.forEach(s => {
        const tr = document.createElement('tr');

        const level_edu = [...new Set(
            (s.supplements?.[0]?.educational_programs || []).map(prog => {
                const name = prog?.edu_level?.name || '';
                switch (name) {
                    case "Высшее образование - магистратура": return "Высшее";
                    case "Высшее профессиональное образование": return "Проф";
                    case "Высшее образование - бакалавриат": return "Бакалавр";
                    case "Высшее образование - специалитет": return "Специальное";
                    default: return "Среднее";
                }
            })
        )];

        tr.innerHTML = `
      <td class="control__region-name"><input type="checkbox" class="rowCheck"><p>${s.edu_org?.region?.name || '-'}</p></td>
      <td class="control__scool-name"><p>${s.edu_org?.short_name || 'Не задано'}</p></td>
      <td class="control__address"><p>${s.edu_org?.contact_info?.post_address || '-'}</p></td>
      <td class="control__education-level">${level_edu.map(edu => `<span class="tag">${edu}</span>`).join(' ')}</td>
    `;
        tbody.appendChild(tr);
    });
}

function renderPagination(page, totalPages, totalCount, currentList) {
    // page - текущая страница (из ответа или текущая)
    // totalPages - общее число страниц (от API или lastPagesCount)
    // totalCount - общее число записей
    // currentList - текущий массив записей (может быть пустым)

    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');

    // Безопасные значения
    const pages = Math.max(1, totalPages || lastPagesCount || 1);
    const total = Math.max(0, totalCount || lastTotalCount || 0);
    const listLen = (currentList && currentList.length) ? currentList.length : 0;

    // Формируем текст info
    let infoText;
    if (listLen === 0) {
        infoText = `Записи отсутствуют — 0 из ${total} записей`;
    } else {
        const start = (page - 1) * listLen + 1;
        let end = start + listLen - 1;
        if (end > total) end = total;
        infoText = `${start}-${end} из ${total} записей`;
    }
    if (pageInfo) pageInfo.textContent = infoText;

    // Рисуем пагинацию (стрелки + номера + троеточия)
    pagination.innerHTML = '';

    // создаём стрелки (новые <img> каждый раз, чтобы не перемещать элемент по DOM)
    const arrowPrevImg = document.createElement('img');
    arrowPrevImg.src = "img/buttonPrev.png";
    arrowPrevImg.alt = "prev";

    const arrowNextImg = document.createElement('img');
    arrowNextImg.src = "img/buttonNext.png";
    arrowNextImg.alt = "next";

    const createBtn = (content, disabled = false, onClick = null, isActive = false, extraClass = '') => {
        const btn = document.createElement('button');

        if (content instanceof Node) {
            btn.appendChild(content);
        } else {
            btn.textContent = content;
        }

        if (extraClass) btn.classList.add(extraClass);
        if (isActive) btn.classList.add('active');
        if (disabled) btn.classList.add('disabled');

        if (disabled) {
            btn.disabled = true;
        } else if (onClick) {
            btn.addEventListener('click', onClick);
        }

        pagination.appendChild(btn);
    };

    // Prev
    createBtn(arrowPrevImg, page <= 1, () => {
        if (page > 1) {
            currentPage = page - 1;
            fetchSchools();
        }
    }, false, 'control__button-prev');

    // Показать номера (умная логика: если мало страниц — все показываем, иначе 1 ... range ... last)
    if (pages <= 10) {
        for (let i = 1; i <= pages; i++) {
            createBtn(i, false, () => {
                currentPage = i;
                fetchSchools();
            }, i === page, 'control__button-page');
        }
    } else {
        // первая
        createBtn(1, false, () => { currentPage = 1; fetchSchools(); }, page === 1, 'control__button-page');

        // left ellipsis
        if (page > 4) {
            const span = document.createElement('span'); span.textContent = '...'; pagination.appendChild(span);
        }

        // window around current
        const start = Math.max(2, page - 2);
        const end = Math.min(pages - 1, page + 2);
        for (let i = start; i <= end; i++) {
            createBtn(i, false, () => { currentPage = i; fetchSchools(); }, i === page, 'control__button-page');
        }

        // right ellipsis
        if (page < pages - 3) {
            const span = document.createElement('span'); span.textContent = '...'; pagination.appendChild(span);
        }

        // last
        createBtn(pages, false, () => { currentPage = pages; fetchSchools(); }, page === pages, 'control__button-page');
    }

    // Next
    createBtn(arrowNextImg, page >= pages, () => {
        if (page < pages) {
            currentPage = page + 1;
            fetchSchools();
        }
    }, false, 'control__button-next');
}


// смена perPage(смена количества записей для вывода): сохраняем позицию первой записи и вычисляем новую страницу,
// чтобы посетитель оставался на той же позиции в общем списке записей
if (perPageSelect) {
    perPageSelect.addEventListener('change', (e) => {
        const newPer = +e.target.value;
        if (!newPer || newPer === perPage) return;

        // индекс первой записи на текущей странице (0-based)
        const firstItemIndex = (currentPage - 1) * perPage;
        // новая страница, содержащая ту же запись
        const newPage = Math.floor(firstItemIndex / newPer) + 1;
        perPage = newPer;
        currentPage = Math.max(1, newPage);
        fetchSchools();
    });
}

// поиск по Enter или кнопке — пример (если есть кнопка поиска, можно навесить событие)
// if (searchInput) {
//     searchInput.addEventListener('keyup', (e) => {
//         if (e.key === 'Enter') {
//             currentPage = 1;
//             fetchSchools();
//         }
//     });
// }


fetchSchools();
