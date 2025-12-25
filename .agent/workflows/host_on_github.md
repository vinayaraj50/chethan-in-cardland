---
description: Guide to hosting the current project on GitHub Pages
---

# Hosting 'Chethan in Cardland' on GitHub Pages

I have already initialized the local git repository and prepared your `package.json` for deployment. Follow these steps to get your app online.

## Step 1: Create a New Repository on GitHub

1.  Go to [https://github.com/new](https://github.com/new)
2.  **Repository name**: `chethan-in-cardland` (Must match specifically to work with the prepared configuration)
3.  **Description**: (Optional) e.g., "Chethan in Cardland - Beta Build"
4.  **Public/Private**: Choose Public (required for free GitHub Pages) or Private (if you have Pro).
5.  **Do NOT** initialize with README, .gitignore, or License. (We already have these locally).
6.  Click **Create repository**.

## Step 2: Push Your Code

In your terminal (VS Code), run the following commands exactly:

```powershell
git remote add origin https://github.com/vinayaraj50/chethan-in-cardland.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to GitHub Pages

I have already configured the `deploy` script in `package.json`.

1.  Run the deployment command:
    ```powershell
    npm run deploy
    ```
2.  This command builds your project and pushes the `dist` folder to a `gh-pages` branch on your repo.

## Step 4: Verify Deployment

1.  Go to your repository settings on GitHub: `Settings` > `Pages`.
2.  Ensure **Source** is set to `Deploy from a branch`.
3.  Ensure **Branch** is `gh-pages` / `/ (root)`.
4.  Wait a few minutes (GitHub Actions usually runs automatically).
5.  Visit your site at: [https://vinayaraj50.github.io/chethan-in-cardland/](https://vinayaraj50.github.io/chethan-in-cardland/)

## Notes

- **Updates**: Whenever you want to update the live site, just run `npm run deploy` again.
- **Troubleshooting**: If you see a blank page, make sure the `repo name` matches `chethan-in-cardland` exactly, as this is hardcoded in `vite.config.js`.
