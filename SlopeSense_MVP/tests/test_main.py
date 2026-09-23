import time
import unittest
from fastapi.testclient import TestClient

from src.main import app


class TestNortheastRiskEndpoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_northeast_risk_stays_fast_for_all_locations(self):
        start = time.time()
        resp = self.client.get("/api/northeast-risk")
        elapsed = time.time() - start

        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertEqual(payload["status"], "Success")
        self.assertGreaterEqual(len(payload["locations"]), 50)
        self.assertGreaterEqual(len(payload["locations"][0]["risk_analysis"]["explainability"]["factors"]), 4)
        self.assertIn("advisory", payload["locations"][0]["risk_analysis"])
        self.assertLess(elapsed, 2.0, "Regional risk generation should not be blocked by slow live weather calls")


if __name__ == "__main__":
    unittest.main()
