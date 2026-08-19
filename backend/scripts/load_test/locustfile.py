import os
import random
from locust import HttpUser, task, between

class PsyicHubUser(HttpUser):

    wait_time = between(1, 3)

    def on_start(self):
        """
        Executed when a simulated user starts.
        We will try to log in if credentials are provided via environment variables.
        """
        self.token = None
        self.email = os.environ.get("LOAD_TEST_EMAIL", "admin@psyichub.com")
        self.password = os.environ.get("LOAD_TEST_PASSWORD", "password123")

        if self.email and self.password:
            response = self.client.post("/api/auth/login", json={
                "email": self.email,
                "password": self.password
            })
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                self.headers = {}
        else:
            self.headers = {}

    @task(3)
    def check_health(self):
        """Hit the basic health check endpoint (lightweight)"""
        self.client.get("/health")

    @task(2)
    def check_readiness(self):
        """Hit the readiness probe (lightweight)"""
        self.client.get("/readiness")

    @task(1)
    def simulate_ml_analysis(self):
        """
        Simulate a heavy ML analysis request.
        This requires an authenticated user token to succeed.
        """
        if not self.token:

            return

        payload = {
            "cardId": "1",
            "story": "This is a sample story for load testing the Narrative Intelligence model. It describes a boy looking at a violin.",
            "patientId": "ANON_12345",
            "effectiveAge": 25
        }

        with self.client.post("/api/analysis/analyze", json=payload, headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 402]:
                response.success()
            elif response.status_code == 401:
                response.failure("Unauthorized - Invalid Token")
            else:
                response.failure(f"Failed with status {response.status_code}")
