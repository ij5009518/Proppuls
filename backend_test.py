import requests
import json
import time
from datetime import datetime, timedelta
import uuid

# Get the backend URL from the frontend .env file
import os

# Use the backend URL directly
BASE_URL = "http://localhost:8001/api"

# Test data
test_tenant_id = str(uuid.uuid4())
test_unit_id = str(uuid.uuid4())
test_organization_id = str(uuid.uuid4())

# Helper function to create a test token
def create_test_token():
    # This is a mock token for testing purposes
    return "test_token"

# Helper function to make authenticated requests
def make_request(method, endpoint, data=None, params=None):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {create_test_token()}"
    }
    url = f"{BASE_URL}{endpoint}"
    
    if method == "GET":
        response = requests.get(url, headers=headers, params=params)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    elif method == "PUT":
        response = requests.put(url, headers=headers, json=data)
    elif method == "DELETE":
        response = requests.delete(url, headers=headers)
    
    return response

# Test functions
def test_create_billing_record():
    print("\n=== Testing Create Billing Record ===")
    
    # Create a billing record
    billing_data = {
        "tenantId": test_tenant_id,
        "unitId": test_unit_id,
        "amount": "1000",
        "billingPeriod": "2025-07",
        "dueDate": (datetime.now() + timedelta(days=15)).isoformat(),
        "status": "pending",
        "type": "rent",
        "organizationId": test_organization_id
    }
    
    response = make_request("POST", "/billing-records", billing_data)
    
    if response.status_code == 200:
        print("✅ Successfully created billing record")
        billing_record = response.json()
        print(f"Billing Record ID: {billing_record.get('id')}")
        return billing_record
    else:
        print(f"❌ Failed to create billing record: {response.status_code}")
        print(response.text)
        return None

def test_get_tenant_billing_records(tenant_id):
    print("\n=== Testing Get Tenant Billing Records ===")
    
    response = make_request("GET", f"/billing-records/{tenant_id}")
    
    if response.status_code == 200:
        billing_records = response.json()
        print(f"✅ Successfully retrieved {len(billing_records)} billing records for tenant")
        return billing_records
    else:
        print(f"❌ Failed to retrieve tenant billing records: {response.status_code}")
        print(response.text)
        return []

def test_update_billing_record(billing_record_id):
    print("\n=== Testing Update Billing Record ===")
    
    update_data = {
        "amount": "1100",
        "status": "pending"
    }
    
    response = make_request("PUT", f"/billing-records/{billing_record_id}", update_data)
    
    if response.status_code == 200:
        print("✅ Successfully updated billing record")
        updated_record = response.json()
        print(f"Updated amount: {updated_record.get('amount')}")
        return updated_record
    else:
        print(f"❌ Failed to update billing record: {response.status_code}")
        print(response.text)
        return None

def test_generate_monthly_billing():
    print("\n=== Testing Generate Monthly Billing ===")
    
    response = make_request("POST", "/billing-records/generate-monthly")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Successfully generated monthly billing")
        print(f"Generated {result.get('generated')} billing records")
        return result
    else:
        print(f"❌ Failed to generate monthly billing: {response.status_code}")
        print(response.text)
        return None

def test_run_automatic_billing():
    print("\n=== Testing Run Automatic Billing ===")
    
    response = make_request("POST", "/billing-records/run-automatic")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Successfully ran automatic billing")
        print(f"Generated {result.get('generated')} new billing records")
        print(f"Updated {result.get('updated')} existing billing records")
        return result
    else:
        print(f"❌ Failed to run automatic billing: {response.status_code}")
        print(response.text)
        return None

def test_calculate_outstanding_balance(tenant_id):
    print("\n=== Testing Calculate Outstanding Balance ===")
    
    response = make_request("GET", f"/outstanding-balance/{tenant_id}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Successfully calculated outstanding balance")
        print(f"Balance: {result.get('balance')}")
        return result
    else:
        print(f"❌ Failed to calculate outstanding balance: {response.status_code}")
        print(response.text)
        return None

