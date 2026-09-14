# CoreTAT Load Testing

This directory contains a Locust script to load test the CoreTAT backend. 
It simulates concurrent users performing both lightweight requests (health checks) and heavy machine learning assessments.

## Prerequisites

You need Python installed on your local machine to run Locust.

1. Open your terminal or command prompt.
2. Install Locust using pip:
   ```bash
   pip install locust
   ```

## Running the Load Test

To run the load test against your deployed server (e.g., `https://yourdomain.com`), run the following command from the root of the project:

### Windows / PowerShell
```powershell
$env:LOAD_TEST_EMAIL="your_test_user@example.com"
$env:LOAD_TEST_PASSWORD="your_password"
locust -f backend/scripts/load_test/locustfile.py --host=https://yourdomain.com --users 30 --spawn-rate 5

$env:LOAD_TEST_EMAIL="superadmin@coretat.com"
$env:LOAD_TEST_PASSWORD="admin123"
locust -f "scripts/load_test/locustfile.py" --host=http://localhost:8000
 


$env:LOAD_TEST_EMAIL="psychologist@test.com"
$env:LOAD_TEST_PASSWORD="password123"
locust -f "scripts/load_test/locustfile.py" --host=http://localhost:8000



### Parameters explained:
- `--host`: The base URL of your deployed backend API (or local server, e.g., `http://127.0.0.1:8000`).
- `--users`: The peak number of concurrent users to simulate (e.g., 30).
- `--spawn-rate`: The number of users to add per second until the peak is reached (e.g., 5).

## The Web UI

If you run the command without `--users` and `--spawn-rate`, Locust will start a local web server at `http://localhost:8089`. You can open this in your browser to visually configure the test parameters, start the test, and monitor response times and failure rates in real-time.

## Important Note
The ML analysis endpoint requires authentication. If you do not provide valid credentials via `LOAD_TEST_EMAIL` and `LOAD_TEST_PASSWORD`, the test will only execute the lightweight health check endpoints. Please make sure the test user has enough wallet balance if billing is enabled, otherwise the ML endpoint will return a 402 (Insufficient Balance) response (which the script handles gracefully).