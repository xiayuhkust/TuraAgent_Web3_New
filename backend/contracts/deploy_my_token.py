import os
import json
from web3 import Web3
from eth_account import Account
from pathlib import Path

def deploy_my_token(private_key: str):
    # Connect to Tura chain
    w3 = Web3(Web3.HTTPProvider("http://43.135.26.222:8000"))  # Using backend RPC for deployment
    w3.eth.default_chain_id = 1337  # Set chain ID for Tura chain
    
    # Load compiled contract
    contract_dir = Path(__file__).parent
    with open(contract_dir / "MyToken.json", "r") as f:
        contract_data = json.load(f)
    
    # Set up account
    account = Account.from_key(private_key)
    print(f"Deploying from: {account.address}")
    
    # Prepare contract
    token_contract = w3.eth.contract(
        abi=contract_data["abi"],
        bytecode=contract_data["bytecode"]
    )
    
    # Set initial supply to 1 billion tokens with 18 decimals
    initial_supply = 1000000000 * (10 ** 18)
    
    # Build constructor transaction
    tx = token_contract.constructor(
        "TestWF",
        "WF",
        initial_supply
    ).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 3000000,
        "gasPrice": w3.eth.gas_price
    })
    
    # Sign and send transaction
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"Deployment transaction sent: {tx_hash.hex()}")
    
    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Contract deployed at: {receipt.contractAddress}")
    return receipt.contractAddress

if __name__ == "__main__":
    if "TURA_PRIVATE_KEY" not in os.environ:
        print("Error: TURA_PRIVATE_KEY environment variable not set")
        exit(1)
    
    deploy_my_token(os.environ["TURA_PRIVATE_KEY"])
