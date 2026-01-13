# Testing & Running Kaushal-Setu

This guide explains how to run the full application stack locally and how to execute test suites.

## Prerequisites
- Node.js & npm
- Python 3.10+
- Ollama (installed and running)

## 1. Start the Backend Server
The backend powers the API, RRI Engine, and AI Service.

Open a terminal:
```bash
# Activate Virtual Environment
source venv/bin/activate

# Start API Server (Runs on http://localhost:8000)
uvicorn backend.main:app --reload
```

## 2. Start the Frontend Application
The frontend provides the dashboard UI.

Open a **new** terminal:
```bash
# Install dependencies (if not done)
npm install

# Start Dev Server (Runs on http://localhost:5173)
npm run dev
```

## 3. Verify Ollama (AI)
Ensure your local AI provider is running.

Open a **new** terminal:
```bash
# Check if Ollama is responsive
curl http://127.0.0.1:11434/api/tags
```
*You should see a list of models including `llama3.2:3b`.*

## 4. Running Tests

### Backend Unit Tests
We have a test suite covering RRI logic, Normalization, and Achievement validation.

```bash
# Run from the project root (with venv activated)
python backend/tests.py
```
*Expected Output: `OK` (All tests passed)*

### AI Service Verification
To test *only* the AI generation capability:
*(Note: Create this script if needed, or use the API manually)*

### Manual End-to-End Test
1. Open your browser to the Frontend URL (e.g., `http://localhost:5173`).
2. Login as an **Officer** (or click the Officer Dashboard link if auth is mocked).
3. Select an Agniveer.
4. Submit a **Technical Assessment** (Score 0-100).
5. Submit a **Behavioral Assessment** (Score 1-10).
6. Submit an **Achievement** (e.g., "SPORTS", 4 points).
7. Upon submission, the system will auto-calculate the **RRI**.
8. Use `curl` or Postman to generate an AI Report:
   ```bash
   curl -X POST http://localhost:8000/api/ai/report/<agniveer_id>
   ```
