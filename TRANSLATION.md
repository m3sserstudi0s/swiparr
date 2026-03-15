# 🌍 Translation Guide for Swiparr 🍿

This guide will help you add new languages or improve existing translations for Swiparr. Let's make discovering what to watch a global experience! 🚀

## Table of Contents

- [Overview](#overview)
- [How Language Selection Works (Docker)](#how-language-selection-works-docker)
- [Quick Start](#quick-start)
- [Adding a New Language](#adding-a-new-language)
- [Translation File Structure](#translation-file-structure)
- [Testing Your Translations](#testing-your-translations)
- [Translation Guidelines](#translation-guidelines)

---

## Overview

Swiparr uses **next-intl** for internationalization (i18n). Currently supported languages:

- **English** (`en`) - Default
- **German** (`de`)

### Architecture

Swiparr is designed to run as a **single-language instance per deployment**. 

1. **No URL prefixes**: URLs do not contain language codes. (`localePrefix: 'never'`)
2. **Global Language Setting**: The language is set globally for the entire application instance via the `LOCALE` environment variable (typically in Docker).
3. **Server & Client Components**: Next.js Server Components and Client Components both use `next-intl` to fetch translations directly from `messages/{lang}.json`.

---

## How Language Selection Works (Docker)

If you are running Swiparr via Docker, you can set the language using the `LOCALE` environment variable. By default, if omitted, the app falls back to English (`en`).

```yaml
services:
  swiparr:
    image: ghcr.io/m3sserstudi0s/swiparr:latest
    environment:
      - LOCALE=de # Set to 'de' for German.
```

The app parses this variable dynamically when the container starts and forces all users of that instance to see the specified language.

---

## 🚀 Quick Start

**To improve existing translations:**

1. Navigate to `messages/en.json` or `messages/de.json`.
2. Find the key you want to update.
3. Change the translation value.
4. If you haven't run Swiparr locally before, initialize the database and auth secret: 
   ```bash
   npm run db:migrate
   node scripts/ensure-auth-secret.cjs
   ```
5. Save and test by running `npm run dev` with the appropriate `LOCALE`.

**To add a new language (e.g., German `de`):**

1. Copy `messages/en.json` to `messages/de.json`.
2. Translate all values in `messages/de.json`.
3. Add your new language to the `locales` array in `src/i18n/routing.ts`.
4. Add your new language code to the `LOCALE` validation enum in `src/lib/config.ts`.
5. If you haven't run Swiparr locally before, initialize the database and auth secret:
   ```bash
   npm run db:migrate
   node scripts/ensure-auth-secret.cjs
   ```
6. Start the dev server with `LOCALE=de npm run dev`.

---

## 🛠️ Adding a New Language

Let's add **German** (`de`) as an example:

### Step 1: Create the Translation File

Copy the English template:

```bash
cp messages/en.json messages/de.json
```

### Step 2: Translate the JSON File

Open `messages/de.json` and translate all the values:

```json
{
  "Settings": {
    "title": "Einstellungen",
    "save": "Speichern",
    "cancel": "Abbrechen"
  },
  "Auth": {
    "login": "Anmelden"
  }
}
```

⚠️ **Important**: Only translate the **values**, NOT the keys!

### Step 3: Register the Language in routing.ts

Edit `src/i18n/routing.ts` to include your new locale (for German this is already done, but here is how it looks):

```typescript
export const routing = defineRouting({
    locales: ['en', 'de'], // ← Add 'de' here
    defaultLocale: config.app.locale,
    localePrefix: 'never',
    localeDetection: false
});
```

### Step 4: Update the Configuration Schema

Edit `src/lib/config.ts` to allow your language code safely in the `LOCALE` Environment Variable check (for German this is already done):

```typescript
  // Find this line in the envSchema:
  LOCALE: z.enum(['en']).default('en'),
  
  // Change to:
  LOCALE: z.enum(['en', 'de']).default('en'), // ← Add 'de' here
```

### Step 5: Test Your Translation Locally

1. Before running the dev server for the first time, make sure your local database is initialized and the auth secret is generated:
   ```bash
   npm run db:migrate
   node scripts/ensure-auth-secret.cjs
   ```
2. You can test how Swiparr looks in your new language by setting the `LOCALE` variable before starting the local dev server:
   ```bash
   LOCALE=de npm run dev
   ```

---

## 📁 Translation File Structure

Translations are stored in a single comprehensive JSON file per language in the `messages/` folder. They are organized into logical sections matching the components or pages.

### Key Naming Conventions

- Use **camelCase** or **PascalCase** for keys (match the existing structure in `en.json`).
- Use **nested objects** to group related strings.
- Be highly descriptive! Avoid generic keys like `title1`.

---

## 🔍 Where Translations Are Used

Because Swiparr uses Next.js App Router, translations are consumed slightly differently depending on if you are in a Server or Client Component.

### Server Components
```typescript
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('Dashboard');
  return <h1>{t('title')}</h1>;
}
```

### Client Components
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function Button() {
  const t = useTranslations('Common');
  return <button>{t('save')}</button>;
}
```

---

## Translation Guidelines

### 1. Variables and Placeholders

`next-intl` uses `{variableName}` for dynamic values within strings. **Do not translate the variable names inside the brackets.**

✅ **Correct:** `"{count} Dateien ausgewählt"`
❌ **Wrong:** `"{anzahl} Dateien ausgewählt"`

### 2. Keep the Tone Consistent

Swiparr is designed to be a fun, collaborative experience—like Tinder for movies! Match this tone: keep it friendly, slightly informal, clear, concise, and user-friendly.

### 3. Handle Plurals

`next-intl` supports the standard ICU message syntax for plurals:

```json
{
  "itemCount": "{count, plural, =0 {No items} one {1 item} other {# items}}"
}
```
If your language requires complex pluralization, ensure you follow valid ICU syntax so the interpolation does not break.

---

## 🧪 Testing Beyond the Login Screen

If you want to test your translations through the main UI (swipes, matches, settings) but don't want to lock the server to a specific media provider, the easiest way is to use Swiparr's **BYOP (Bring Your Own Provider)** mode.

Start the dev server with the provider lock disabled. This changes the login screen to let you select a provider type and enter your own server URL:

```bash
PROVIDER_LOCK=false LOCALE=de npm run dev
```

> [!NOTE]
> **Connecting to a local server?**
> By default, Swiparr blocks private/LAN IP addresses in BYOP mode for security reasons. If you are trying to connect to your own local Jellyfin/Emby/Plex server using an IP like `192.168.1.x`, you must explicitly allow it by adding `ALLOW_PRIVATE_PROVIDER_URLS=true` to the command:
> ```bash
> ALLOW_PRIVATE_PROVIDER_URLS=true PROVIDER_LOCK=false LOCALE=de npm run dev
> ```

---

## 🤝 Contributing Your Translation

Once you've completed and tested a translation:

1. **Verify** by running the app with your `LOCALE` and clicking through the UI.
2. **Fork the repository** on GitHub.
3. **Create a new branch**: `git checkout -b feat/add-german-translation`
4. **Commit your changes**: `git commit -m "feat: add German translation"` *(Please use Conventional Commits style)*
5. **Push to your fork** and **open a Pull Request**.

Thank you for making Swiparr accessible to more people! 🎉🍿
