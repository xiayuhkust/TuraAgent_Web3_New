import json
import os
from pathlib import Path
import solcx

def compile_my_token():
    solcx.set_solc_version('0.8.20')
    contracts_dir = Path(__file__).parent
    
    # Install OpenZeppelin if needed
    if not os.path.exists(contracts_dir / "node_modules/@openzeppelin"):
        os.system(f"cd {str(contracts_dir)} && npm init -y && npm install @openzeppelin/contracts@4.9.6")
    
    # Read contract source
    contract_path = contracts_dir / "MyToken.sol"
    contract_source = contract_path.read_text()
    
    # Set up imports
    node_modules = contracts_dir / "node_modules"
    oz_path = node_modules / "@openzeppelin/contracts"
    
    def add_source_file(file_path, import_path):
        if file_path.exists():
            sources[import_path] = {"content": file_path.read_text()}
            return True
        return False
    
    # Initialize sources with our contract
    sources = {
        "MyToken.sol": {"content": contract_source}
    }
    
    # Add OpenZeppelin files and their dependencies
    oz_files = [
        ("token/ERC20/ERC20.sol", "token/ERC20/IERC20.sol", "token/ERC20/extensions/IERC20Metadata.sol", "utils/Context.sol"),
        ("access/Ownable.sol", "utils/Context.sol")
    ]
    
    for file_group in oz_files:
        for file_name in file_group:
            file_path = oz_path / file_name
            import_path = f"@openzeppelin/contracts/{file_name}"
            add_source_file(file_path, import_path)
    
    # Compile using standard JSON input
    compiled_sol = solcx.compile_standard({
        "language": "Solidity",
        "sources": sources,
        "settings": {
            "optimizer": {
                "enabled": True,
                "runs": 200
            },
            "outputSelection": {
                "*": {
                    "*": ["abi", "evm.bytecode"]
                }
            }
        }
    },
    allow_paths=[str(node_modules)],
    base_path=str(node_modules))
    
    # Extract contract data
    contract_data = compiled_sol['contracts']['MyToken.sol']['MyToken']
    
    # Save to JSON
    output_path = contracts_dir / "MyToken.json"
    with output_path.open('w') as f:
        json.dump({
            'abi': contract_data['abi'],
            'bytecode': contract_data['evm']['bytecode']['object']
        }, f, indent=2)
    
    print(f"Contract compiled successfully. Output saved to {output_path}")

if __name__ == "__main__":
    compile_my_token()
