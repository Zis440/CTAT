# Setting Up Automated Background Tasks (Cron Jobs)

This guide details how to set up an automated background task to process the pending password reset requests. We will run the script `backend/scripts/process_password_resets.py` on a recurring schedule.

---

## 1. Local Setup on Windows (Task Scheduler)

When running the project locally on your Windows machine or on your friend's system, you can use the built-in **Task Scheduler** to run the script automatically in the background.

### Step-by-Step Guide
1. **Open Task Scheduler**: Press the `Windows Key`, type `Task Scheduler`, and hit Enter.
2. **Create a Basic Task**: In the right-hand panel, click on **Create Basic Task**.
3. **Name it**: Give the task a name like "Psyichub Password Reset Processor", and click Next.
4. **Trigger Frequency**: 
   - Since "Every 5 minutes" isn't a default option here, select **Daily** and click Next.
   - Leave the default start date/time and click Next.
5. **Action**: Choose **Start a program** and click Next.
6. **Program/Script Configuration**:
   - **Program/script**: Browse and select the `python.exe` inside your backend virtual environment. 
     *Example path*: `D:\Codes\Psyichub\backend\venv\Scripts\python.exe`
   - **Add arguments**: `scripts\process_password_resets.py`
   - **Start in**: Provide the absolute path to your backend folder.
     *Example path*: `D:\Codes\Psyichub\backend`
7. **Finish**: Click **Finish**.
8. **Make it Repeat**: 
   - Find your newly created task in the **Task Scheduler Library** list.
   - Right-click it and select **Properties**.
   - Go to the **Triggers** tab, select the daily trigger you just made, and click **Edit**.
   - Check the box that says **Repeat task every:** and type in `5 minutes`. Set the duration to **Indefinitely**.
   - Click OK and OK again to save it.

The script will now run silently every 5 minutes in the background, check for new requests, and print the links.

---

## 2. Server Setup on Linux (Vercel + EC2/VPS)

If you decide to deploy your backend to a proper Linux server (like an AWS EC2 instance, DigitalOcean Droplet, etc.), you will use standard Linux **Cron** to automate the task.

*(Note: Vercel only hosts the frontend. The backend will need to be hosted on a separate server capable of running Python.)*

### Step-by-Step Guide
1. **SSH into your server** and navigate to your deployed backend folder.
2. **Open the Crontab editor** by typing:
   ```bash
   crontab -e
   ```
3. **Add the Cron Expression**: Scroll to the bottom of the file and add the following line:
   ```bash
   */5 * * * * cd "/path/to/your/backend" && venv/bin/python scripts/process_password_resets.py >> scripts.log 2>&1
   ```
   *Make sure to replace `/path/to/your/backend` with the actual path to your deployed backend code.*

### What does this line do?
- `*/5 * * * *`: This is the cron expression meaning "run every 5 minutes".
- `cd "/path/to/your/backend"`: Ensures the script runs from the correct root directory.
- `venv/bin/python`: Uses the Python executable inside your virtual environment.
- `>> scripts.log 2>&1`: Captures all the output (the generated reset links) and saves it to a file named `scripts.log` so you can read them later.

---

## 3. Testing it Manually

At any time, you can safely trigger the process manually without waiting for the scheduled job:

**On Windows:**
```powershell
cd "D:\Codes\Psyichub\backend"
venv\Scripts\python scripts\process_password_resets.py
```

**On Linux/Mac:**
```bash
cd /path/to/backend
venv/bin/python scripts/process_password_resets.py
```
