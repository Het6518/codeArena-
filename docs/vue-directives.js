/**
 * CodeArena - Custom Vue 3 Directives Collection
 * 
 * I.   v-uppercase-click : Transforms text to uppercase on user click (with toggle and once options)
 * II.  v-dynamic-list    : Dynamically renders, animates, and manages dynamic list DOM nodes
 * III. v-date-format     : Human-readable date formatting (relative 'timeago', localized, live auto-update)
 */

// ============================================================================
// I. Custom Directive: v-uppercase-click
// Transforms element text content (or input value) to uppercase when clicked.
// Modifiers supported:
//   .toggle - Toggles between original case and uppercase on repeated clicks
//   .once   - Only triggers on the first click then unbinds
// ============================================================================
export const uppercaseClickDirective = {
  mounted(el, binding) {
    const isInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    el._originalText = isInput ? el.value : (el.innerText || el.textContent);
    el._isUpper = false;

    // Visual hint that element is clickable
    if (!el.style.cursor) {
      el.style.cursor = 'pointer';
    }
    if (!el.title) {
      el.title = binding.modifiers.toggle 
        ? 'Click to toggle uppercase / original case' 
        : 'Click to transform to uppercase';
    }

    el._handleUppercaseClick = (event) => {
      if (binding.modifiers.toggle) {
        if (el._isUpper) {
          if (isInput) {
            el.value = el._originalText;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            el.textContent = el._originalText;
          }
          el._isUpper = false;
        } else {
          el._originalText = isInput ? el.value : el.textContent;
          const upper = (isInput ? el.value : el.textContent).toUpperCase();
          if (isInput) {
            el.value = upper;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            el.textContent = upper;
          }
          el._isUpper = true;
        }
      } else {
        const text = isInput ? el.value : el.textContent;
        const upper = text.toUpperCase();
        if (isInput) {
          el.value = upper;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.textContent = upper;
        }
        el._isUpper = true;
      }

      // Optional user callback function passed as value: v-uppercase-click="onTransformed"
      if (typeof binding.value === 'function') {
        binding.value({
          original: el._originalText,
          current: isInput ? el.value : el.textContent,
          isUpper: el._isUpper,
          element: el,
          event
        });
      }
    };

    const eventOptions = binding.modifiers.once ? { once: true } : false;
    el.addEventListener('click', el._handleUppercaseClick, eventOptions);
  },

  updated(el, binding) {
    const isInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    const current = isInput ? el.value : el.textContent;
    // Update original cache if changed externally while not toggled uppercase
    if (!el._isUpper && current !== el._originalText) {
      el._originalText = current;
    }
  },

  unmounted(el) {
    if (el._handleUppercaseClick) {
      el.removeEventListener('click', el._handleUppercaseClick);
      delete el._handleUppercaseClick;
      delete el._originalText;
      delete el._isUpper;
    }
  }
};

// ============================================================================
// II. Custom Directive: v-dynamic-list
// Dynamically renders, formats, and updates DOM list items from a reactive array or config object.
// Modifiers supported:
//   .animated - Smooth staggered entrance animation for list items
//   .badges   - Displays an indexed badge (e.g. #1, #2) beside each item
//   .striped  - Applies alternating row styling
// ============================================================================
export const dynamicListDirective = {
  mounted(el, binding) {
    renderDynamicList(el, binding);
  },

  updated(el, binding) {
    renderDynamicList(el, binding);
  },

  unmounted(el) {
    el.innerHTML = '';
    delete el._renderedItemsCount;
  }
};

function renderDynamicList(el, binding) {
  const raw = binding.value;
  // Normalize configuration: raw can be an Array or an Object: { items, emptyText, renderItem, filter }
  let items = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : []);
  const options = (typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};

  // Custom filter if provided
  if (typeof options.filter === 'function') {
    items = items.filter(options.filter);
  }

  // Clear previous content
  el.innerHTML = '';
  el.classList.add('dynamic-list-container');

  if (binding.modifiers.striped) {
    el.classList.add('dynamic-list-striped');
  }

  if (items.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'dynamic-list-empty';
    emptyEl.textContent = options.emptyText || 'No items available in dynamic list.';
    el.appendChild(emptyEl);
    return;
  }

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'dynamic-list-item';

    if (binding.modifiers.animated) {
      li.style.animation = `fadeSlideIn 0.3s ease-out ${index * 0.05}s both`;
    }

    if (binding.modifiers.badges) {
      const badge = document.createElement('span');
      badge.className = 'dynamic-list-badge';
      badge.textContent = `#${index + 1}`;
      li.appendChild(badge);
    }

    const contentWrap = document.createElement('div');
    contentWrap.className = 'dynamic-list-content';

    if (typeof options.renderItem === 'function') {
      const rendered = options.renderItem(item, index);
      if (rendered instanceof HTMLElement) {
        contentWrap.appendChild(rendered);
      } else {
        contentWrap.innerHTML = String(rendered);
      }
    } else if (typeof item === 'object' && item !== null) {
      // Automatic smart object representation
      const title = item.title || item.name || item.label || item.username || item.id || JSON.stringify(item);
      const sub = item.description || item.detail || item.status || item.subtitle || '';
      
      const titleEl = document.createElement('strong');
      titleEl.textContent = title;
      contentWrap.appendChild(titleEl);

      if (sub) {
        const subEl = document.createElement('span');
        subEl.className = 'dynamic-list-subtext';
        subEl.textContent = ` — ${sub}`;
        contentWrap.appendChild(subEl);
      }
    } else {
      contentWrap.textContent = String(item);
    }

    li.appendChild(contentWrap);

    // If an onRemove action was supplied
    if (typeof options.onRemove === 'function') {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'dynamic-list-remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove item';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        options.onRemove(item, index);
      };
      li.appendChild(removeBtn);
    }

    el.appendChild(li);
  });

  el._renderedItemsCount = items.length;
}

