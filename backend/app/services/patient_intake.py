"""
Patient Intake and Management for TAT Learning System
"""

import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path
import json
import csv

@dataclass
class PatientProfile:
    """Patient profile with demographics and session history"""
    patient_id: str
    patient_type: str
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    consent_given: bool = False
    first_session_date: str = field(default_factory=lambda: datetime.now().isoformat())
    total_sessions: int = 0
    last_session_date: Optional[str] = None
    notes: str = ""
    demographic_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'patient_id': self.patient_id,
            'patient_type': self.patient_type,
            'name': self.name,
            'age': self.age,
            'gender': self.gender,
            'consent_given': self.consent_given,
            'first_session_date': self.first_session_date,
            'total_sessions': self.total_sessions,
            'last_session_date': self.last_session_date,
            'notes': self.notes,
            'demographic_data': self.demographic_data
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PatientProfile':
        """Create from dictionary"""
        return cls(
            patient_id=data['patient_id'],
            patient_type=data['patient_type'],
            name=data.get('name', 'Anonymous'),
            age=data.get('age'),
            gender=data.get('gender'),
            consent_given=data.get('consent_given', False),
            first_session_date=data.get('first_session_date', datetime.now().isoformat()),
            total_sessions=data.get('total_sessions', 0),
            last_session_date=data.get('last_session_date'),
            notes=data.get('notes', ''),
            demographic_data=data.get('demographic_data', {})
        )

