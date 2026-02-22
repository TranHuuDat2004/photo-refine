# PhotoRefine Server (GitHub Bridge)

This is a small Node.js proxy server that allows the PhotoRefine frontend to save and load images from a GitHub repository securely.

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Configure environment**:
    - Copy `.env.example` to `.env`.
    - Create a **Personal Access Token (PAT)** on GitHub (with `repo` scope).
    - Fill in `GITHUB_TOKEN` and `GITHUB_REPO` in the `.env` file.
3.  **Run the server**:
    ```bash
    npm start
    ```

## Deploying to Render

1.  Push this folder (or the whole repo) to GitHub.
2.  Create a new **Web Service** on Render.
3.  Set the **Root Directory** to `server`.
4.  Set the **Start Command** to `npm start`.
5.  Add your `.env` variables (GITHUB_TOKEN, GITHUB_REPO) in the **Environment** tab on Render.
