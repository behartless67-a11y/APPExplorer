# Design System Update Documentation

**Date**: 2025-10-20
**Purpose**: Standardize design across all Batten School digital tools
**Reference Project**: BattenSpaceFrontEnd

---

## Overview

This document details the complete design system migration for the APPExplorer project to match the BattenSpaceFrontEnd branding. Use this as a template for updating other Batten School projects.

---

## Design System Specifications

### Color Palette

```css
/* Primary Colors */
--brand-text: #232D4B;           /* UVA Navy - primary text and header background */
--brand-accent: #E57200;          /* UVA Orange - accent color, buttons, highlights */
--brand-accent-light: #F28C28;    /* UVA Orange Light - hover states */
--brand-bg: #fafafa;              /* Light gray - page background */

/* Supporting Colors */
--brand-card: #FFFFFF;            /* White - card backgrounds */
--brand-border: #E2E8F0;          /* Light gray - borders */
--brand-muted: #64748B;           /* Gray - secondary text */
--brand-header-text: #FFFFFF;     /* White - header text */

/* Header Background */
--brand-header-bg: linear-gradient(135deg, #1E293B 0%, #232D4B 100%);
```

### Typography

**Primary Font (Serif)**: Libre Baskerville
- Usage: Body text, headings, titles
- Weights: 400 (regular), 700 (bold)
- Fallbacks: Georgia, serif

**Secondary Font (Sans-Serif)**: Inter
- Usage: Labels, buttons, UI elements
- Weights: 400, 500, 600, 700
- Fallbacks: system-ui, sans-serif

**Google Fonts Import**:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet">
```

### Background Treatment

**Background Image**: `garrett-hall-sunset.jpg`
- **Filter**: 100% grayscale
- **Overlay**: White with 85% opacity
- **Effect**: Creates a subtle, professional background that doesn't distract from content

**Implementation**:
```css
body {
  font-family: 'Libre Baskerville', Georgia, serif;
  background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('./garrett-hall-sunset.jpg');
  background-size: cover;
  background-position: center center;
  background-attachment: fixed;
  background-repeat: no-repeat;
}

/* Grayscale filter using pseudo-element */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('./garrett-hall-sunset.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  filter: grayscale(100%);
  z-index: -2;
}

/* White overlay */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  z-index: -1;
}
```

### Spacing & Layout

```css
/* Border Radius */
--radius: 16px;               /* Standard card radius */

/* Shadows */
--shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* Container Widths */
max-width: 1840px;            /* Main content area */
```

---

## Step-by-Step Migration Guide

### Phase 1: Asset Collection

#### 1. Copy Required Assets

```bash
# From BattenSpaceFrontEnd to your project
cp BattenSpaceFrontEnd/public/garrett-hall-sunset.jpg YourProject/
cp BattenSpaceFrontEnd/public/bat_rgb_ko.png YourProject/images/
```

**Required Files**:
- `garrett-hall-sunset.jpg` - Background image (1436174 bytes)
- `bat_rgb_ko.png` - Batten School logo (383266 bytes)

#### 2. Verify File Paths

Ensure your HTML files reference the correct paths:
```html
<img src="images/bat_rgb_ko.png" alt="UVA Batten School Logo">
```

---

### Phase 2: Font Updates

#### 1. Update Font Links

**Find and Replace**:
```html
<!-- OLD -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Crimson+Text:wght@600;700&display=swap" rel="stylesheet">

<!-- NEW -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet">
```

#### 2. Update CSS Font Families

**Body Text**:
```css
/* OLD */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* NEW */
body {
  font-family: 'Libre Baskerville', Georgia, serif;
}
```

**Headings/Titles**:
```css
/* OLD */
.title {
  font-family: 'Crimson Text', serif;
  font-weight: 700;
}

/* NEW */
.title {
  font-family: 'Libre Baskerville', Georgia, serif;
  font-weight: 700;
}
```

**Other Common Font References**:
- Search for `'Playfair Display'` → Replace with `'Libre Baskerville'`
- Search for `'Crimson Text'` → Replace with `'Libre Baskerville'`
- Adjust font-weight from `800` or `900` to `700` (max weight for Libre Baskerville)

---

### Phase 3: Background Image Migration

#### 1. Update Background CSS

**Find**:
```css
body {
  background: linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)), url('./UVA_Zoom-Wallpaper_Rotunda.jpg');
}
```

**Replace With**:
```css
body {
  font-family: 'Libre Baskerville', Georgia, serif;
  background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('./garrett-hall-sunset.jpg');
  background-size: cover;
  background-position: center center;
  background-attachment: fixed;
  background-repeat: no-repeat;
}

/* Add grayscale filter layer */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('./garrett-hall-sunset.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  filter: grayscale(100%);
  z-index: -2;
}