class PatientDatabase:
    """Simple patient database using CSV storage with thread-safe access."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._lock = threading.RLock()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.db_path.exists():
            self._create_database()

    def _create_database(self):
        """Create new database file"""
        with open(self.db_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'patient_id', 'patient_type', 'name', 'age', 'gender', 'consent_given',
                'first_session_date', 'total_sessions', 'last_session_date',
                'notes', 'demographic_data'
            ])

    def add_patient(self, profile: PatientProfile) -> bool:
        """Add or update a patient (thread-safe)."""
        with self._lock:
            existing_patients = self._read_all_patients()
            patient_dict = profile.to_dict()

            updated = False
            for i, p in enumerate(existing_patients):
                if p['patient_id'] == profile.patient_id:
                    existing_patients[i] = patient_dict
                    updated = True
                    break

            if not updated:
                existing_patients.append(patient_dict)

            self._write_all_patients(existing_patients)
            return True

    def get_patient(self, patient_id: str) -> Optional[PatientProfile]:
        """Retrieve a patient by ID"""
        patients = self.get_all_patients()
        for p in patients:
            if p['patient_id'] == patient_id:
                return PatientProfile.from_dict(p)
        return None

    def get_all_patients(self) -> List[Dict[str, Any]]:
        """Get all patients as dicts (thread-safe public API)."""
        with self._lock:
            return self._read_all_patients()

    def _read_all_patients(self) -> List[Dict[str, Any]]:
        """Internal: read all patients without acquiring lock (caller must hold lock)."""
        patients = []

        try:
            with open(self.db_path, 'r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:

                    row['age'] = int(row['age']) if row['age'] and row['age'] != 'None' else None
                    row['consent_given'] = row['consent_given'].lower() == 'true'
                    row['total_sessions'] = int(row['total_sessions']) if row['total_sessions'] else 0
                    row['demographic_data'] = json.loads(row['demographic_data']) if row['demographic_data'] else {}
                    patients.append(row)
        except FileNotFoundError:
            pass

        return patients

    def _write_all_patients(self, patients: List[Dict[str, Any]]):
        """Write all patients to database"""
        with open(self.db_path, 'w', newline='', encoding='utf-8') as f:
            if patients:

                keys = list(patients[0].keys())
                if 'name' not in keys:
                    keys.insert(2, 'name')
                writer = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
                writer.writeheader()
                for p in patients:

                    if 'demographic_data' in p and not isinstance(p['demographic_data'], str):
                        p['demographic_data'] = json.dumps(p['demographic_data'])
                    writer.writerow(p)

    def increment_session(self, patient_id: str) -> bool:
        """Increment session count for patient"""
        profile = self.get_patient(patient_id)
        if profile:
            profile.total_sessions += 1
            profile.last_session_date = datetime.now().isoformat()
            return self.add_patient(profile)
        return False

    def search_patients(self, **criteria) -> List[PatientProfile]:
        """Search patients by criteria"""
        all_patients = self.get_all_patients()
        results = []

        for p in all_patients:
            match = True
            for key, value in criteria.items():
                if p.get(key) != value:
                    match = False
                    break
            if match:
                results.append(PatientProfile.from_dict(p))

        return results

class SessionManager:
    """Manages analysis sessions for patients"""

    def __init__(self, session_dir: Path):
        self.session_dir = session_dir
        self.session_dir.mkdir(parents=True, exist_ok=True)

    def save_session(self, patient_id: str, session_data: Dict[str, Any]) -> Path:
        """Save a session analysis"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        session_file = self.session_dir / f"{patient_id}_{timestamp}.json"

        session_data['_metadata'] = {
            'patient_id': patient_id,
            'timestamp': datetime.now().isoformat(),
            'session_file': str(session_file)
        }

        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2)

        return session_file

    def get_patient_sessions(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all sessions for a patient or all sessions if patient_id is None"""
        sessions = []

        pattern = f"{patient_id}_*.json" if patient_id else "*.json"

        for session_file in self.session_dir.glob(pattern):
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    sessions.append(json.load(f))
            except json.JSONDecodeError:
                pass

        sessions.sort(key=lambda x: x.get('_metadata', {}).get('timestamp', ''), reverse=True)
        return sessions

    def get_latest_session(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get most recent session for patient"""
        sessions = self.get_patient_sessions(patient_id)
        return sessions[0] if sessions else None

    def delete_session(self, patient_id: str, timestamp: str) -> bool:
        """Delete a specific session by patient ID and timestamp"""
        pattern = f"{patient_id}_*.json"

        target_file = None
        pdf_to_delete = None

        for session_file in self.session_dir.glob(pattern):
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                    meta_ts = session_data.get('_metadata', {}).get('timestamp', '')
                    if meta_ts == timestamp:
                        target_file = session_file
                        pdf_to_delete = session_data.get('pdf_filename')
                        break
            except (json.JSONDecodeError, OSError) as e:
                print(f"Error accessing session file {session_file}: {e}")

        if target_file and target_file.exists():
            try:
                target_file.unlink()

                if pdf_to_delete:

                    project_root = Path(__file__).resolve().parent.parent
                    output_dir = project_root / "outputs"
                    pdf_path = output_dir / pdf_to_delete
                    if pdf_path.exists():
                        pdf_path.unlink()

                return True
            except OSError as e:
                print(f"Error deleting session files target={target_file}: {e}")

        return False

def collect_patient_info(patient_database):
    """
    Collect comprehensive patient demographics and context.
    Now accepts a patient_database instance (passed from tat.py).
    """
    import uuid

    print("\n" + "="*80)
    print("PATIENT INTAKE")
    print("="*80 + "\n")

    print("Patient Type:")
    print("  1. New patient")
    print("  2. Returning patient")
    print("  3. Anonymous (research/demo)")

    patient_type = input("\nSelect patient type (1/2/3): ").strip()

    if patient_type == "2":
        print("\n" + "-"*80)
        print("RETURNING PATIENT LOOKUP")
        print("-"*80)

        patient_id = input("Enter Patient ID: ").strip()
        patient = patient_database.get_patient(patient_id)

        if patient:
            print(f"\n✅ Found patient: {patient.patient_id}")
            if not hasattr(patient, "name"):
                patient.name = "Not specified"
            print(f"   Name: {getattr(patient, 'name', 'Not specified')}")
            print(f"   Age: {patient.age}, Gender: {patient.gender}")
            print(f"   Previous sessions: {len(getattr(patient, 'session_history', []))}")
            return patient
        else:
            print(f"\n⚠️ Patient ID '{patient_id}' not found.")
            print("Switching to New Patient mode.\n")
            patient_type = "1"

    print("\n" + "-"*80)
    print("DEMOGRAPHIC INFORMATION")
    print("-"*80)

    if patient_type != "3":
        while True:
            name = input("\nFull Name: ").strip()
            if name:
                break
            else:
                print("⚠️ Name cannot be empty.")
    else:
        name = "Anonymous"

    while True:
        try:
            age_input = input("\nAge (years): ").strip()
            age = int(age_input)
            if 5 <= age <= 120:
                break
            else:
                print("⚠️ Age must be between 5 and 120")
        except ValueError:
            print("⚠️ Please enter a valid number")

    print("\nGender (free text, e.g., Male, Female, Non-binary, etc.)")
    gender = input("Gender: ").strip() or "Not specified"

    print("\n" + "-"*80)
    print("SOCIO-CULTURAL BACKGROUND")
    print("-"*80)
    print("\nPlease provide information about:")
    print("- Family structure (nuclear/joint family)")
    print("- Urban/rural background")
    print("- Education level and aspirations")
    print("- Socio-economic status")
    print("- Cultural/religious background (if relevant)")
    background = input("\nSocio-cultural background: ").strip() or "Not specified"

    print("\n" + "-"*80)
    print("CURRENT ENVIRONMENT")
    print("-"*80)
    print("\nPlease provide information about:")
    print("- Living situation (with parents/alone/hostel/etc.)")
    print("- Support system (family/friends/community)")
    print("- Major life stressors or recent changes")
    environment = input("\nEnvironment & support system: ").strip() or "Not specified"

    if patient_type == "3":
        patient_id = f"ANON_{str(uuid.uuid4())[:8].upper()}"
    else:
        patient_id = f"PAT_{str(uuid.uuid4())[:8].upper()}"

    demographic_data = {
        "background": background,
        "environment": environment
    }

    patient = PatientProfile(
        patient_id=patient_id,
        patient_type="anonymous" if patient_type == "3" else "new",
        age=age,
        gender=gender,
        demographic_data=demographic_data
    )
    patient.name = name

    if patient_type != "3":
        patient_database.add_patient(patient)
        print(f"\n✅ Patient profile created and saved: {patient_id}")
    else:
        print(f"\n✅ Anonymous profile created: {patient_id}")

    print("\n" + "-"*80)
    print("PATIENT SUMMARY")
    print("-"*80)
    print(f"ID: {patient.patient_id}")
    print(f"Name: {patient.name}")
    print(f"Age: {patient.age}")
    print(f"Gender: {patient.gender}")
    print(f"Background: {patient.demographic_data.get('background', 'Not specified')[:80]}...")
    print(f"Environment: {patient.demographic_data.get('environment', 'Not specified')[:80]}...")
    print("-"*80)

    return patient
