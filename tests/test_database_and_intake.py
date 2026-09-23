import io
import unittest
from fastapi.testclient import TestClient

from src.db.session import init_db
from src.db.seed_data import seed_database
from src.main import app


class TestDatabaseAndIntake(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database()
        cls.client = TestClient(app)

    def test_seeded_data_exists(self):
        resp = self.client.get("/api/v1/reports")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["count"], 3)
        self.assertIn("reports", data)
        self.assertIsNotNone(data["reports"][0]["photo_url"])

    def test_user_registration_and_auth_flow(self):
        email = f"test.citizen_{id(self)}@example.com"
        reg_payload = {
            "email": email,
            "name": "Pranab Gogoi",
            "password": "securepassword123",
            "role": "citizen",
            "preferred_language": "as",
        }
        reg_resp = self.client.post("/api/v1/auth/register", json=reg_payload)
        self.assertEqual(reg_resp.status_code, 201)
        reg_data = reg_resp.json()
        self.assertEqual(reg_data["status"], "pending_verification")
        self.assertIn("demo_otp", reg_data)
        otp = reg_data["demo_otp"]

        # Duplicate email rejected
        dup_resp = self.client.post("/api/v1/auth/register", json=reg_payload)
        self.assertEqual(dup_resp.status_code, 409)

        # Unverified login rejected
        unverified_login = self.client.post("/api/v1/auth/login", json={"email": email, "password": "securepassword123"})
        self.assertEqual(unverified_login.status_code, 403)

        # Verify email with 6-digit OTP
        verify_resp = self.client.post("/api/v1/auth/verify-email", json={"email": email, "otp": otp})
        self.assertEqual(verify_resp.status_code, 200)
        verify_data = verify_resp.json()
        self.assertIn("access_token", verify_data)
        token = verify_data["access_token"]

        # Login
        login_resp = self.client.post("/api/v1/auth/login", json={"email": email, "password": "securepassword123"})
        self.assertEqual(login_resp.status_code, 200)
        self.assertIn("access_token", login_resp.json())

        # Check me
        me_resp = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()["email"], email)

        # Forgot password flow test
        forgot_resp = self.client.post("/api/v1/auth/forgot-password", json={"email": email})
        self.assertEqual(forgot_resp.status_code, 200)
        reset_otp = forgot_resp.json()["demo_otp"]

        # Reset password with OTP
        reset_resp = self.client.post(
            "/api/v1/auth/reset-password",
            json={"email": email, "otp": reset_otp, "new_password": "brandnewpassword456"},
        )
        self.assertEqual(reset_resp.status_code, 200)
        self.assertIn("access_token", reset_resp.json())

        # Old password rejected
        old_login = self.client.post("/api/v1/auth/login", json={"email": email, "password": "securepassword123"})
        self.assertEqual(old_login.status_code, 401)

        # New password succeeds
        new_login = self.client.post("/api/v1/auth/login", json={"email": email, "password": "brandnewpassword456"})
        self.assertEqual(new_login.status_code, 200)


    def test_submit_incident_report_with_photo(self):
        dummy_file = io.BytesIO(b"<svg><circle r='10'/></svg>")
        files = {"photo": ("test_crack.svg", dummy_file, "image/svg+xml")}
        data = {
            "report_type": "ground_cracks",
            "description": "Observed rapid crack dilation of approx 5cm near highway bridge culvert.",
            "latitude": "26.1550",
            "longitude": "91.7500",
            "location_name": "Khanapara Hill Cut Sector",
            "severity": "critical",
        }
        resp = self.client.post("/api/v1/reports", data=data, files=files)
        self.assertEqual(resp.status_code, 201)
        report_data = resp.json()
        self.assertIn("id", report_data)
        self.assertIn("photo_url", report_data)
        self.assertTrue(report_data["photo_url"].startswith("/uploads/reports/"))

        # Authenticate as NDRF Commander to test triage desk authorization
        login_resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": "commander@ndrf.gov.in", "password": "ndrf2026"},
        )
        self.assertEqual(login_resp.status_code, 200)
        officer_token = login_resp.json()["access_token"]

        # Update status with official NDRF admin notes
        update_resp = self.client.patch(
            f"/api/v1/reports/{report_data['id']}/status",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={
                "status": "verified",
                "admin_notes": "NDRF Unit 12 verified tension crack. Area barricaded.",
            },
        )
        self.assertEqual(update_resp.status_code, 200)
        updated_data = update_resp.json()
        self.assertEqual(updated_data["status"], "verified")
        self.assertEqual(updated_data["admin_notes"], "NDRF Unit 12 verified tension crack. Area barricaded.")

    def test_cctv_stations_endpoint(self):
        resp = self.client.get("/api/cctv-stations")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["count"], 3)
        self.assertIn("stream_image", data["stations"][0])

    def test_active_alerts_endpoint(self):
        resp = self.client.get("/api/alerts/active")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["count"], 2)


if __name__ == "__main__":
    unittest.main()