/* Add white overlay layer */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  z-index: -1;
}
```

#### 2. Why Use Pseudo-Elements?

The `::before` and `::after` approach allows:
- ✅ Separate grayscale filter on background only
- ✅ Clean white overlay without affecting content
- ✅ Fixed positioning for parallax effect
- ✅ No JavaScript required

**Alternative (simpler but less flexible)**:
```css
body {
  background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('./garrett-hall-sunset.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}
```
Note: This won't apply grayscale filter to the background image.

---

### Phase 4: Verify Color Consistency

The APPExplorer already used the correct UVA colors, so no changes were needed. However, for other projects:

#### 1. Search and Replace Colors

**Find these colors and replace**:
```css
/* Headers/Primary Text */
#1E293B → #232D4B
#1a202c → #232D4B

/* Accent Colors */
#f97316 → #E57200
#ea580c → #E57200

/* Backgrounds */
#f5f5f5 → #fafafa
```

#### 2. Update CSS Variables

```css
:root {
  --brand-text: #232D4B;
  --brand-accent: #E57200;
  --brand-bg: #fafafa;
  --brand-muted: #64748B;
}
```

#### 3. Verify in DevTools

1. Open browser DevTools (F12)
2. Check computed styles for:
   - Header background: `#232D4B`
   - Accent elements: `#E57200`
   - Body background: `#fafafa`

---

## Additional Changes Made

### 1. Removed Network Status Indicator

**Reason**: With Entra ID authentication, users can access from anywhere. The network status check is obsolete.

**Removed Code** (app.html lines 251-262):
```html
<!-- REMOVED -->
<div id="networkAccessInfo">
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
    <p style="margin: 0; color: var(--brand-muted); font-size: 14px; text-align: center;">
      <strong>Network Status:</strong> <span id="networkStatus">Checking...</span>
      <span id="vpnInfo" style="display: none;">...</span>
      <button id="debugIPBtn">Debug</button>
    </p>
  </div>
</div>
```

**Impact**: Cleaner UI, removed ~14 lines of HTML and related JavaScript.

---

### 2. Added Passcode Protection for Submit

**Reason**: Prevent unauthorized project submissions while still allowing authenticated users to browse.

#### In app.html (lines 1948-1961):

```javascript
// PIN Protection for Submit Project
function checkSubmitPIN() {
  const correctPIN = '000235';
  const enteredPIN = prompt('Please enter the PIN to access Submit Project:');

  if (enteredPIN === correctPIN) {
    // Store access in sessionStorage so they don't get prompted again on submit.html
    sessionStorage.setItem('submitAccessGranted', 'true');
    return true;
  } else if (enteredPIN !== null) {
    alert('Incorrect PIN. Access denied.');
  }
  return false;
}

// Add PIN protection to Submit Project link
const submitLink = document.getElementById('submitProjectLink');
if (submitLink) {
  submitLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (checkSubmitPIN()) {
      window.location.href = './submit.html';
    }
  });
}
```

#### In submit.html (lines 491-506):

```javascript
// Passcode protection - check on page load
(function() {
  const CORRECT_PASSCODE = '000235';
  const hasAccess = sessionStorage.getItem('submitAccessGranted');

  if (hasAccess !== 'true') {
    const enteredPasscode = prompt('Please enter the passcode to access the project submission form:');

    if (enteredPasscode === CORRECT_PASSCODE) {
      sessionStorage.setItem('submitAccessGranted', 'true');
    } else {
      alert('Incorrect passcode. Access denied.');
      window.location.href = './app.html';
    }
  }
})();
```

**How It Works**:
1. User clicks "Submit Project" link → prompted for passcode
2. Correct passcode → stores access in `sessionStorage` → navigates to submit.html
3. submit.html checks `sessionStorage` on load → if not set, prompts again
4. Wrong passcode → redirects back to app.html
5. `sessionStorage` persists within the browser session (cleared when browser/tab closes)

**To Change Passcode**:
1. Update `correctPIN` in app.html
2. Update `CORRECT_PASSCODE` in submit.html
3. Keep both values identical

---

## Testing Checklist

After applying design changes, verify:

### Visual Testing
- [ ] Background image displays correctly (Garrett Hall)
- [ ] Background is grayscale with white overlay
- [ ] Fonts render as Libre Baskerville (serif)
- [ ] Header is UVA Navy (#232D4B)
- [ ] Accent elements are UVA Orange (#E57200)
- [ ] Cards have proper shadows and rounded corners
- [ ] Text is readable against all backgrounds

### Functionality Testing
- [ ] All links work correctly
- [ ] Buttons maintain hover states
- [ ] Forms submit properly
- [ ] Images load (logo, background)
- [ ] Responsive design works on mobile
- [ ] Passcode protection functions (if applicable)

### Cross-Browser Testing
Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### Performance
- [ ] Background image loads quickly (< 2 seconds)
- [ ] Fonts load without FOUT (Flash of Unstyled Text)
- [ ] Page renders smoothly

---

## Common Issues & Solutions

### Issue 1: Background Image Not Showing

**Symptoms**: White or blank background

**Solutions**:
```bash
# 1. Check file path
ls garrett-hall-sunset.jpg

# 2. Verify file permissions
chmod 644 garrett-hall-sunset.jpg

# 3. Check browser console for 404 errors
# Right-click → Inspect → Console tab

# 4. Verify relative path in CSS
background-image: url('./garrett-hall-sunset.jpg');  # Correct
background-image: url('garrett-hall-sunset.jpg');    # Also works
```

### Issue 2: Fonts Not Loading

**Symptoms**: Text renders in fallback fonts (Arial, Times New Roman)

**Solutions**:
```html
<!-- 1. Verify Google Fonts link is in <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet">

<!-- 2. Check browser console for CORS errors -->

<!-- 3. Test font loading -->
<style>
  body { font-family: 'Libre Baskerville', Georgia, serif; }
</style>
```

### Issue 3: Grayscale Filter Not Applied

**Symptoms**: Background image shows in full color

**Solutions**:
```css
/* Ensure pseudo-element has correct z-index */
body::before {
  filter: grayscale(100%);
  z-index: -2;  /* Must be behind overlay */
}

body::after {
  z-index: -1;  /* Must be behind content but over grayscale layer */
}

/* Content should have positive or auto z-index */
#app-wrapper {
  position: relative;
  z-index: 0;  /* Or auto */
}
```

### Issue 4: White Overlay Too Strong/Weak

**Symptoms**: Background too faded or too visible

**Solution**: Adjust opacity value
```css
body::after {
  background: rgba(255, 255, 255, 0.85);  /* 85% = current */
  background: rgba(255, 255, 255, 0.90);  /* 90% = more faded */
  background: rgba(255, 255, 255, 0.75);  /* 75% = more visible */
}
```

---

## Quick Reference: Apply Design to New Project

### Minimal Steps (5 minutes)

```bash
# 1. Copy assets
cp BattenSpaceFrontEnd/public/garrett-hall-sunset.jpg NewProject/
cp BattenSpaceFrontEnd/public/bat_rgb_ko.png NewProject/images/

# 2. In your HTML <head>, update fonts
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet">

# 3. In your CSS, update body
body {
  font-family: 'Libre Baskerville', Georgia, serif;
  background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('./garrett-hall-sunset.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  color: #232D4B;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('./garrett-hall-sunset.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  filter: grayscale(100%);
  z-index: -2;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  z-index: -1;
}

# 4. Update CSS variables
:root {
  --brand-text: #232D4B;
  --brand-accent: #E57200;
  --brand-bg: #fafafa;
}

# 5. Replace all Crimson Text / Playfair Display with Libre Baskerville
# Search and replace in your editor
```

---

## Files Modified in This Update

### APPExplorer Project

| File | Changes | Lines Modified |
|------|---------|----------------|
| `app.html` | Font updates, background changes, removed network status, passcode protection | ~89 insertions, ~35 deletions |
| `submit.html` | Font updates, background changes, passcode protection | ~54 insertions, ~20 deletions |
| `garrett-hall-sunset.jpg` | New file added | +1436174 bytes |

### Git Commit

```bash
Commit: 5d2147f
Message: "Update design system to match BattenSpaceFrontEnd branding"
Files: 3 changed, 89 insertions(+), 35 deletions(-)
```

---

## Design System Maintenance

### Updating the Design System

If the BattenSpaceFrontEnd design changes, update all projects:

1. **Document Changes**: Note what changed in BattenSpaceFrontEnd
2. **Update Reference**: This document and your design system guide
3. **Apply to Projects**: Use this guide to update each project systematically
4. **Test Thoroughly**: Verify visual and functional consistency
5. **Commit Changes**: Use descriptive commit messages

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-20 | Initial design system standardization |
| | | - Libre Baskerville fonts |
| | | - Garrett Hall background |
| | | - Grayscale treatment |
| | | - UVA Navy/Orange colors |

---

## Resources

### Design Assets Location
```
BattenSpaceFrontEnd/
├── public/
│   ├── garrett-hall-sunset.jpg    # Background image
│   └── bat_rgb_ko.png             # Batten School logo
├── src/
│   ├── app/
│   │   └── globals.css            # Global styles reference
│   └── components/
│       └── Header.tsx             # Header component reference
└── tailwind.config.js             # Color definitions
```

### UVA Brand Guidelines
- Official Colors: [UVA Brand Guidelines](https://brand.virginia.edu/colors)
- Navy: `#232D4B`
- Orange: `#E57200`

### Font Resources
- [Libre Baskerville on Google Fonts](https://fonts.google.com/specimen/Libre+Baskerville)
- [Inter on Google Fonts](https://fonts.google.com/specimen/Inter)

### Related Documentation
- `ENTRA_AUTH_SETUP.md` - Authentication configuration
- `DEPLOYMENT_DOCUMENTATION.md` - Deployment process
- `README.md` - Project overview

---

## Summary

This design system update ensures visual consistency across all Batten School digital tools by:

✅ **Standardizing Typography**: Libre Baskerville serif font for elegant, academic appearance
✅ **Consistent Backgrounds**: Garrett Hall with grayscale filter and white overlay
✅ **UVA Branding**: Navy and Orange color scheme throughout
✅ **Professional Polish**: Proper shadows, spacing, and transitions
✅ **Reusable Process**: This document serves as template for other projects

**Next Steps**: Apply this design system to remaining Batten School tools using this guide.

---

*Last Updated: 2025-10-20*
*Maintained By: Batten School IT Team*
*Reference Project: BattenSpaceFrontEnd*
