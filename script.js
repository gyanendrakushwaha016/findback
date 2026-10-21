// FindBack Lost and Found - Interactive Application Controller
document.addEventListener('DOMContentLoaded', () => {
  // ===================================================
  // DATA STORE (No dummy/extra data, only user submitted)
  // ===================================================
  const STORAGE_KEY = 'findback_reported_items';

  function loadStoredItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
      return [];
    }
  }

  function persistItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Storage quota exceeded, storing without large images:', e);
      try {
        const lightweight = items.map((it) => ({
          ...it,
          imageUrl: it.imageUrl && it.imageUrl.length > 50000 ? '' : it.imageUrl,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
      } catch (err) {
        console.error('Failed to persist items:', err);
      }
    }
  }

  // Active in-memory items array (starts empty if user hasn't filled anything yet)
  let itemsList = loadStoredItems();

  // Temporary holders for uploaded image previews (base64)
  let currentLostImagePreview = '';
  let currentFoundImagePreview = '';

  // Current Browse Filter State
  let currentTypeFilter = 'all';
  let currentCategoryFilter = 'all';
  let currentSearchQuery = '';

  // ===================================================
  // DOM ELEMENTS
  // ===================================================
  // Sections
  const reportSection = document.getElementById('report-section');
  const browseSection = document.getElementById('browse-section');
  const formCard = document.getElementById('form-card');
  const lostFormWrapper = document.getElementById('lost-form-wrapper');
  const foundFormWrapper = document.getElementById('found-form-wrapper');
  const formSuccessCard = document.getElementById('form-success-card');

  // Navigation Links
  const navHome = document.getElementById('nav-home');
  const navBrowse = document.getElementById('nav-browse');

  // Hero CTA Buttons
  const btnReportLost = document.getElementById('btn-report-lost');
  const btnReportFound = document.getElementById('btn-report-found');
  const btnBrowseItems = document.getElementById('btn-browse-items');

  // Stats Counters
  const lostCountEl = document.getElementById('stats-lost-count');
  const foundCountEl = document.getElementById('stats-found-count');

  // Form Tabs & Close
  const tabLost = document.getElementById('tab-lost');
  const tabFound = document.getElementById('tab-found');
  const btnCloseForm = document.getElementById('btn-close-form');

  // Forms
  const lostForm = document.getElementById('lost-form');
  const foundForm = document.getElementById('found-form');

  // Browse Elements
  const btnCloseBrowse = document.getElementById('btn-close-browse');
  const btnBrowseBackHome = document.getElementById('btn-browse-back-home');
  const btnBrowseReportLost = document.getElementById('btn-browse-report-lost');
  const btnBrowseReportFound = document.getElementById('btn-browse-report-found');
  const browseSearchInput = document.getElementById('browse-search-input');
  const browseSearchClear = document.getElementById('browse-search-clear');
  const browseCategoryFilter = document.getElementById('browse-category-filter');
  const browseItemsGrid = document.getElementById('browse-items-grid');
  const countFilterAll = document.getElementById('count-filter-all');
  const countFilterLost = document.getElementById('count-filter-lost');
  const countFilterFound = document.getElementById('count-filter-found');

  // Set max date for date pickers to today
  const todayStr = new Date().toISOString().split('T')[0];
  const lostDateInput = document.getElementById('lost-date');
  const foundDateInput = document.getElementById('found-date');
  if (lostDateInput) lostDateInput.setAttribute('max', todayStr);
  if (foundDateInput) foundDateInput.setAttribute('max', todayStr);

  // ===================================================
  // TOAST NOTIFICATIONS
  // ===================================================
  const toastContainer = document.getElementById('toast-container');
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `<i class="${iconClass}"></i> <span>${escapeHTML(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ===================================================
  // STATS UPDATE
  // ===================================================
  function updateStats() {
    const lostCount = itemsList.filter((it) => it.type === 'lost').length;
    const foundCount = itemsList.filter((it) => it.type === 'found').length;

    if (lostCountEl) lostCountEl.textContent = lostCount;
    if (foundCountEl) foundCountEl.textContent = foundCount;

    if (countFilterAll) countFilterAll.textContent = itemsList.length;
    if (countFilterLost) countFilterLost.textContent = lostCount;
    if (countFilterFound) countFilterFound.textContent = foundCount;
  }
  updateStats();

  // ===================================================
  // NAVIGATION CONTROLLER
  // ===================================================
  function setActiveNav(target) {
    if (navHome) navHome.classList.remove('active');
    if (navBrowse) navBrowse.classList.remove('active');

    if (target === 'home' && navHome) navHome.classList.add('active');
    if (target === 'browse' && navBrowse) navBrowse.classList.add('active');
  }

  // Helper: Open Form Section
  function openForm(type) {
    // Hide Browse Section if open
    if (browseSection) {
      browseSection.classList.add('hidden');
      browseSection.style.display = 'none';
    }

    if (!reportSection) return;
    reportSection.classList.remove('hidden');
    reportSection.style.display = 'flex';
    if (formSuccessCard) formSuccessCard.style.display = 'none';

    setActiveNav('home');

    if (type === 'lost') {
      if (lostFormWrapper) lostFormWrapper.style.display = 'block';
      if (foundFormWrapper) foundFormWrapper.style.display = 'none';

      if (tabLost) tabLost.className = 'form-tab-btn active-lost';
      if (tabFound) tabFound.className = 'form-tab-btn';

      const firstInput = document.getElementById('lost-item-name');
      if (firstInput) setTimeout(() => firstInput.focus(), 150);
    } else {
      if (foundFormWrapper) foundFormWrapper.style.display = 'block';
      if (lostFormWrapper) lostFormWrapper.style.display = 'none';

      if (tabFound) tabFound.className = 'form-tab-btn active-found';
      if (tabLost) tabLost.className = 'form-tab-btn';

      const firstInput = document.getElementById('found-item-name');
      if (firstInput) setTimeout(() => firstInput.focus(), 150);
    }

    reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Helper: Close Form Section
  function closeForm() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveNav('home');
    setTimeout(() => {
      if (reportSection) {
        reportSection.classList.add('hidden');
        reportSection.style.display = 'none';
      }
    }, 350);
  }

  // Helper: Open Browse Section
  function openBrowse(targetIdToHighlight = null) {
    // Hide Report Section if open
    if (reportSection) {
      reportSection.classList.add('hidden');
      reportSection.style.display = 'none';
    }

    if (!browseSection) return;
    browseSection.classList.remove('hidden');
    browseSection.style.display = 'flex';

    setActiveNav('browse');
    updateStats();
    renderBrowseItems();

    browseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (targetIdToHighlight) {
      setTimeout(() => {
        const targetCard = document.querySelector(`.browse-card-item[data-id="${targetIdToHighlight}"]`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
          targetCard.style.transform = 'scale(1.03)';
          targetCard.style.boxShadow = '0 0 25px rgba(56, 189, 248, 0.6)';
          setTimeout(() => {
            targetCard.style.transform = '';
            targetCard.style.boxShadow = '';
          }, 1500);
        }
      }, 400);
    }
  }

  // Helper: Close Browse Section
  function closeBrowse() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveNav('home');
    setTimeout(() => {
      if (browseSection) {
        browseSection.classList.add('hidden');
        browseSection.style.display = 'none';
      }
    }, 350);
  }

  // ===================================================
  // EVENT LISTENERS: TRIGGERS & NAVIGATION
  // ===================================================
  if (btnReportLost) {
    btnReportLost.addEventListener('click', (e) => {
      e.preventDefault();
      openForm('lost');
    });
  }

  if (btnReportFound) {
    btnReportFound.addEventListener('click', (e) => {
      e.preventDefault();
      openForm('found');
    });
  }

  if (btnBrowseItems) {
    btnBrowseItems.addEventListener('click', (e) => {
      e.preventDefault();
      openBrowse();
    });
  }

  if (navHome) {
    navHome.addEventListener('click', (e) => {
      e.preventDefault();
      closeForm();
      closeBrowse();
    });
  }

  if (navBrowse) {
    navBrowse.addEventListener('click', (e) => {
      e.preventDefault();
      openBrowse();
    });
  }

  // Form card tabs
  if (tabLost) {
    tabLost.addEventListener('click', () => openForm('lost'));
  }
  if (tabFound) {
    tabFound.addEventListener('click', () => openForm('found'));
  }

  // Close buttons
  if (btnCloseForm) {
    btnCloseForm.addEventListener('click', closeForm);
  }
  document.querySelectorAll('.btn-back-home').forEach((btn) => {
    btn.addEventListener('click', closeForm);
  });

  if (btnCloseBrowse) {
    btnCloseBrowse.addEventListener('click', closeBrowse);
  }
  if (btnBrowseBackHome) {
    btnBrowseBackHome.addEventListener('click', closeBrowse);
  }
  if (btnBrowseReportLost) {
    btnBrowseReportLost.addEventListener('click', () => openForm('lost'));
  }
  if (btnBrowseReportFound) {
    btnBrowseReportFound.addEventListener('click', () => openForm('found'));
  }

  // ===================================================
  // IMAGE DRAG & DROP WITH PREVIEW
  // ===================================================
  function setupDropzone(dropzoneId, inputId, previewBarId, previewImgId, previewNameId, previewSizeId, removeBtnId, isLost) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);
    const previewBar = document.getElementById(previewBarId);
    const previewImg = document.getElementById(previewImgId);
    const previewName = document.getElementById(previewNameId);
    const previewSize = document.getElementById(previewSizeId);
    const removeBtn = document.getElementById(removeBtnId);
    const dropzoneContent = dropzone ? dropzone.querySelector('.dropzone-content') : null;

    if (!dropzone || !input) return;

    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function handleFile(file) {
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file (PNG, JPG, WEBP).', 'warning');
        input.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file size must be less than 5MB.', 'warning');
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (isLost) {
          currentLostImagePreview = dataUrl;
        } else {
          currentFoundImagePreview = dataUrl;
        }

        if (previewImg) previewImg.src = dataUrl;
        if (previewName) previewName.textContent = file.name;
        if (previewSize) previewSize.textContent = formatFileSize(file.size);

        if (previewBar) previewBar.style.display = 'flex';
        if (dropzoneContent) dropzoneContent.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }

    input.addEventListener('change', () => {
      if (input.files && input.files[0]) {
        handleFile(input.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        handleFile(e.dataTransfer.files[0]);
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        if (isLost) currentLostImagePreview = '';
        else currentFoundImagePreview = '';

        if (previewBar) previewBar.style.display = 'none';
        if (dropzoneContent) dropzoneContent.style.display = 'block';
        if (previewImg) previewImg.src = '';
      });
    }
  }

  setupDropzone('lost-dropzone', 'lost-image', 'lost-preview-bar', 'lost-preview-img', 'lost-preview-name', 'lost-preview-size', 'lost-remove-file', true);
  setupDropzone('found-dropzone', 'found-image', 'found-preview-bar', 'found-preview-img', 'found-preview-name', 'found-preview-size', 'found-remove-file', false);

  // Live Error Clearing
  function attachLiveClear(form) {
    if (!form) return;
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((el) => {
      const clearError = () => {
        if (el.classList.contains('input-invalid')) {
          el.classList.remove('input-invalid');
          const errEl = form.querySelector(`#err-${el.id}`);
          if (errEl) {
            errEl.textContent = '';
            errEl.classList.remove('visible');
          }
        }
      };
      el.addEventListener('input', clearError);
      el.addEventListener('change', clearError);
    });
  }

  attachLiveClear(lostForm);
  attachLiveClear(foundForm);

  function validateField(inputEl, errEl, isValid, errorMsg) {
    if (!isValid) {
      inputEl.classList.add('input-invalid');
      if (errEl) {
        errEl.textContent = errorMsg;
        errEl.classList.add('visible');
      }
      return false;
    } else {
      inputEl.classList.remove('input-invalid');
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('visible');
      }
      return true;
    }
  }

  // ===================================================
  // FORM VALIDATION
  // ===================================================
  function validateLostForm() {
    let isValid = true;
    let firstInvalid = null;

    const nameEl = document.getElementById('lost-item-name');
    const nameErr = document.getElementById('err-lost-item-name');
    if (!validateField(nameEl, nameErr, nameEl.value.trim().length >= 2, 'Please enter the item name (at least 2 characters).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = nameEl;
    }

    const catEl = document.getElementById('lost-category');
    const catErr = document.getElementById('err-lost-category');
    if (!validateField(catEl, catErr, catEl.value !== '', 'Please select a valid category.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = catEl;
    }

    const dateEl = document.getElementById('lost-date');
    const dateErr = document.getElementById('err-lost-date');
    const dateVal = dateEl.value;
    const dateValid = dateVal !== '' && new Date(dateVal) <= new Date();
    if (!validateField(dateEl, dateErr, dateValid, 'Please select a valid date (cannot be in the future).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = dateEl;
    }

    const locEl = document.getElementById('lost-location');
    const locErr = document.getElementById('err-lost-location');
    if (!validateField(locEl, locErr, locEl.value.trim().length >= 3, 'Please enter the location where the item was lost.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = locEl;
    }

    const descEl = document.getElementById('lost-description');
    const descErr = document.getElementById('err-lost-description');
    if (!validateField(descEl, descErr, descEl.value.trim().length >= 8, 'Please provide a detailed description (at least 8 characters).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = descEl;
    }

    const colorEl = document.getElementById('lost-color');
    const colorErr = document.getElementById('err-lost-color');
    if (!validateField(colorEl, colorErr, colorEl.value.trim().length >= 2, 'Please specify the color or any identifying marks.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = colorEl;
    }

    const contactNameEl = document.getElementById('lost-contact-name');
    const contactNameErr = document.getElementById('err-lost-contact-name');
    if (!validateField(contactNameEl, contactNameErr, contactNameEl.value.trim().length >= 2, 'Please enter your contact name.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = contactNameEl;
    }

    const emailEl = document.getElementById('lost-contact-email');
    const emailErr = document.getElementById('err-lost-contact-email');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validateField(emailEl, emailErr, emailPattern.test(emailEl.value.trim()), 'Please enter a valid email address.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = emailEl;
    }

    const phoneEl = document.getElementById('lost-contact-phone');
    const phoneErr = document.getElementById('err-lost-contact-phone');
    const cleanPhone = phoneEl.value.replace(/[^0-9]/g, '');
    if (!validateField(phoneEl, phoneErr, cleanPhone.length >= 10 && cleanPhone.length <= 15, 'Please enter a valid phone number (at least 10 digits).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = phoneEl;
    }

    if (firstInvalid) firstInvalid.focus();
    return isValid;
  }

  function validateFoundForm() {
    let isValid = true;
    let firstInvalid = null;

    const nameEl = document.getElementById('found-item-name');
    const nameErr = document.getElementById('err-found-item-name');
    if (!validateField(nameEl, nameErr, nameEl.value.trim().length >= 2, 'Please enter the item name (at least 2 characters).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = nameEl;
    }

    const catEl = document.getElementById('found-category');
    const catErr = document.getElementById('err-found-category');
    if (!validateField(catEl, catErr, catEl.value !== '', 'Please select a valid category.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = catEl;
    }

    const dateEl = document.getElementById('found-date');
    const dateErr = document.getElementById('err-found-date');
    const dateVal = dateEl.value;
    const dateValid = dateVal !== '' && new Date(dateVal) <= new Date();
    if (!validateField(dateEl, dateErr, dateValid, 'Please select a valid date (cannot be in the future).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = dateEl;
    }

    const locEl = document.getElementById('found-location');
    const locErr = document.getElementById('err-found-location');
    if (!validateField(locEl, locErr, locEl.value.trim().length >= 3, 'Please enter the location where the item was found.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = locEl;
    }

    const descEl = document.getElementById('found-description');
    const descErr = document.getElementById('err-found-description');
    if (!validateField(descEl, descErr, descEl.value.trim().length >= 8, 'Please provide a detailed description (at least 8 characters).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = descEl;
    }

    const colorEl = document.getElementById('found-color');
    const colorErr = document.getElementById('err-found-color');
    if (!validateField(colorEl, colorErr, colorEl.value.trim().length >= 2, 'Please specify the color or any identifying marks.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = colorEl;
    }

    const contactNameEl = document.getElementById('found-contact-name');
    const contactNameErr = document.getElementById('err-found-contact-name');
    if (!validateField(contactNameEl, contactNameErr, contactNameEl.value.trim().length >= 2, 'Please enter your contact name.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = contactNameEl;
    }

    const emailEl = document.getElementById('found-contact-email');
    const emailErr = document.getElementById('err-found-contact-email');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validateField(emailEl, emailErr, emailPattern.test(emailEl.value.trim()), 'Please enter a valid email address.')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = emailEl;
    }

    const phoneEl = document.getElementById('found-contact-phone');
    const phoneErr = document.getElementById('err-found-contact-phone');
    const cleanPhone = phoneEl.value.replace(/[^0-9]/g, '');
    if (!validateField(phoneEl, phoneErr, cleanPhone.length >= 10 && cleanPhone.length <= 15, 'Please enter a valid phone number (at least 10 digits).')) {
      isValid = false;
      if (!firstInvalid) firstInvalid = phoneEl;
    }

    if (firstInvalid) firstInvalid.focus();
    return isValid;
  }

  function escapeHTML(str) {
    if (!str) return '';
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
  }

  function getCategoryIcon(cat) {
    switch (cat) {
      case 'Electronics':
        return 'fa-solid fa-laptop';
      case 'Documents':
        return 'fa-solid fa-id-card';
      case 'Accessories':
        return 'fa-solid fa-glasses';
      case 'Bags':
        return 'fa-solid fa-bag-shopping';
      case 'Clothing':
        return 'fa-solid fa-shirt';
      default:
        return 'fa-solid fa-box-open';
    }
  }

  // ===================================================
  // SUCCESS SCREEN HANDLER
  // ===================================================
  function showSuccess(type, data, newItemId) {
    if (lostFormWrapper) lostFormWrapper.style.display = 'none';
    if (foundFormWrapper) foundFormWrapper.style.display = 'none';

    const isLost = type === 'lost';

    formSuccessCard.className = `success-card ${isLost ? 'success-lost' : 'success-found'}`;
    formSuccessCard.innerHTML = `
      <div class="success-icon-wrap">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <h3 class="success-title">Report Submitted Successfully!</h3>
      <p class="success-desc">
        ${
          isLost
            ? `Your lost item report for <strong>"${escapeHTML(data.itemName)}"</strong> has been recorded in FindBack. You can now see it in the Browse tab or let our AI engine find matches.`
            : `Thank you for your honesty! Your found item report for <strong>"${escapeHTML(data.itemName)}"</strong> is now live in the Browse tab to help reunite it with its owner.`
        }
      </p>

      <div class="success-details-box">
        <div class="detail-row">
          <span class="detail-label"><i class="fa-solid fa-hashtag"></i> Reference ID:</span>
          <span class="detail-val"><span class="badge-ref">${data.refCode}</span></span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fa-solid fa-tag"></i> Item Name:</span>
          <span class="detail-val">${escapeHTML(data.itemName)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fa-solid fa-layer-group"></i> Category:</span>
          <span class="detail-val">${escapeHTML(data.category)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fa-solid fa-calendar-days"></i> ${isLost ? 'Date Lost' : 'Date Found'}:</span>
          <span class="detail-val">${escapeHTML(data.date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fa-solid fa-location-dot"></i> ${isLost ? 'Location Lost' : 'Location Found'}:</span>
          <span class="detail-val">${escapeHTML(data.location)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fa-solid fa-user"></i> Contact Person:</span>
          <span class="detail-val">${escapeHTML(data.contactName)} (${escapeHTML(data.contactPhone)})</span>
        </div>
      </div>

      <div class="success-actions">
        <button type="button" class="btn btn-primary" id="btn-success-browse" style="background: linear-gradient(90deg, #3b82f6, #06b6d4); color: #fff;">
          <i class="fa-solid fa-folder-open"></i> View in Browse Catalog
        </button>
        <button type="button" class="btn btn-dark" id="btn-submit-another">
          <i class="fa-solid fa-plus"></i> Submit Another Report
        </button>
        <button type="button" class="btn ${isLost ? 'btn-orange' : 'btn-teal'}" id="btn-success-home">
          <i class="fa-solid fa-house"></i> Back to Home
        </button>
      </div>
    `;

    formSuccessCard.style.display = 'flex';

    // Hook success buttons
    const btnSuccessBrowse = document.getElementById('btn-success-browse');
    const btnSubmitAnother = document.getElementById('btn-submit-another');
    const btnSuccessHome = document.getElementById('btn-success-home');

    if (btnSuccessBrowse) {
      btnSuccessBrowse.addEventListener('click', () => {
        openBrowse(newItemId);
      });
    }

    if (btnSubmitAnother) {
      btnSubmitAnother.addEventListener('click', () => {
        openForm(type);
      });
    }

    if (btnSuccessHome) {
      btnSuccessHome.addEventListener('click', closeForm);
    }

    reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ===================================================
  // FORM SUBMISSION: LOST ITEM
  // ===================================================
  if (lostForm) {
    lostForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validateLostForm()) {
        return;
      }

      const refCode = `FB-LOST-${Math.floor(100000 + Math.random() * 900000)}`;
      const formData = {
        itemName: document.getElementById('lost-item-name').value.trim(),
        category: document.getElementById('lost-category').value,
        date: document.getElementById('lost-date').value,
        location: document.getElementById('lost-location').value.trim(),
        description: document.getElementById('lost-description').value.trim(),
        colorMarks: document.getElementById('lost-color').value.trim(),
        contactName: document.getElementById('lost-contact-name').value.trim(),
        contactEmail: document.getElementById('lost-contact-email').value.trim(),
        contactPhone: document.getElementById('lost-contact-phone').value.trim(),
        refCode: refCode,
      };

      // Create new Item object
      const newItemId = 'item_' + Date.now();
      const newItem = {
        id: newItemId,
        type: 'lost',
        refCode: refCode,
        itemName: formData.itemName,
        category: formData.category,
        date: formData.date,
        location: formData.location,
        description: formData.description,
        colorMarks: formData.colorMarks,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        imageUrl: currentLostImagePreview || '',
        createdAt: new Date().toISOString(),
      };

      // Save to active list & storage
      itemsList.unshift(newItem);
      persistItems(itemsList);
      updateStats();

      // Reset Form fields
      lostForm.reset();
      const removeBtn = document.getElementById('lost-remove-file');
      if (removeBtn) removeBtn.click();
      currentLostImagePreview = '';

      showToast('Lost item reported successfully!', 'success');
      showSuccess('lost', formData, newItemId);
    });
  }

  // ===================================================
  // FORM SUBMISSION: FOUND ITEM
  // ===================================================
  if (foundForm) {
    foundForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validateFoundForm()) {
        return;
      }

      const refCode = `FB-FOUND-${Math.floor(100000 + Math.random() * 900000)}`;
      const formData = {
        itemName: document.getElementById('found-item-name').value.trim(),
        category: document.getElementById('found-category').value,
        date: document.getElementById('found-date').value,
        location: document.getElementById('found-location').value.trim(),
        description: document.getElementById('found-description').value.trim(),
        colorMarks: document.getElementById('found-color').value.trim(),
        contactName: document.getElementById('found-contact-name').value.trim(),
        contactEmail: document.getElementById('found-contact-email').value.trim(),
        contactPhone: document.getElementById('found-contact-phone').value.trim(),
        refCode: refCode,
      };

      // Create new Item object
      const newItemId = 'item_' + Date.now();
      const newItem = {
        id: newItemId,
        type: 'found',
        refCode: refCode,
        itemName: formData.itemName,
        category: formData.category,
        date: formData.date,
        location: formData.location,
        description: formData.description,
        colorMarks: formData.colorMarks,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        imageUrl: currentFoundImagePreview || '',
        createdAt: new Date().toISOString(),
      };

      // Save to active list & storage
      itemsList.unshift(newItem);
      persistItems(itemsList);
      updateStats();

      // Reset Form fields
      foundForm.reset();
      const removeBtn = document.getElementById('found-remove-file');
      if (removeBtn) removeBtn.click();
      currentFoundImagePreview = '';

      showToast('Found item reported successfully!', 'success');
      showSuccess('found', formData, newItemId);
    });
  }

  // ===================================================
  // BROWSE SECTION: RENDERER & FILTERS
  // ===================================================
  function renderBrowseItems() {
    if (!browseItemsGrid) return;
    browseItemsGrid.innerHTML = '';

    // 1. If NO items exist at all in user's session/storage
    if (itemsList.length === 0) {
      browseItemsGrid.innerHTML = `
        <div class="browse-empty-state">
          <div class="empty-icon-circle">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <h3 class="empty-title">No Items Reported Yet</h3>
          <p class="empty-text">
            No items have been reported yet. Fill out the <strong>Report Lost Item</strong> or <strong>Report Found Item</strong> form to see your items cataloged here in real time.
          </p>
          <div class="empty-btn-group">
            <button type="button" class="btn btn-orange" id="btn-empty-lost">
              <i class="fa-solid fa-file-lines"></i> Report Lost Item
            </button>
            <button type="button" class="btn btn-teal" id="btn-empty-found">
              <i class="fa-solid fa-magnifying-glass"></i> Report Found Item
            </button>
          </div>
        </div>
      `;

      const emptyLostBtn = document.getElementById('btn-empty-lost');
      const emptyFoundBtn = document.getElementById('btn-empty-found');
      if (emptyLostBtn) emptyLostBtn.addEventListener('click', () => openForm('lost'));
      if (emptyFoundBtn) emptyFoundBtn.addEventListener('click', () => openForm('found'));
      return;
    }

    // 2. Filter items according to search, type and category
    const q = currentSearchQuery.toLowerCase().trim();
    const filtered = itemsList.filter((item) => {
      // Type match
      if (currentTypeFilter !== 'all' && item.type !== currentTypeFilter) {
        return false;
      }
      // Category match
      if (currentCategoryFilter !== 'all' && item.category !== currentCategoryFilter) {
        return false;
      }
      // Search match
      if (q) {
        const matchTitle = item.itemName && item.itemName.toLowerCase().includes(q);
        const matchLoc = item.location && item.location.toLowerCase().includes(q);
        const matchDesc = item.description && item.description.toLowerCase().includes(q);
        const matchMarks = item.colorMarks && item.colorMarks.toLowerCase().includes(q);
        const matchRef = item.refCode && item.refCode.toLowerCase().includes(q);
        const matchContact = item.contactName && item.contactName.toLowerCase().includes(q);
        return matchTitle || matchLoc || matchDesc || matchMarks || matchRef || matchContact;
      }
      return true;
    });

    // 3. If filters resulted in 0 items
    if (filtered.length === 0) {
      browseItemsGrid.innerHTML = `
        <div class="browse-empty-state">
          <div class="empty-icon-circle">
            <i class="fa-solid fa-filter-circle-xmark"></i>
          </div>
          <h3 class="empty-title">No Matching Items Found</h3>
          <p class="empty-text">
            No items matched your current search filters. Try clearing your search keyword or switching category filter.
          </p>
          <button type="button" class="btn btn-dark" id="btn-reset-filters">
            <i class="fa-solid fa-rotate-left"></i> Reset All Filters
          </button>
        </div>
      `;

      const resetBtn = document.getElementById('btn-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          currentTypeFilter = 'all';
          currentCategoryFilter = 'all';
          currentSearchQuery = '';
          if (browseSearchInput) browseSearchInput.value = '';
          if (browseSearchClear) browseSearchClear.style.display = 'none';
          if (browseCategoryFilter) browseCategoryFilter.value = 'all';

          document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
          const allPill = document.getElementById('filter-pill-all');
          if (allPill) allPill.classList.add('active');

          renderBrowseItems();
        });
      }
      return;
    }

    // 4. Render Item Cards
    filtered.forEach((item) => {
      const isLost = item.type === 'lost';
      const card = document.createElement('div');
      card.className = `browse-card-item ${isLost ? 'lost-item' : 'found-item'}`;
      card.setAttribute('data-id', item.id);

      const categoryIcon = getCategoryIcon(item.category);

      card.innerHTML = `
        <div class="card-thumb-wrap">
          ${
            item.imageUrl
              ? `<img src="${item.imageUrl}" alt="${escapeHTML(item.itemName)}" loading="lazy">`
              : `<div class="card-placeholder-icon"><i class="${categoryIcon}"></i></div>`
          }
          <div class="card-header-tags">
            <span class="card-type-tag ${isLost ? 'tag-lost' : 'tag-found'}">
              <i class="${isLost ? 'fa-solid fa-file-lines' : 'fa-solid fa-magnifying-glass'}"></i>
              ${isLost ? 'Lost Item' : 'Found Item'}
            </span>
            <span class="card-ref-badge">${escapeHTML(item.refCode)}</span>
          </div>
        </div>

        <div class="card-body">
          <div class="card-title-row">
            <h4 class="card-item-title" title="${escapeHTML(item.itemName)}">${escapeHTML(item.itemName)}</h4>
          </div>

          <div class="card-cat-pill">
            <i class="${categoryIcon}"></i>
            <span>${escapeHTML(item.category)}</span>
          </div>

          <div class="card-meta-list">
            <div class="card-meta-item">
              <i class="fa-solid fa-calendar-days"></i>
              <span><strong>${isLost ? 'Lost' : 'Found'}:</strong> ${escapeHTML(item.date)}</span>
            </div>
            <div class="card-meta-item">
              <i class="fa-solid fa-location-dot"></i>
              <span><strong>Location:</strong> ${escapeHTML(item.location)}</span>
            </div>
            <div class="card-meta-item">
              <i class="fa-solid fa-palette"></i>
              <span><strong>Marks:</strong> ${escapeHTML(item.colorMarks)}</span>
            </div>
          </div>

          <p class="card-desc-text" title="${escapeHTML(item.description)}">${escapeHTML(item.description)}</p>

          <div class="card-contact-strip">
            <div class="contact-owner">
              <i class="fa-solid fa-user-circle"></i>
              <span>Reported by <strong>${escapeHTML(item.contactName)}</strong></span>
            </div>
            <div class="contact-buttons-row">
              <a href="tel:${escapeHTML(item.contactPhone)}" class="contact-link-pill" title="Call ${escapeHTML(item.contactName)}">
                <i class="fa-solid fa-phone"></i> Call
              </a>
              <a href="mailto:${escapeHTML(item.contactEmail)}?subject=FindBack Inquiry: ${encodeURIComponent(item.itemName)}" class="contact-link-pill" title="Email ${escapeHTML(item.contactName)}">
                <i class="fa-solid fa-envelope"></i> Email
              </a>
            </div>
          </div>

          <div class="card-footer-actions">
            <button type="button" class="btn ${isLost ? 'btn-orange' : 'btn-teal'} btn-action-inquire" data-id="${item.id}">
              <i class="fa-solid fa-handshake"></i> ${isLost ? 'I Found This' : 'Claim Item'}
            </button>
            <button type="button" class="btn-delete-card" data-id="${item.id}" title="Delete this listing">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;

      browseItemsGrid.appendChild(card);
    });

    // Wire up card action buttons
    document.querySelectorAll('.btn-action-inquire').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const targetItem = itemsList.find((it) => it.id === id);
        if (targetItem) {
          showToast(`Connecting with ${targetItem.contactName} at ${targetItem.contactPhone}...`, 'info');
          window.location.href = `tel:${targetItem.contactPhone}`;
        }
      });
    });

    // Wire up delete card buttons
    document.querySelectorAll('.btn-delete-card').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const targetIndex = itemsList.findIndex((it) => it.id === id);
        if (targetIndex !== -1) {
          const itemTitle = itemsList[targetIndex].itemName;
          if (confirm(`Are you sure you want to remove "${itemTitle}" from Browse catalog?`)) {
            itemsList.splice(targetIndex, 1);
            persistItems(itemsList);
            updateStats();
            renderBrowseItems();
            showToast(`"${itemTitle}" removed successfully.`, 'warning');
          }
        }
      });
    });
  }

  // Search input events
  if (browseSearchInput) {
    browseSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      if (browseSearchClear) {
        browseSearchClear.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
      }
      renderBrowseItems();
    });
  }

  if (browseSearchClear) {
    browseSearchClear.addEventListener('click', () => {
      if (browseSearchInput) {
        browseSearchInput.value = '';
        currentSearchQuery = '';
        browseSearchClear.style.display = 'none';
        renderBrowseItems();
        browseSearchInput.focus();
      }
    });
  }

  // Filter Pills (All / Lost / Found)
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentTypeFilter = e.currentTarget.getAttribute('data-filter') || 'all';
      renderBrowseItems();
    });
  });

  // Category Filter
  if (browseCategoryFilter) {
    browseCategoryFilter.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      renderBrowseItems();
    });
  }
});
