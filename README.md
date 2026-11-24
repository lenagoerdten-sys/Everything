# Everything v5.1 — personal planner for Samsung and laptop

Everything is a **local-first Progressive Web App (PWA)** for your To Do list, budget, calendar, recipes, shopping, nutrition and Food Log. It runs in a browser and can be hosted as an empty app on GitHub Pages. The private data is kept in the browser on each device and can be backed up to separate JSON files.

No account, database, subscription, login, analytics or external scripts are required. The source code is ordinary `HTML`, `CSS` and `JavaScript`.

## Privacy — what to upload to GitHub

The GitHub package contains **only app code**, not your personal workbook data or test records. The initial To Do list is empty. Never upload the original `.xlsm` files or any `*PRIVATE*.json`, `*BACKUP*.json` or personal exported data files to GitHub. GitHub's web upload UI does not necessarily respect `.gitignore`.

Your existing separate imports are compatible:

- `Everything_ToDo_PRIVATE.json` — the 47 original To Do tasks.
- `Everything_Personal_Data_PRIVATE.json` — personal budget, events, recipes, shopping extras, Nutrition, historical Food Log and sheet archive.

When you import them, records are stored in that device's browser storage. Clearing browser site data or switching browsers can erase them. JSON backups are **not encrypted**; keep them private. GitHub Pages may expose the app code publicly, even if the repository is private.

## Publish via GitHub Pages

1. Create a GitHub repository named `everything`.
2. Extract `Everything_v5_GitHub_Ready.zip`. Upload the files **inside the extracted folder** to the repository root: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, icons, `.nojekyll`, `.gitignore`, and `README.md`.
3. Open GitHub **Settings → Pages**. Choose **Deploy from a branch → main → /(root)** and save.
4. Open the published URL shown by GitHub, usually `https://YOUR-USERNAME.github.io/everything/`.
5. On your Samsung, open that URL in Chrome or Samsung Internet and choose **Install app** or **Add to Home screen** from the browser menu.

You may update the website code on GitHub without uploading your personal records. **Always export a full backup before replacing an old app version.** The main app keeps the existing `everything-private-browser-v1` local-storage key, so locally stored v3 data should still load on the same website origin.

## Phone-first transfer — no live synchronization

Use your Samsung as the main copy. **A restore is a complete replacement, not a merge.** Use this order whenever you want to edit from the laptop:

1. On **Samsung**, choose **Data & settings → Full backup** and transfer that JSON to your laptop privately.
2. On the **laptop**, choose **Restore backup** to load the latest phone copy.
3. Make the desired edits on the laptop. Try not to change the phone copy during this period.
4. On the **laptop**, export a new **Full backup** and transfer it to your Samsung.
5. On **Samsung**, **download an additional safety backup first**, then **Restore backup** from the laptop's file.
6. Continue using the phone as the main copy.

If you independently edit both devices after step 2, restoring the laptop's full backup will **overwrite** any new phone-only changes. The app does **not** reconcile or merge simultaneous edits. Separate To Do export/import replaces **only** To Do; separate Personal Data export/import replaces all other sections.

## Features

### Home and Quick Add

- Home dashboard displays today's recorded calories, protein, carbs, fat and fibre, with progress bars toward **editable personal targets**.
- Water tracker has `+250 ml`, `+500 ml` and `−250 ml` controls. The starter water reference is 2,000 ml and can be changed in **Daily targets**; it is not medical advice. A zero goal means “No target set.”
- Home also displays tasks due or overdue, recipes, events and a budget allowance that reserves money for upcoming bills.
- A floating **Quick Add** button provides shortcuts to log food, add a task, create a shopping item or record water.

### Food Log

- **Ingredient** entries must select an existing ingredient in **Nutrition**. Macros are calculated from its per-100 g/ml values; missing ingredients must be added to Nutrition first.
- **Recipe** entries are logged as a number of **servings**. Each recipe specifies how many servings it makes, and the ingredient-based macro totals are divided accordingly.
- **Blank manual values** remain available for food estimates or adjustments; these entries do not add an ingredient to Nutrition.
- **Today's logged foods** appear at the top of Food Log, with all entries visible and edit/log-again/favourite controls. Favourite foods and recent entries follow. Older food records are grouped below and have a month filter. Monthly statistics report recorded calories, macro averages, entries, logged days, and a daily calorie breakdown. **Averages are per logged day**, not a complete-diary estimate.
- In the recipe logging dialog, **search by recipe name, ingredient, category or meal type** to narrow the saved-recipe dropdown without scrolling through hundreds of recipes.
- **Favourite foods** can be saved with the ☆ button beside Food Log entries and logged again with one tap. **Recently logged** foods are also shown for quick reuse. Ingredient and recipe favourites are recalculated from their current Nutrition and recipe data when logged again; manual/imported foods reuse their recorded macro amounts.
- Historical food entries retain their saved macro snapshots. Old whole-recipe entries remain readable and are shown as whole-recipe quantities; new entries use servings.