def test_create_rent_payment(tenant_id, unit_id, amount="500"):
    print("\n=== Testing Create Rent Payment ===")
    
    payment_data = {
        "tenantId": tenant_id,
        "unitId": unit_id,
        "amount": amount,
        "paidDate": datetime.now().isoformat(),
        "paymentMethod": "cash",
        "notes": "Test payment",
        "organizationId": test_organization_id
    }
    
    response = make_request("POST", "/rent-payments", payment_data)
    
    if response.status_code == 200:
        payment = response.json()
        print("✅ Successfully created rent payment")
        print(f"Payment ID: {payment.get('id')}")
        return payment
    else:
        print(f"❌ Failed to create rent payment: {response.status_code}")
        print(response.text)
        return None

def test_get_rent_payments():
    print("\n=== Testing Get Rent Payments ===")
    
    response = make_request("GET", "/rent-payments")
    
    if response.status_code == 200:
        payments = response.json()
        print(f"✅ Successfully retrieved {len(payments)} rent payments")
        return payments
    else:
        print(f"❌ Failed to retrieve rent payments: {response.status_code}")
        print(response.text)
        return []

def test_update_rent_payment(payment_id):
    print("\n=== Testing Update Rent Payment ===")
    
    update_data = {
        "amount": "550",
        "notes": "Updated test payment"
    }
    
    response = make_request("PUT", f"/rent-payments/{payment_id}", update_data)
    
    if response.status_code == 200:
        updated_payment = response.json()
        print("✅ Successfully updated rent payment")
        print(f"Updated amount: {updated_payment.get('amount')}")
        return updated_payment
    else:
        print(f"❌ Failed to update rent payment: {response.status_code}")
        print(response.text)
        return None

def test_payment_affects_billing_records(tenant_id, initial_balance):
    print("\n=== Testing Payment Affects Billing Records ===")
    
    # Create a payment
    payment = test_create_rent_payment(tenant_id, test_unit_id, "300")
    if not payment:
        return False
    
    # Check if the outstanding balance was reduced
    time.sleep(1)  # Give the system time to process the payment
    balance_result = test_calculate_outstanding_balance(tenant_id)
    
    if balance_result and 'balance' in balance_result:
        new_balance = balance_result['balance']
        if new_balance < initial_balance:
            print(f"✅ Payment successfully reduced outstanding balance from {initial_balance} to {new_balance}")
            return True
        else:
            print(f"❌ Payment did not reduce outstanding balance. Before: {initial_balance}, After: {new_balance}")
            return False
    else:
        print("❌ Could not verify balance change after payment")
        return False

def run_all_tests():
    print("\n======= STARTING BILLING SYSTEM TESTS =======\n")
    
    # Create a billing record
    billing_record = test_create_billing_record()
    if not billing_record:
        print("❌ Cannot continue tests without a billing record")
        return
    
    # Get tenant billing records
    billing_records = test_get_tenant_billing_records(test_tenant_id)
    
    # Update billing record
    if billing_record:
        updated_record = test_update_billing_record(billing_record['id'])
    
    # Calculate outstanding balance
    balance_result = test_calculate_outstanding_balance(test_tenant_id)
    initial_balance = balance_result['balance'] if balance_result and 'balance' in balance_result else 0
    
    # Create a rent payment
    payment = test_create_rent_payment(test_tenant_id, test_unit_id)
    
    # Verify payment affects billing records
    if payment and initial_balance > 0:
        payment_affects_billing = test_payment_affects_billing_records(test_tenant_id, initial_balance)
    
    # Get rent payments
    payments = test_get_rent_payments()
    
    # Update rent payment
    if payment:
        updated_payment = test_update_rent_payment(payment['id'])
    
    # Generate monthly billing
    monthly_billing = test_generate_monthly_billing()
    
    # Run automatic billing
    automatic_billing = test_run_automatic_billing()
    
    print("\n======= BILLING SYSTEM TESTS COMPLETED =======\n")

if __name__ == "__main__":
    run_all_tests()