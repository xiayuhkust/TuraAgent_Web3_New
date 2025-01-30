from web3 import Web3

def check_balance():
    w3 = Web3(Web3.HTTPProvider('http://43.135.26.222:8000'))
    if not w3.is_connected():
        print("Failed to connect to Tura chain")
        return
        
    chain_id = w3.eth.chain_id
    print(f"Connected to chain ID: {chain_id}")
    
    address = '0xF3e140953B9cFcFAc98dcd5Fe0A65f6D1F06Fe2b'
    balance = w3.eth.get_balance(address)
    print(f'Balance: {w3.from_wei(balance, "ether")} TURA')
    
    if balance == 0:
        print("Warning: Account has no TURA tokens for deployment")

if __name__ == '__main__':
    check_balance()