// ============================================================================
// III. Custom Directive: v-date-format
// Formats timestamps, ISO strings, or Date instances into human-readable text.
// Arguments:
//   v-date-format:relative   -> Relative time ("just now", "5 minutes ago", "yesterday")
//   v-date-format:datetime   -> Full localized date & time ("Oct 14, 2026, 8:54 PM")
//   v-date-format:date       -> Full localized date only ("October 14, 2026")
//   v-date-format:time       -> Localized time only ("8:54:30 PM")
//   v-date-format:compact    -> Short numeric date ("10/14/2026")
// Modifiers:
//   .live                    -> Automatically re-evaluates relative time every 15 seconds
// ============================================================================
export const dateFormatDirective = {
  mounted(el, binding) {
    applyDateFormat(el, binding);

    // If relative or .live modifier is active, set an interval for live updates
    const isRelative = binding.arg === 'relative' || binding.modifiers.relative || binding.modifiers.live;
    if (isRelative) {
      el._dateTimer = setInterval(() => {
        applyDateFormat(el, binding);
      }, 15000); // Ticks every 15 seconds
    }
  },

  updated(el, binding) {
    applyDateFormat(el, binding);
  },

  beforeUnmount(el) {
    if (el._dateTimer) {
      clearInterval(el._dateTimer);
      delete el._dateTimer;
    }
  },

  unmounted(el) {
    if (el._dateTimer) {
      clearInterval(el._dateTimer);
      delete el._dateTimer;
    }
  }
};

/**
 * Helper to compute human-readable formats
 */
function applyDateFormat(el, binding) {
  const value = binding.value;
  if (!value) {
    el.textContent = '—';
    el.removeAttribute('title');
    return;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    el.textContent = String(value);
    return;
  }

  // Always provide a tooltip with full ISO & locale timestamp
  el.title = `${date.toLocaleString()} (UTC: ${date.toISOString()})`;

  const mode = binding.arg || Object.keys(binding.modifiers)[0] || 'relative';

  switch (mode) {
    case 'datetime':
      el.textContent = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }).format(date);
      break;

    case 'date':
      el.textContent = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'long'
      }).format(date);
      break;

    case 'time':
      el.textContent = new Intl.DateTimeFormat(undefined, {
        timeStyle: 'medium'
      }).format(date);
      break;

    case 'compact':
      el.textContent = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
      break;

    case 'relative':
    default:
      el.textContent = formatRelativeTime(date);
      break;
  }
}

/**
 * Calculates humanized relative time ("just now", "X minutes ago", etc.)
 */
export function formatRelativeTime(date) {
  const now = Date.now();
  const elapsedSeconds = Math.round((now - date.getTime()) / 1000);

  if (Math.abs(elapsedSeconds) < 10) {
    return 'just now';
  }

  const isFuture = elapsedSeconds < 0;
  const absSeconds = Math.abs(elapsedSeconds);

  const units = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  for (const unit of units) {
    const count = Math.floor(absSeconds / unit.seconds);
    if (count >= 1) {
      const plural = count === 1 ? unit.label : `${unit.label}s`;
      return isFuture ? `in ${count} ${plural}` : `${count} ${plural} ago`;
    }
  }

  return 'just now';
}

/**
 * Convenience helper to register all directives globally on a Vue app
 */
export function registerAllDirectives(app) {
  app.directive('uppercase-click', uppercaseClickDirective);
  app.directive('dynamic-list', dynamicListDirective);
  app.directive('date-format', dateFormatDirective);
}

export default {
  uppercaseClickDirective,
  dynamicListDirective,
  dateFormatDirective,
  registerAllDirectives
};