### Recipes and Shopping

- New recipes use ingredient rows with **amount**, **grams/millilitres**, and **Nutrition ingredient name**. Nutritional values must exist in Nutrition first.
- Each recipe has an editable number of servings, displays **whole-recipe** and **per-serving** macros, and can be filtered by **calories per serving**.
- Pick three random recipes, then add them to Shopping.
- Shopping combines selected recipe ingredients and extra items **by supermarket category**. For recipe ingredients, edit their Nutrition record to assign a category. Imported ingredients without categories appear in **Uncategorized ingredients** rather than being guessed. Checked-off items move to the collapsible **Already bought** group.
- Other shopping items remain editable and selectable by the Excel categories, with a blank input under each category for adding a new item.

### To Do, Budget, Events, Archive

- To Do offers colour labels, repeat-frequency dropdowns, **custom repeat intervals in whole days**, and filters for **due & overdue**, **due + 7 days**, or **all tasks**.
- Budget has current balance, monthly reference income/cost entries, and **dated bills** with a paid/unpaid state. The daily allowance equals **(current balance − unpaid bills due through the next 25th) ÷ days including today**. Bills overdue and still unpaid are also reserved. Mark bills as paid and update the recorded bank balance when payment clears to avoid double-counting.
- Events and the editable source-sheet archive remain available from the main navigation.
- The Food Log remains a permanently visible tab in the phone's bottom navigation.

### Garmin Connect

A Garmin integration is **not implemented**. Do not put Garmin API keys or authentication tokens into this public static app or the GitHub repository.

## Existing Excel imports and important limitations

- The app was originally migrated from `Everything_App(3).xlsm` and `Log_APP(1).xlsm`. It does not execute Excel VBA or formula logic.
- Existing recipes from Excel frequently have ambiguous amounts without reliable g/ml units. These remain marked **unspecified** until you edit them. Their macros will be **incomplete** until all ingredient quantities are measured and corresponding Nutrition references exist. Do not treat partial totals as complete.
- Imported Nutrition values are not independently validated. Confirm that “per 100 g/ml” is appropriate for each ingredient, particularly when the workbook used pieces or servings.
- The Sheet archive is independent of the purpose-built app sections; editing a historical cell does not recalculate Meals or Budget.
- Service workers/offline app shell need an HTTPS or localhost origin. To test the unzipped folder locally, run `python -m http.server 8000` from the folder, then open `http://localhost:8000/`.
- The separate standalone `Everything_v5_Interactive_Preview.html` contains **fictional sample data** for testing. The standalone `Everything_v5_Empty_Preview.html` starts without any records. Neither preview is inside the GitHub ZIP. Preview and published-app storage are separate.

## Backup formats

`Everything_ToDo_PRIVATE.json` has `format: everything-todo`; the general data file has `format: everything-data`, and a full backup has `format: everything-all`. v4 and v5 support optional `targets` and `foodFavorites` fields to non-To-Do data and `budget.bills` to the budget object. Older JSON files remain importable and are initialized with defaults for missing optional fields. The v5 service-worker cache is named `everything-app-v5`.

### v5 compatibility

Existing v4 full backups, To Do JSON files and non-To-Do JSON files remain compatible. Custom To Do frequencies are stored as strings like `every 10 days`; older recurrence labels are preserved. Nutrition remains the single source of reference values for new ingredient and recipe entries; saved Food Log entries are snapshots for historical accuracy. Monthly statistics are derived from existing Food Log entries and do not add private data to GitHub.

## Samsung backup import (v5.1)

1. On the laptop, open **Data & settings → Full backup**. This saves `Everything_FULL_BACKUP_PRIVATE.json` (it may include a number in parentheses). Do **not** export the HTML preview or ZIP as your backup.
2. Transfer the `.json` backup to the Samsung using Quick Share, a USB cable or your preferred secure transfer method. Save it in **My Files / Downloads**.
3. On the Samsung, open the **same Everything v5.1 website/HTML preview that you are using for data**, then go to **Data & settings**. Tap the visible **Choose File** control under **Restore a file on your phone or laptop**, and select the transferred `.json` file. It accepts the phone's file-picker MIME types.
4. Review the detected type and counts. Export a safety backup from the Samsung first, since restoring will **replace** data in the corresponding sections (it does not merge). Confirm the restore.
5. A persistent confirmation or error will appear in Data & settings, and counts will update after a successful import.

The import supports `everything-all` (full backup), `everything-todo` (tasks) and `everything-data` (all other data). It also provides a fallback file-reader for Android browsers that do not support `file.text()`. If browser storage cannot save the file, the app reports the failure rather than falsely reporting success.

**Note for downloaded HTML previews:** Browsers may isolate local data by file path, and clearing app data can erase it. For reliable everyday use, host the code on GitHub Pages, then use the same URL on each device and keep periodic private JSON backups. Hosting the website does not publish your personal records.
