from web3 import Web3
from eth_abi import decode
import json

def verify_deployment():
    # Connect to chain
    w3 = Web3(Web3.HTTPProvider('http://43.135.26.222:8000'))
    
    # Load contract ABI
    with open('MyToken.json', 'r') as f:
        contract_data = json.load(f)
    
    # Contract address from deployment
    contract_address = '0x6E15782705b6f4B746f885E4B281e2834CE21FFd'
    contract = w3.eth.contract(address=contract_address, abi=contract_data['abi'])
    
    # Verify basic parameters
    name = contract.functions.name().call()
    symbol = contract.functions.symbol().call()
    total_supply = contract.functions.totalSupply().call()
    decimals = contract.functions.decimals().call()
    
    print(f"Contract Address: {contract_address}")
    print(f"Name: {name}")
    print(f"Symbol: {symbol}")
    print(f"Decimals: {decimals}")
    print(f"Total Supply: {total_supply / (10 ** decimals):,.0f} {symbol}")
    
    # Verify owner
    owner = contract.functions.owner().call()
    print(f"Owner Address: {owner}")
    
    expected_values = {
        'name': 'TestWF',
        'symbol': 'WF',
        'total_supply': 1_000_000_000 * (10 ** 18)
    }
    
    # Check if values match expected
    if (name != expected_values['name'] or 
        symbol != expected_values['symbol'] or 
        total_supply != expected_values['total_supply']):
        print("\nWarning: Some values don't match expected values:")
        print(f"Name: {'✓' if name == expected_values['name'] else '✗'} (expected: {expected_values['name']})")
        print(f"Symbol: {'✓' if symbol == expected_values['symbol'] else '✗'} (expected: {expected_values['symbol']})")
        print(f"Total Supply: {'✓' if total_supply == expected_values['total_supply'] else '✗'} (expected: {expected_values['total_supply']})")
    else:
        print("\nAll values match expected configuration ✓")

if __name__ == '__main__':
    verify_deployment()
